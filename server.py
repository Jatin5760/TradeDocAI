"""
TradeDoc AI Server — LangGraph Edition
═════════════════════════════════════════
Flask backend that:
  1. Serves the UI static files
  2. Exposes LangGraph agent flows via REST endpoints
  3. AI email extraction, PDF compilation, and validation
  4. MongoDB document storage via pymongo (tradedocai database)

Supported document types:
  - FX NDF (Non-Deliverable Forward)
  - IRS  (Interest Rate Swap — multiple exhibits)
  - CDS  (Credit Default Swap)
  - Equity TRS (Equity Total Return Swap — Model I & II)

PDF Policy:
  - PDFs are TEMPORARY — stored per-session, deleted when a new PDF is created
  - No permanent PDF storage on disk

Usage:
    pip install -r requirements.txt
    python server.py
    → http://localhost:5055
"""

import os
import sys
import json
import uuid
import time
import shutil
import traceback
from datetime import datetime, timezone
from functools import wraps
from urllib.parse import unquote, urlparse
import re
from dotenv import load_dotenv
load_dotenv()  # local development only; production injects env vars at runtime
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from flask import Flask, g, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

try:
    import certifi
except ImportError:
    certifi = None

# ── Path setup ────────────────────────────
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "templates", "FX_Trade_Confirmation"))
sys.path.insert(0, os.path.join(ROOT_DIR, "templates", "IRS_Confirmation"))
sys.path.insert(0, os.path.join(ROOT_DIR, "templates", "CDS_Confirmation"))
sys.path.insert(0, os.path.join(ROOT_DIR, "templates", "Equity_TRS"))

# Import LangGraph flows
from agents.graph import ai_create_graph, pdf_compile_graph, validation_graph
from agents.gemini_helper import call_gemini

# Import raw generators as fallback for direct PDF compilation
from generate_fx_ndf import generate_pdf as generate_fx_pdf
from generate_irs import generate_pdf as generate_irs_pdf
from generate_cds import generate_pdf as generate_cds_pdf
from Generate_Equity_TRS import generate_pdf as generate_equity_trs_pdf

# Adobe PDF Services SDK (for Word conversion)
try:
    from adobe.pdfservices.operation.auth.service_principal_credentials import ServicePrincipalCredentials
    from adobe.pdfservices.operation.pdf_services import PDFServices
    from adobe.pdfservices.operation.pdf_services_media_type import PDFServicesMediaType
    from adobe.pdfservices.operation.pdfjobs.jobs.export_pdf_job import ExportPDFJob
    from adobe.pdfservices.operation.pdfjobs.params.export_pdf.export_pdf_params import ExportPDFParams
    from adobe.pdfservices.operation.pdfjobs.params.export_pdf.export_pdf_target_format import ExportPDFTargetFormat
    from adobe.pdfservices.operation.pdfjobs.params.export_pdf.export_ocr_locale import ExportOCRLocale
    from adobe.pdfservices.operation.pdfjobs.result.export_pdf_result import ExportPDFResult
    ADOBE_AVAILABLE = True
except ImportError:
    ADOBE_AVAILABLE = False

# ── Flask app ─────────────────────────────
app = Flask(__name__, static_folder=os.path.join(ROOT_DIR, "ui-app", "out"))
app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_CONTENT_LENGTH_BYTES", str(2 * 1024 * 1024)))

_cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5055").split(",")
    if origin.strip()
]
CORS(
    app,
    resources={r"/*": {"origins": _cors_origins}},
    expose_headers=["Content-Disposition", "X-TradeDoc-File-Id"],
)

# ── Runtime / Temp PDF directory ──────────
APP_ENV = os.environ.get("APP_ENV") or os.environ.get("FLASK_ENV") or "development"
IS_PRODUCTION = APP_ENV.lower() in {"prod", "production"}
TEMP_PDF_DIR = os.path.join(ROOT_DIR, "output_confirmations", "temp")
os.makedirs(TEMP_PDF_DIR, exist_ok=True)
PDF_RETENTION_SECONDS = int(float(os.environ.get("PDF_RETENTION_HOURS", "24")) * 60 * 60)
PDF_CLEANUP_INTERVAL_SECONDS = int(os.environ.get("PDF_CLEANUP_INTERVAL_SECONDS", "3600"))
_last_pdf_cleanup = 0.0

# ── Auth ──────────────────────────────────
AUTH_SECRET = os.environ.get("AUTH_SECRET") or os.environ.get("SECRET_KEY")
if IS_PRODUCTION and not AUTH_SECRET:
    raise RuntimeError("AUTH_SECRET is required when APP_ENV=production")
AUTH_SECRET = AUTH_SECRET or "dev-only-change-me"
AUTH_SALT = "tradedocai-auth-v1"
AUTH_MAX_AGE_SECONDS = int(os.environ.get("AUTH_MAX_AGE_SECONDS", str(60 * 60 * 24 * 7)))
TOKEN_SERIALIZER = URLSafeTimedSerializer(AUTH_SECRET, salt=AUTH_SALT)
DEMO_EMAIL = os.environ.get("DEMO_USER_EMAIL", "demo@tradedoc.ai").lower()
DEMO_PASSWORD = os.environ.get("DEMO_USER_PASSWORD", "demo123")
DEMO_NAME = os.environ.get("DEMO_USER_NAME", "Demo User")
ENABLE_DEMO_USER = os.environ.get("ENABLE_DEMO_USER", "true" if not IS_PRODUCTION else "false").lower() == "true"
VALID_DOC_TYPES = {"fx_ndf", "irs", "cds", "equity_trs"}

def _json_body(required: bool = True) -> dict:
    body = request.get_json(silent=True)
    if body is None:
        if required:
            raise ValueError("JSON body required")
        return {}
    if not isinstance(body, dict):
        raise ValueError("JSON body must be an object")
    return body


def _auth_token_for(user_id: str) -> str:
    return TOKEN_SERIALIZER.dumps({"user_id": user_id})


def _public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]), 
        "email": user.get("email", ""), 
        "name": user.get("name", "User"),
        "city": user.get("city", ""),
        "address": user.get("address", ""),
        "country": user.get("country", "")
    }


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_demo_user(db):
    if not ENABLE_DEMO_USER:
        return None
    existing = db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        return existing
    now = _iso_now()
    user = {
        "email": DEMO_EMAIL,
        "name": DEMO_NAME,
        "password_hash": generate_password_hash(DEMO_PASSWORD),
        "created_at": now,
        "updated_at": now,
        "is_demo": True,
    }
    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return user


def _current_user_from_request():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = TOKEN_SERIALIZER.loads(token, max_age=AUTH_MAX_AGE_SECONDS)
        user_id = payload.get("user_id")
        if not user_id:
            return None
        return get_db().users.find_one({"_id": ObjectId(user_id)})
    except (BadSignature, SignatureExpired, InvalidId):
        return None


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return fn(*args, **kwargs)
        user = _current_user_from_request()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        g.current_user_id = str(user["_id"])
        return fn(*args, **kwargs)
    return wrapper


def _serialise_chat_session(session: dict) -> dict:
    return {
        "id": str(session["_id"]),
        "title": session.get("title", "New chat"),
        "created_at": session.get("created_at", ""),
        "updated_at": session.get("updated_at", ""),
    }


def _serialise_chat_message(message: dict) -> dict:
    return {
        "id": str(message["_id"]),
        "session_id": str(message["session_id"]),
        "role": message.get("role", "assistant"),
        "content": message.get("content", ""),
        "action": message.get("action"),
        "created_at": message.get("created_at", ""),
    }


def _chat_session_for_user(db, session_id: str | None):
    if not session_id:
        return None
    try:
        return db.chat_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": g.current_user_id,
        })
    except InvalidId:
        return None


def _create_chat_session(db, first_message: str = "") -> dict:
    now = _iso_now()
    title = first_message.strip().replace("\n", " ")[:60] or "New chat"
    session = {
        "user_id": g.current_user_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
    }
    result = db.chat_sessions.insert_one(session)
    session["_id"] = result.inserted_id
    return session


def _save_chat_message(db, session_id: ObjectId, role: str, content: str, action: str | None = None) -> dict:
    now = _iso_now()
    message = {
        "session_id": session_id,
        "user_id": g.current_user_id,
        "role": role,
        "content": content,
        "action": action,
        "created_at": now,
    }
    result = db.chat_messages.insert_one(message)
    message["_id"] = result.inserted_id
    db.chat_sessions.update_one(
        {"_id": session_id, "user_id": g.current_user_id},
        {"$set": {"updated_at": now}},
    )
    return message


def _load_chat_history(db, session_id: ObjectId, limit: int = 20) -> list[dict]:
    messages = list(
        db.chat_messages.find({"session_id": session_id, "user_id": g.current_user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    messages.reverse()
    return messages


def _build_chat_prompt(user_msg: str, history: list[dict]) -> str:
    current_time = datetime.now(timezone.utc).strftime("%B %d, %Y")
    prompt = f"You are TradeDoc Copilot, a helpful and intelligent AI assistant. Today's date is {current_time}. "
    prompt += "While you specialize in TradeDoc AI (derivatives like IRS, CDS, FX NDF, Equity TRS), you are happy to help with general questions too. "
    prompt += "Be conversational, friendly, and smart. "
    prompt += "CRITICAL NAVIGATION RULES:\n"
    prompt += "1. If the user mentions 'manual', 'form', 'create', or 'entry', YOU MUST use the 'form-' tokens (e.g., [NAVIGATE:form-irs]).\n"
    prompt += "2. If the user mentions 'extract', 'upload', 'file', or 'AI extraction', use the 'ai' token (e.g., [NAVIGATE:ai]).\n"
    prompt += "3. If the user's request is ONLY navigation, respond ONLY with the token.\n\n"
    prompt += "Possible page names and their meanings:\n"
    prompt += "- landing: Home, Dashboard, Overview\n"
    prompt += "- analytics: Charts, Performance, Analytics, Stats\n"
    prompt += "- ai: AI Extraction, Upload Trade, Document Extraction\n"
    prompt += "- settings-profile: Profile, User Settings\n"
    prompt += "- settings-preference: Preferences, Model selection\n"
    prompt += "- settings-password: Password, Security\n"
    prompt += "- my-documents: My Documents, History, Saved Trades\n"
    prompt += "- form-fx_ndf: Manual FX NDF form, Create FX trade\n"
    prompt += "- form-irs: Manual Interest Rate Swap form, Create IRS trade\n"
    prompt += "- form-cds: Manual Credit Default Swap form, Create CDS trade\n"
    prompt += "- form-equity_trs: Manual Equity TRS form, Create TRS trade\n"
    prompt += "Example: [NAVIGATE:form-irs]\n\n"

    for msg in history:
        role = "User" if msg.get("role") == "user" else "Assistant"
        prompt += f"{role}: {msg.get('content', '')}\n"

    prompt += f"User: {user_msg}\nAssistant:"
    return prompt


def _extract_chat_action(reply: str, user_msg: str) -> tuple[str, str | None]:
    action = None
    nav_pattern = r"\[NAVIGATE:?\s*([\w\-]+)\]"
    nav_match = re.search(nav_pattern, reply, re.IGNORECASE)

    if nav_match:
        action = nav_match.group(1).lower().strip()
        reply = re.sub(nav_pattern, "", reply, flags=re.IGNORECASE).strip()

    if not action:
        keywords = {
            "landing": "landing", "home": "landing", "dashboard": "landing",
            "analytics": "analytics", "charts": "analytics", "stats": "analytics",
            "ai": "ai", "extraction": "ai", "upload": "ai",
            "settings": "settings-profile", "profile": "settings-profile", "user setting": "settings-profile",
            "preference": "settings-preference", "model": "settings-preference",
            "password": "settings-password", "security": "settings-password",
            "documents": "my-documents", "history": "my-documents",
            "fx ndf form": "form-fx_ndf", "irs form": "form-irs", "cds form": "form-cds",
            "equity trs form": "form-equity_trs", "create fx": "form-fx_ndf",
            "create irs": "form-irs", "create cds": "form-cds", "create trs": "form-equity_trs",
        }
        text_to_check = (reply + " " + user_msg).lower()
        for kw, target in keywords.items():
            if (kw.endswith("form") or kw.startswith("create")) and kw in text_to_check:
                action = target
                break

        if not action:
            for kw, target in keywords.items():
                pattern = rf"(?:navigate|go|open|show|switch|take|to|towards)\s+(?:me\s+)?(?:to\s+)?{re.escape(kw)}"
                if re.search(pattern, text_to_check):
                    action = target
                    break

    if action:
        nav_only_phrases = ["navigate", "go to", "show", "open", "take me to", "switch to"]
        is_nav_only = any(user_msg.lower().startswith(p) for p in nav_only_phrases) or not reply.strip()
        if is_nav_only and not re.search(r"\?", user_msg):
            reply = f"Sure, opening {action.replace('-', ' ')} for you."

    return reply, action

# ── MongoDB ───────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME")
_mongo_client = None
_db = None


def _mongo_db_name_from_uri(uri: str) -> str:
    """Read the optional database name from a Mongo URI path."""
    try:
        parsed = urlparse(uri)
        path = parsed.path.lstrip("/")
        return unquote(path) if path else ""
    except Exception:
        return ""


def _mongo_db_name() -> str:
    return MONGO_DB_NAME or _mongo_db_name_from_uri(MONGO_URI) or "tradedocai"


def _mongo_client_options() -> dict:
    options = {
        "serverSelectionTimeoutMS": int(os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "10000")),
        "connectTimeoutMS": int(os.environ.get("MONGO_CONNECT_TIMEOUT_MS", "10000")),
        "socketTimeoutMS": int(os.environ.get("MONGO_SOCKET_TIMEOUT_MS", "20000")),
        "appname": "TradeDocAI",
    }

    uri_lower = MONGO_URI.lower()
    uses_atlas = MONGO_URI.startswith("mongodb+srv://") or "mongodb.net" in uri_lower
    has_tls_option = "tls=" in uri_lower or "ssl=" in uri_lower
    if uses_atlas:
        if not has_tls_option:
            options["tls"] = True
        if certifi is not None:
            options["tlsCAFile"] = certifi.where()

    return options


def get_db():
    """Lazy-connect to MongoDB. Returns the tradedocai database."""
    global _mongo_client, _db
    if _db is None:
        client = MongoClient(MONGO_URI, **_mongo_client_options())
        db = client[_mongo_db_name()]
        try:
            db.command("ping")
        except Exception:
            client.close()
            raise
        _mongo_client = client
        _db = db
        _ensure_indexes(_db)
    return _db


def _ensure_indexes(db):
    try:
        db.users.create_index("email", unique=True)
        db.documents.create_index([("user_id", 1), ("updated_at", -1)])
        db.documents.create_index([("user_id", 1), ("doc_type", 1)])
        db.pdf_jobs.create_index([("user_id", 1), ("created_at", -1)])
        db.chat_sessions.create_index([("user_id", 1), ("updated_at", -1)])
        db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])
        db.chat_messages.create_index([("user_id", 1), ("created_at", -1)])
    except Exception:
        traceback.print_exc()


def _database_error_response(error: Exception):
    traceback.print_exc()
    return jsonify({
        "error": "Database connection failed. Check MONGO_URI, MongoDB Atlas network access/IP allowlist, credentials, and TLS settings."
    }), 503


def _safe_user_id() -> str:
    return getattr(g, "current_user_id", "anonymous")


def _cleanup_old_generated_files(force: bool = False) -> None:
    """Remove generated PDF/Word job folders older than PDF_RETENTION_HOURS."""
    global _last_pdf_cleanup
    if PDF_RETENTION_SECONDS <= 0:
        return

    now = time.time()
    if not force and now - _last_pdf_cleanup < PDF_CLEANUP_INTERVAL_SECONDS:
        return
    _last_pdf_cleanup = now

    cutoff = now - PDF_RETENTION_SECONDS
    if not os.path.isdir(TEMP_PDF_DIR):
        return

    removed_jobs: list[str] = []
    for user_name in os.listdir(TEMP_PDF_DIR):
        user_dir = os.path.join(TEMP_PDF_DIR, user_name)
        if not os.path.isdir(user_dir):
            continue
        for job_name in os.listdir(user_dir):
            job_dir = os.path.join(user_dir, job_name)
            if not os.path.isdir(job_dir):
                continue
            try:
                if os.path.getmtime(job_dir) < cutoff:
                    shutil.rmtree(job_dir)
                    removed_jobs.append(job_name)
            except OSError:
                traceback.print_exc()

    if removed_jobs:
        try:
            get_db().pdf_jobs.delete_many({"job_id": {"$in": removed_jobs}})
        except Exception:
            traceback.print_exc()
        print(f"  🧹 Cleaned {len(removed_jobs)} expired generated PDF job(s)")


def _make_job_dir() -> tuple[str, str]:
    _cleanup_old_generated_files()
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_PDF_DIR, _safe_user_id(), job_id)
    os.makedirs(job_dir, exist_ok=True)
    return job_id, job_dir


def _file_id(job_id: str, filename: str) -> str:
    return f"{job_id}:{secure_filename(filename)}"


def _resolve_generated_pdf(body: dict) -> tuple[str | None, str | None]:
    """Resolve a generated PDF by job-scoped file id, with legacy filename fallback."""
    user_id = _safe_user_id()
    file_id = body.get("pdf_file_id") or body.get("file_id") or ""
    if file_id and ":" in file_id:
        job_id, filename = file_id.split(":", 1)
        job_id = secure_filename(job_id)
        filename = secure_filename(filename)
        pdf_path = os.path.abspath(os.path.join(TEMP_PDF_DIR, user_id, job_id, filename))
        allowed_root = os.path.abspath(os.path.join(TEMP_PDF_DIR, user_id))
        if pdf_path.startswith(allowed_root + os.sep) and os.path.exists(pdf_path):
            return pdf_path, filename

    legacy_name = secure_filename(body.get("pdf_filename", ""))
    if not legacy_name:
        return None, None
    user_root = os.path.abspath(os.path.join(TEMP_PDF_DIR, user_id))
    for root, _, files in os.walk(user_root) if os.path.exists(user_root) else []:
        if legacy_name in files:
            pdf_path = os.path.abspath(os.path.join(root, legacy_name))
            if pdf_path.startswith(user_root + os.sep):
                return pdf_path, legacy_name
    return None, legacy_name


def _obj_id_to_str(doc: dict) -> dict:
    """Convert MongoDB ObjectId _id to string for JSON serialisation."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ═══════════════════════════════════════════
# STATIC FILE SERVING (UI)
# ═══════════════════════════════════════════

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    # Don't catch API routes
    if (path.startswith("generate/") or path.startswith("ai/") or
            path.startswith("api/") or path == "validate" or
            path.startswith("convert/")):
        return jsonify({"error": "Not found"}), 404

    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(app.static_folder, path)

    if not os.path.splitext(path)[1]:
        if os.path.exists(full_path + ".html"):
            return send_from_directory(app.static_folder, path + ".html")
        if os.path.exists(os.path.join(full_path, "index.html")):
            return send_from_directory(app.static_folder, os.path.join(path, "index.html"))

    return send_from_directory(app.static_folder, "index.html")


# ═══════════════════════════════════════════
# MONGODB DOCUMENT CRUD ENDPOINTS
# ═══════════════════════════════════════════

@app.route("/ping", methods=["GET"])
def api_ping():
    return jsonify({"status": "ok", "message": "TradeDoc AI Server is reachable"}), 200


@app.route("/health/live", methods=["GET"])
def health_live():
    return jsonify({"status": "live"}), 200


@app.route("/health/ready", methods=["GET"])
def health_ready():
    checks = {"mongo": False, "gemini_configured": bool(os.environ.get("GEMINI_API_KEY"))}
    status = 200
    try:
        get_db().command("ping")
        checks["mongo"] = True
    except Exception:
        status = 503
    return jsonify({"status": "ready" if status == 200 else "not_ready", "checks": checks}), status


@app.route("/api/auth/signup", methods=["POST"])
def api_signup():
    try:
        body = _json_body()
        name = str(body.get("name", "")).strip()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not name or not email or not password:
            return jsonify({"error": "Name, email and password are required"}), 400
        if "@" not in email or len(email) > 254:
            return jsonify({"error": "Valid email is required"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        now = datetime.now(timezone.utc).isoformat()
        user = {
            "name": name[:120],
            "email": email,
            "password_hash": generate_password_hash(password),
            "created_at": now,
            "updated_at": now,
        }
        db = get_db()
        if db.users.find_one({"email": email}):
            return jsonify({"error": "Account already exists for this email"}), 409
        result = db.users.insert_one(user)
        user["_id"] = result.inserted_id
        return jsonify({"token": _auth_token_for(str(user["_id"])), "user": _public_user(user)}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": "Signup failed"}), 500


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    try:
        body = _json_body()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        db = get_db()
        if email == DEMO_EMAIL and ENABLE_DEMO_USER:
            _ensure_demo_user(db)
        user = db.users.find_one({"email": email})
        if not user or not check_password_hash(user.get("password_hash", ""), password):
            return jsonify({"error": "Invalid email or password"}), 401
        return jsonify({"token": _auth_token_for(str(user["_id"])), "user": _public_user(user)})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": "Login failed"}), 500


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def api_auth_me():
    return jsonify({"user": _public_user(g.current_user)})


@app.route("/api/chat/sessions", methods=["GET"])
@require_auth
def api_list_chat_sessions():
    try:
        sessions = list(
            get_db().chat_sessions.find({"user_id": g.current_user_id}).sort("updated_at", -1)
        )
        return jsonify({"sessions": [_serialise_chat_session(session) for session in sessions]})
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": "Failed to load chat sessions"}), 500


@app.route("/api/chat/sessions", methods=["POST"])
@require_auth
def api_create_chat_session():
    try:
        body = _json_body(required=False)
        session = _create_chat_session(get_db(), str(body.get("title", "")))
        return jsonify({"session": _serialise_chat_session(session)}), 201
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": "Failed to create chat session"}), 500


@app.route("/api/chat/sessions/<session_id>/messages", methods=["GET"])
@require_auth
def api_list_chat_messages(session_id):
    try:
        db = get_db()
        session = _chat_session_for_user(db, session_id)
        if not session:
            return jsonify({"error": "Chat session not found"}), 404
        messages = list(
            db.chat_messages.find({"session_id": session["_id"], "user_id": g.current_user_id})
            .sort("created_at", 1)
        )
        return jsonify({
            "session": _serialise_chat_session(session),
            "messages": [_serialise_chat_message(message) for message in messages],
        })
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": "Failed to load chat messages"}), 500


@app.route("/api/chat/sessions/<session_id>", methods=["DELETE"])
@require_auth
def api_delete_chat_session(session_id):
    try:
        db = get_db()
        session = _chat_session_for_user(db, session_id)
        if not session:
            return jsonify({"error": "Chat session not found"}), 404
        db.chat_messages.delete_many({"session_id": session["_id"], "user_id": g.current_user_id})
        db.chat_sessions.delete_one({"_id": session["_id"], "user_id": g.current_user_id})
        return jsonify({"message": "Chat session deleted"})
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": "Failed to delete chat session"}), 500


@app.route("/api/chat", methods=["POST", "OPTIONS"], strict_slashes=False)
@require_auth
def chat_copilot():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    print("  💬 Chat Copilot request received")
    try:
        body = _json_body()
        user_msg = str(body.get("message", "")).strip()
        if not user_msg:
            return jsonify({"error": "Message is required"}), 400

        db = get_db()
        session = _chat_session_for_user(db, body.get("session_id"))
        if not session:
            session = _create_chat_session(db, user_msg)

        history = _load_chat_history(db, session["_id"])
        prompt = _build_chat_prompt(user_msg, history)
        _save_chat_message(db, session["_id"], "user", user_msg)

        reply = call_gemini(prompt, model_name="gemini-flash-latest")
        reply, action = _extract_chat_action(reply, user_msg)
        assistant_message = _save_chat_message(db, session["_id"], "assistant", reply, action)
        session = db.chat_sessions.find_one({"_id": session["_id"], "user_id": g.current_user_id})

        if action:
            print(f"  🚀 Navigation detected: {action}")

        return jsonify({
            "reply": reply,
            "action": action,
            "session": _serialise_chat_session(session),
            "message": _serialise_chat_message(assistant_message),
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/me/update", methods=["POST"], strict_slashes=False)
@require_auth
def api_update_profile():
    """Updates user profile details in MongoDB."""
    try:
        body = request.get_json(silent=True) or {}
        update_data = {}
        for field in ["name", "city", "address", "country"]:
            if field in body: update_data[field] = body[field]
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        get_db().users.update_one({"_id": ObjectId(g.current_user_id)}, {"$set": update_data})
        user = get_db().users.find_one({"_id": ObjectId(g.current_user_id)})
        return jsonify({"message": "Profile updated successfully", "user": _public_user(user)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/me/change-password", methods=["POST"], strict_slashes=False)
@require_auth
def api_change_password():
    """Changes user password securely."""
    try:
        body = request.get_json(silent=True) or {}
        current_pw, new_pw = body.get("current_password"), body.get("new_password")
        if not current_pw or not new_pw:
            return jsonify({"error": "Missing current or new password"}), 400
        user = get_db().users.find_one({"_id": ObjectId(g.current_user_id)})
        if not check_password_hash(user.get("password_hash", ""), current_pw):
            return jsonify({"error": "Incorrect current password"}), 401
        get_db().users.update_one({"_id": ObjectId(g.current_user_id)}, {"$set": {"password_hash": generate_password_hash(new_pw)}})
        return jsonify({"message": "Password updated successfully"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents", methods=["GET"])
@require_auth
def api_list_documents():
    """List all documents (Final) and drafts for the user."""
    try:
        db = get_db()
        # Fetch from both collections
        final_docs = list(db.documents.find({"user_id": g.current_user_id}).sort("updated_at", -1))
        drafts = list(db.drafts.find({"user_id": g.current_user_id}).sort("updated_at", -1))
        
        # Mark them so frontend knows which is which
        for d in final_docs: d["is_draft"] = False
        for d in drafts: d["is_draft"] = True
        
        all_docs = final_docs + drafts
        # Sort combined list by updated_at
        all_docs.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
        return jsonify([_obj_id_to_str(d) for d in all_docs])
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents", methods=["POST"])
@require_auth
def api_save_document():
    """Save a new document. If is_draft=True, save to 'drafts', else to 'documents'."""
    try:
        body = _json_body()
        doc_type = str(body.get("doc_type", "")).strip()
        if doc_type not in VALID_DOC_TYPES:
            return jsonify({"error": "Unsupported document type"}), 400
        data = body.get("data", {})
        is_draft = bool(body.get("is_draft", True))

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "user_id":    g.current_user_id,
            "doc_type":   doc_type,
            "name":       str(body.get("name", "Untitled"))[:160],
            "icon":       str(body.get("icon", ""))[:16],
            "summary":    str(body.get("summary", ""))[:400],
            "ai_created": bool(body.get("ai_created", False)),
            "is_draft":   is_draft,
            "data":       data,
            "created_at": now,
            "updated_at": now,
        }

        db = get_db()
        collection = db.drafts if is_draft else db.documents
        result = collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        
        coll_name = "drafts" if is_draft else "documents"
        print(f"  ✅ Document saved to {coll_name}: {doc['_id']} ({doc['doc_type']})")
        return jsonify(doc), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents/<doc_id>", methods=["GET"])
@require_auth
def api_get_document(doc_id):
    """Return a single document from either drafts or documents collection."""
    try:
        db = get_db()
        oid = ObjectId(doc_id)
        # Check documents first, then drafts
        doc = db.documents.find_one({"_id": oid, "user_id": g.current_user_id})
        if doc:
            doc["is_draft"] = False
        else:
            doc = db.drafts.find_one({"_id": oid, "user_id": g.current_user_id})
            if doc:
                doc["is_draft"] = True
                
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        return jsonify(_obj_id_to_str(doc))
    except Exception as e:
        if isinstance(e, InvalidId):
            return jsonify({"error": "Invalid document id"}), 400
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents/<doc_id>", methods=["PUT"])
@require_auth
def api_update_document(doc_id):
    """Update a document. Handles promotion from drafts to documents if finalized."""
    try:
        body = _json_body()
        oid = ObjectId(doc_id)
        db = get_db()
        
        # Determine current location
        is_in_final = db.documents.find_one({"_id": oid, "user_id": g.current_user_id}) is not None
        
        now = datetime.now(timezone.utc).isoformat()
        update_fields = {"updated_at": now}
        if "data" in body:
            update_fields["data"] = body["data"]
        if "name" in body:
            update_fields["name"] = str(body["name"])[:160]
        if "summary" in body:
            update_fields["summary"] = str(body["summary"])[:400]
        
        new_is_draft = body.get("is_draft")
        
        # Logic: Promotion from Draft to Final
        if not is_in_final and new_is_draft == False:
            # Fetch existing draft data to move
            draft_doc = db.drafts.find_one({"_id": oid, "user_id": g.current_user_id})
            if not draft_doc:
                return jsonify({"error": "Draft not found"}), 404
            
            # Merge updates
            draft_doc.update(update_fields)
            draft_doc["is_draft"] = False
            
            # Move to documents
            db.documents.insert_one(draft_doc)
            db.drafts.delete_one({"_id": oid})
            print(f"  🚀 Draft promoted to Final: {doc_id}")
            return jsonify(_obj_id_to_str(draft_doc))
        
        # Normal update within same collection
        current_coll = db.documents if is_in_final else db.drafts
        update_fields["is_draft"] = bool(new_is_draft) if new_is_draft is not None else (not is_in_final)
        
        result = current_coll.update_one(
            {"_id": oid, "user_id": g.current_user_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Document not found"}), 404
            
        return jsonify({"status": "success", "updated_at": now})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents/<doc_id>", methods=["DELETE"])
@require_auth
def api_delete_document(doc_id):
    """Delete a document from either collection."""
    try:
        db = get_db()
        oid = ObjectId(doc_id)
        # Try deleting from both
        r1 = db.documents.delete_one({"_id": oid, "user_id": g.current_user_id})
        r2 = db.drafts.delete_one({"_id": oid, "user_id": g.current_user_id})
        
        if r1.deleted_count > 0 or r2.deleted_count > 0:
            print(f"  🗑️ Document deleted: {doc_id}")
            return jsonify({"status": "deleted"})
        return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500






# ═══════════════════════════════════════════
# LANGGRAPH ENDPOINT: AI EXTRACT
#   classify email → extract JSON
# ═══════════════════════════════════════════

@app.route("/ai/extract", methods=["POST"])
@require_auth
def api_ai_extract():
    """
    Accepts email text, runs classify → extract agents.
    Returns classified doc type and extracted JSON.
    """
    try:
        if not os.environ.get("GEMINI_API_KEY"):
            return jsonify({"error": "AI service is not configured. Set GEMINI_API_KEY."}), 503
        body = _json_body()
        email_text = body.get("email_text", "")

        if not email_text.strip():
            return jsonify({"error": "No email text provided"}), 400
            
        MAX_EMAIL_LENGTH = 50_000
        if len(email_text) > MAX_EMAIL_LENGTH:
            return jsonify({"error": f"Email text too long (max {MAX_EMAIL_LENGTH} chars)"}), 400

        print(f"\n{'='*55}")
        print(f"  ▶ AI Extract: classify + extract from email")
        print(f"{'='*55}")

        result = ai_create_graph.invoke({
            "email_text": email_text,
            "mode": "ai_create",
            "model": body.get("model")
        })

        if result.get("error"):
            return jsonify({"error": result["error"]}), 500

        return jsonify({
            "doc_type":         result.get("doc_type", ""),
            "exhibit":          result.get("exhibit", ""),
            "termination_type": result.get("termination_type", ""),
            "model_type":       result.get("model_type", ""),
            "extracted_json":   result.get("extracted_json", {})
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════
# PDF GENERATION ENDPOINTS (TEMP PDFs only)
# ═══════════════════════════════════════════

def _send_pdf(pdf_path: str):
    """Common helper: stream PDF to client."""
    filename = os.path.basename(pdf_path)
    response = send_file(
        pdf_path, mimetype="application/pdf",
        as_attachment=True, download_name=filename
    )
    job_id = os.path.basename(os.path.dirname(pdf_path))
    response.headers["X-TradeDoc-File-Id"] = _file_id(job_id, filename)
    return response


def _generate_pdf_response(doc_type: str, generator, trade_data: dict):
    if not isinstance(trade_data, dict) or not trade_data:
        return jsonify({"error": "No JSON body provided"}), 400
    job_id, job_dir = _make_job_dir()
    pdf_path = generator(trade_data, job_dir)
    if pdf_path and os.path.exists(pdf_path):
        filename = secure_filename(os.path.basename(pdf_path))
        try:
            get_db().pdf_jobs.insert_one({
                "user_id": _safe_user_id(),
                "job_id": job_id,
                "doc_type": doc_type,
                "filename": filename,
                "path": pdf_path,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            traceback.print_exc()
        return _send_pdf(pdf_path)
    return jsonify({"error": "PDF compilation failed"}), 500


@app.route("/generate/fx_ndf", methods=["POST"])
@require_auth
def api_generate_fx_ndf():
    """Accept FX NDF trade JSON, generate temp PDF, return it."""
    try:
        trade_data = _json_body()
        print(f"\n{'='*55}\n  ▶ Generating FX NDF PDF...\n{'='*55}")
        return _generate_pdf_response("fx_ndf", generate_fx_pdf, trade_data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/generate/irs", methods=["POST"])
@require_auth
def api_generate_irs():
    """Accept IRS trade JSON, generate temp PDF, return it."""
    try:
        trade_data = _json_body()
        print(f"\n{'='*55}\n  ▶ Generating IRS Confirmation PDF...\n{'='*55}")
        return _generate_pdf_response("irs", generate_irs_pdf, trade_data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/generate/cds", methods=["POST"])
@require_auth
def api_generate_cds():
    """Accept CDS trade JSON, generate temp PDF, return it."""
    try:
        trade_data = _json_body()
        print(f"\n{'='*55}\n  ▶ Generating CDS Confirmation PDF...\n{'='*55}")
        return _generate_pdf_response("cds", generate_cds_pdf, trade_data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/generate/equity_trs", methods=["POST"])
@require_auth
def api_generate_equity_trs():
    """Accept Equity TRS trade JSON (Model I or II), generate temp PDF, return it."""
    try:
        trade_data = _json_body()
        model = trade_data.get("model_type", "I")
        print(f"\n{'='*55}\n  ▶ Generating Equity TRS PDF (Model {model})...\n{'='*55}")
        return _generate_pdf_response("equity_trs", generate_equity_trs_pdf, trade_data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════
# WORD CONVERSION ENDPOINT
# ═══════════════════════════════════════════

@app.route("/convert/word", methods=["POST"])
@require_auth
def api_convert_word():
    """Accept a PDF filename, convert to Word (.docx) via Adobe PDF Services API, return it."""
    try:
        body = _json_body()
        pdf_path, pdf_filename = _resolve_generated_pdf(body)

        if not pdf_filename:
            return jsonify({"error": "No PDF filename provided"}), 400
        if not pdf_path:
            return jsonify({"error": f"PDF not found: {pdf_filename}"}), 404

        docx_filename = os.path.splitext(pdf_filename)[0] + ".docx"
        docx_path = os.path.join(os.path.dirname(pdf_path), docx_filename)

        print(f"\n{'='*55}\n  ▶ Converting PDF to Word via Adobe API: {pdf_filename}...\n{'='*55}")
        
        if not ADOBE_AVAILABLE:
            return jsonify({"error": "Adobe PDF Services SDK is not installed or configured."}), 500

        credentials = ServicePrincipalCredentials(
            client_id=os.environ.get("PDF_SERVICES_CLIENT_ID"),
            client_secret=os.environ.get("PDF_SERVICES_CLIENT_SECRET"),
        )
        pdf_services = PDFServices(credentials=credentials)

        with open(pdf_path, "rb") as f:
            input_stream = f.read()

        asset = pdf_services.upload(input_stream=input_stream, mime_type=PDFServicesMediaType.PDF)
        export_params = ExportPDFParams(
            target_format=ExportPDFTargetFormat.DOCX,
            ocr_lang=ExportOCRLocale.EN_US,
        )
        export_job = ExportPDFJob(input_asset=asset, export_pdf_params=export_params)
        location = pdf_services.submit(export_job)
        response = pdf_services.get_job_result(location, ExportPDFResult)

        result_asset = response.get_result().get_asset()
        stream_asset = pdf_services.get_content(result_asset)

        with open(docx_path, "wb") as out:
            out.write(stream_asset.get_input_stream())

        if os.path.exists(docx_path):
            print(f"  ✅ Word file created: {docx_filename}")
            return send_file(
                docx_path,
                mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                as_attachment=True,
                download_name=docx_filename
            )
        return jsonify({"error": "Word conversion failed"}), 500

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════
# LANGGRAPH ENDPOINT: VALIDATE
# ═══════════════════════════════════════════

@app.route("/validate", methods=["POST"])
@require_auth
def api_validate():
    """
    Accepts email_text + pdf_filename, runs validation agent.
    Compares the generated PDF against the original email.
    """
    try:
        if not os.environ.get("GEMINI_API_KEY"):
            return jsonify({"error": "AI service is not configured. Set GEMINI_API_KEY."}), 503
        body = _json_body()
        email_text = body.get("email_text", "")
        pdf_path, pdf_filename = _resolve_generated_pdf(body)

        if not pdf_filename:
            return jsonify({"error": "No PDF filename provided"}), 400
        if not email_text.strip():
            return jsonify({"error": "No email text provided for validation"}), 400
        if not pdf_path:
            return jsonify({"error": f"PDF not found: {pdf_filename}"}), 404

        print(f"\n{'='*55}\n  ▶ Validating PDF: {pdf_filename} against email...\n{'='*55}")

        result = validation_graph.invoke({
            "email_text": email_text,
            "pdf_path": pdf_path,
            "mode": "validate",
            "model": body.get("model")
        })

        if result.get("error"):
            return jsonify({"error": result["error"]}), 500

        return jsonify({
            "validation_report": result.get("validation_report", "No report generated")
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════
# BOOT
# ═══════════════════════════════════════════

if __name__ == "__main__":
    import sys
    # Ensure stdout can handle UTF-8 on Windows terminals
    if sys.stdout.encoding and sys.stdout.encoding.lower() in ('cp1252', 'ascii'):
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print()
    print("=" * 55)
    print("  TradeDoc AI Server -- LangGraph Edition")
    print("=" * 55)
    PORT = int(os.environ.get("PORT", "5055"))
    print(f"  UI:              http://localhost:{PORT}")
    print(f"  AI Extract:      POST /ai/extract")
    print(f"  FX NDF PDF:      POST /generate/fx_ndf")
    print(f"  IRS PDF:         POST /generate/irs")
    print(f"  CDS PDF:         POST /generate/cds")
    print(f"  Equity TRS PDF:  POST /generate/equity_trs")
    print(f"  To Word:         POST /convert/word")
    print(f"  Validate:        POST /validate")
    print(f"  Save Doc:        POST /api/documents")
    print(f"  List Docs:       GET  /api/documents")
    print(f"  Get Doc:         GET  /api/documents/<id>")
    print(f"  Update Doc:      PUT  /api/documents/<id>")
    print(f"  Delete Doc:      DEL  /api/documents/<id>")
    print(f"  Temp PDF dir:    {TEMP_PDF_DIR}")
    print("=" * 55)
    print()

    _cleanup_old_generated_files(force=True)
    
    try:
        get_db().command("ping")
        print("  ✅ MongoDB connected successfully")
    except Exception as e:
        print(f"  ⚠️  MongoDB not available: {e}")
        print("  ℹ️  Document saving/loading will fail")
        
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=PORT, debug=DEBUG)
