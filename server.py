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
from datetime import datetime, timedelta, timezone
from functools import wraps
from urllib.parse import unquote, urlparse
import re
from dotenv import load_dotenv
load_dotenv()  # local development only; production injects env vars at runtime
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, PyMongoError, ServerSelectionTimeoutError
from flask import Flask, Response, g, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

# ── Google Cloud Storage (optional) ───────
try:
    from google.cloud import storage  # type: ignore[import-untyped]
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    storage = None  # type: ignore[assignment]

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
from agents.gemini_helper import call_gemini, call_gemini_stream

# Import raw generators as fallback for direct PDF compilation
# Lazy imports with fallbacks — prevents entire server from crashing
# if a single template module is missing from the deployment image.
_generate_fx_pdf_direct = None
_generate_irs_pdf_direct = None
_generate_cds_pdf_direct = None
_generate_equity_trs_pdf_direct = None

try:
    from generate_fx_ndf import generate_pdf as _generate_fx_pdf_direct
except ModuleNotFoundError:
    print("  ⚠️  generate_fx_ndf module not found — FX NDF direct PDF generation disabled")

try:
    from generate_irs import generate_pdf as _generate_irs_pdf_direct
except ModuleNotFoundError:
    print("  ⚠️  generate_irs module not found — IRS direct PDF generation disabled")

try:
    from generate_cds import generate_pdf as _generate_cds_pdf_direct
except ModuleNotFoundError:
    print("  ⚠️  generate_cds module not found — CDS direct PDF generation disabled")

try:
    from generate_equity_trs import generate_pdf as _generate_equity_trs_pdf_direct
except ModuleNotFoundError:
    print("  ⚠️  generate_equity_trs module not found — Equity TRS direct PDF generation disabled")

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

# ── Google Cloud Storage ──────────────────
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "")
GCS_CREDENTIALS_PATH = os.path.abspath(
    os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS",
        os.path.join(ROOT_DIR, "gcs-service-account.json"),
    )
)
GCS_SIGNED_URL_EXPIRY_MINUTES = int(os.environ.get("GCS_SIGNED_URL_EXPIRY_MINUTES", "15"))
_gcs_client = None


def _storage_client():
    """Lazy-init singleton for GCS client. Returns None if GCS is not configured."""
    global _gcs_client
    if not GCS_AVAILABLE:
        return None
    if _gcs_client is None:
        if not GCS_BUCKET_NAME:
            print("  ⚠️  GCS_BUCKET_NAME not set — GCS archival disabled")
            return None
        if not os.path.exists(GCS_CREDENTIALS_PATH):
            print(f"  ⚠️  GCS credentials not found at {GCS_CREDENTIALS_PATH} — GCS archival disabled")
            return None
        _gcs_client = storage.Client.from_service_account_json(GCS_CREDENTIALS_PATH)  # type: ignore[union-attr]
    return _gcs_client


def _upload_to_gcs(local_pdf_path: str, user_id: str, doc_type: str) -> str | None:
    """Upload a PDF to Google Cloud Storage. Returns the GCS object path or None on failure."""
    client = _storage_client()
    if not client:
        return None
    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        filename = os.path.basename(local_pdf_path)
        object_path = f"{user_id}/{doc_type}/{filename}"
        blob = bucket.blob(object_path)
        blob.upload_from_filename(local_pdf_path, content_type="application/pdf")
        print(f"  ☁️  Uploaded to GCS: gs://{GCS_BUCKET_NAME}/{object_path}")
        return object_path
    except Exception:
        traceback.print_exc()
        return None


def _download_from_gcs(gcs_object_path: str) -> bytes | None:
    """Download PDF bytes from GCS. Returns None on failure."""
    client = _storage_client()
    if not client:
        return None
    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(gcs_object_path)
        if not blob.exists():
            return None
        return blob.download_as_bytes()
    except Exception:
        traceback.print_exc()
        return None


def _generate_gcs_signed_url(gcs_object_path: str) -> str | None:
    """Generate a time-limited signed URL for a GCS object."""
    client = _storage_client()
    if not client:
        return None
    try:
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(gcs_object_path)
        if not blob.exists():
            return None
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=GCS_SIGNED_URL_EXPIRY_MINUTES),
            method="GET",
            response_disposition="inline",
        )
    except Exception:
        traceback.print_exc()
        return None


# ── Auth ──────────────────────────────────
AUTH_SECRET = os.environ.get("AUTH_SECRET") or os.environ.get("SECRET_KEY")
if IS_PRODUCTION and not AUTH_SECRET:
    raise RuntimeError("AUTH_SECRET is required when APP_ENV=production")
if IS_PRODUCTION and AUTH_SECRET and len(AUTH_SECRET) < 16:
    raise RuntimeError("AUTH_SECRET must be at least 16 characters in production")
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
            # Return 200 OK for CORS preflight — never forward to the view
            # (the view may run DB queries that could fail and return non-200)
            return "", 200
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

def _detect_fast_navigation(user_msg: str) -> str | None:
    """Detects simple navigation commands without calling AI to save time/cost."""
    msg = user_msg.lower().strip()
    
    # Common navigation keywords
    keywords = {
        "landing": "landing", "home": "landing", "dashboard": "landing",
        "analytics": "analytics", "charts": "analytics", "stats": "analytics",
        "ai": "ai", "extraction": "ai", "upload": "ai",
        "settings": "settings-profile", "profile": "settings-profile",
        "documents": "my-documents", "history": "my-documents",
        "fx ndf form": "form-fx_ndf", "irs form": "form-irs", "cds form": "form-cds",
        "equity trs form": "form-equity_trs", "create fx": "form-fx_ndf",
        "create irs": "form-irs", "create cds": "form-cds", "create trs": "form-equity_trs",
    }
    
    # If message is very short and contains a keyword
    for kw, target in keywords.items():
        if kw == msg: return target
        
    # Standard navigation patterns: "go to cds", "open analytics" etc.
    prefixes = ["go to", "open", "show", "switch to", "take me to", "navigate to", "move to"]
    for prefix in prefixes:
        if msg.startswith(prefix):
            remaining = msg[len(prefix):].strip()
            for kw, target in keywords.items():
                if kw in remaining:
                    print(f"  ⚡ Fast Navigation Triggered: {target}")
                    return target
                    
    # Also check if just the keyword is present in a short message
    if len(msg.split()) <= 3:
        for kw, target in keywords.items():
            if kw in msg:
                print(f"  ⚡ Fast Navigation Triggered (Keyword): {target}")
                return target
                    
    return None

# ── MongoDB ───────────────────────────────
MONGO_URI = os.getenv("MONGO_URI") or ("" if IS_PRODUCTION else "mongodb://localhost:27017/tradedocai")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")
app.config["MONGO_URI"] = MONGO_URI
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-12345")

# Initialize Limiter
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["500 per day", "100 per hour"],
    storage_uri="memory://",
)
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


def _validate_mongo_config() -> None:
    if not MONGO_URI:
        raise ConfigurationError("MONGO_URI is required")

    if IS_PRODUCTION:
        parsed = urlparse(MONGO_URI)
        host = parsed.hostname or ""
        local_hosts = {"localhost", "127.0.0.1", "mongo"}
        if host in local_hosts or host.endswith(".local"):
            raise ConfigurationError(
                "Production MONGO_URI must point to a managed MongoDB service such as Atlas, not a local Docker host."
            )


def get_db():
    """Lazy-connect to MongoDB. Returns the tradedocai database."""
    global _mongo_client, _db
    if _db is None:
        _validate_mongo_config()
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
        "error": "Database connection failed. Check MONGO_URI, MongoDB Atlas network access/IP allowlist, credentials, and TLS settings.",
        "detail": str(error) if not IS_PRODUCTION else "Database is unavailable",
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
    return f"{job_id}:{filename}"


def _resolve_generated_pdf(body: dict) -> tuple[str | None, str | None]:
    """Resolve a generated PDF by job-scoped file id, with legacy filename fallback."""
    user_id = _safe_user_id()
    file_id = body.get("pdf_file_id") or body.get("file_id") or ""
    if file_id and ":" in file_id:
        job_id, filename = file_id.split(":", 1)
        job_id = secure_filename(job_id)
        job_dir = os.path.abspath(os.path.join(TEMP_PDF_DIR, user_id, job_id))
        allowed_root = os.path.abspath(os.path.join(TEMP_PDF_DIR, user_id))
        # Try the raw filename as stored (new format — _file_id no longer secures)
        pdf_path = os.path.join(job_dir, filename)
        if os.path.exists(pdf_path) and pdf_path.startswith(allowed_root + os.sep):
            return pdf_path, filename
        # Fallback: try secure_filename version (legacy docs stored with secured names)
        filename_secured = secure_filename(filename)
        if filename_secured != filename:
            pdf_path = os.path.join(job_dir, filename_secured)
            if os.path.exists(pdf_path) and pdf_path.startswith(allowed_root + os.sep):
                return pdf_path, filename_secured
        # Last resort: find any PDF in the job directory
        if os.path.isdir(job_dir):
            pdfs = sorted([f for f in os.listdir(job_dir) if f.lower().endswith(".pdf")])
            if pdfs:
                pdf_path = os.path.join(job_dir, pdfs[0])
                if pdf_path.startswith(allowed_root + os.sep):
                    return pdf_path, pdfs[0]

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
    static_dir = app.static_folder or ""
    return send_from_directory(static_dir, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    static_dir = app.static_folder or ""
    # Don't catch API routes
    if (path.startswith("generate/") or path.startswith("ai/") or
            path.startswith("api/") or path == "validate" or
            path.startswith("convert/")):
        return jsonify({"error": "Not found"}), 404

    full_path = os.path.join(static_dir, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(static_dir, path)

    if not os.path.splitext(path)[1]:
        if os.path.exists(full_path + ".html"):
            return send_from_directory(static_dir, path + ".html")
        if os.path.exists(os.path.join(full_path, "index.html")):
            return send_from_directory(static_dir, os.path.join(path, "index.html"))

    return send_from_directory(static_dir, "index.html")


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
    errors = {}
    status = 200
    try:
        get_db().command("ping")
        checks["mongo"] = True
    except Exception as e:
        status = 503
        errors["mongo"] = str(e) if not IS_PRODUCTION else "Database is unavailable"
    return jsonify({"status": "ready" if status == 200 else "not_ready", "checks": checks, "errors": errors}), status


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


@app.route("/api/chat", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def api_chat():
    try:
        body = _json_body()
        user_msg = str(body.get("message", "")).strip()
        if not user_msg:
            return jsonify({"error": "Message is required"}), 400

        doc_type = body.get("doc_type")
        schema = body.get("schema")
        current_data = body.get("current_data")
        scope = body.get("scope", "global")  # "local" = ChatSidebar form assistant, "global" = ChatCopilot
        stream = body.get("stream", False)   # SSE streaming for ChatGPT-like real-time output

        # ── Local Scope (ChatSidebar — no DB, no session) ──
        if scope == "local" and doc_type and schema:
            msg_lower = user_msg.lower()

            # Detect intent: missing fields
            is_missing_check = any(kw in msg_lower for kw in [
                "what's missing", "whats missing", "what is missing",
                "missing fields", "remaining", "still need", "left to fill",
                "not filled", "empty fields", "what else", "what do i need"
            ])
            # Detect intent: mistake_check (only review filled, never mention missing)
            is_mistake_check = any(kw in msg_lower for kw in [
                "check", "mistake", "review", "verify", "error",
                "wrong", "correct", "any issues", "look over"
            ]) and not is_missing_check  # Don't route "what's missing" to mistake check
            # Detect intent: field_explain
            is_field_explain = any(kw in msg_lower for kw in [
                "what does", "what is", "explain", "mean",
                "definition", "define", "purpose of"
            ])

            if is_missing_check and current_data is not None:
                from agents.assistant_agent import build_missing_fields_prompt
                prompt = build_missing_fields_prompt(doc_type, current_data, schema)
                if prompt is None:
                    # No missing required fields — craft a simple response
                    reply = "All required fields are filled. You're good to go!"
                    if not stream:
                        return jsonify({"reply": reply, "action": None, "session": None, "message": None})
                    def generate_empty():
                        yield f"data: {json.dumps({'token': reply})}\n\n"
                        yield f"data: {json.dumps({'done': True, 'reply': reply, 'action': None})}\n\n"
                    return Response(generate_empty(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})
            elif is_mistake_check and current_data:
                from agents.assistant_agent import build_mistake_check_prompt
                prompt = build_mistake_check_prompt(doc_type, current_data, schema)
            elif is_field_explain:
                from agents.assistant_agent import build_field_explain_prompt
                prompt = build_field_explain_prompt(doc_type, user_msg, schema)
            else:
                # Generic local query — use existing assistant prompt with empty history
                from agents.assistant_agent import build_assistant_prompt
                prompt = build_assistant_prompt(user_msg, doc_type, schema, current_data or {}, [])

            # ── SSE Streaming path ──
            if stream:
                def generate():
                    full_text = ""
                    try:
                        for chunk in call_gemini_stream(prompt, model_name="gemini-flash-latest"):
                            full_text += chunk
                            yield f"data: {json.dumps({'token': chunk})}\n\n"
                        # Send final message with cleaned full text + action extraction
                        clean_text, action = _extract_chat_action(full_text, user_msg)
                        yield f"data: {json.dumps({'done': True, 'reply': clean_text, 'action': action})}\n\n"
                    except Exception as e:
                        yield f"data: {json.dumps({'error': str(e)[:200]})}\n\n"

                return Response(
                    generate(),
                    mimetype="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "X-Accel-Buffering": "no",
                        "Connection": "keep-alive",
                    }
                )

            # ── Non-streaming path (fallback) ──
            reply = call_gemini(prompt, model_name="gemini-flash-latest")
            reply, _ = _extract_chat_action(reply, user_msg)

            return jsonify({
                "reply": reply,
                "action": None,
                "session": None,
                "message": None,
            })

        # ── Global Scope (ChatCopilot — existing flow with DB) ──
        db = get_db()
        session = _chat_session_for_user(db, body.get("session_id"))
        if not session:
            session = _create_chat_session(db, user_msg)

        history = _load_chat_history(db, session["_id"])

        # 1. Fast-Track Navigation (Skip LLM for simple "go to" commands)
        fast_action = _detect_fast_navigation(user_msg)
        if fast_action and not re.search(r"\?", user_msg):
            reply = f"Sure, opening {fast_action.replace('-', ' ')} for you."
            action = fast_action
            assistant_message = _save_chat_message(db, session["_id"], "assistant", reply, action)
            return jsonify({
                "reply": reply,
                "action": action,
                "session": _serialise_chat_session(session),
                "message": _serialise_chat_message(assistant_message),
            })

        # 2. Regular AI Response
        if doc_type and schema and current_data is not None:
            from agents.assistant_agent import build_assistant_prompt
            prompt = build_assistant_prompt(user_msg, doc_type, schema, current_data, history)
        else:
            prompt = _build_chat_prompt(user_msg, history)

        _save_chat_message(db, session["_id"], "user", user_msg)

        reply = call_gemini(prompt, model_name="gemini-flash-latest")
        reply, action = _extract_chat_action(reply, user_msg)
        assistant_message = _save_chat_message(db, session["_id"], "assistant", reply, action)
        session = db.chat_sessions.find_one({"_id": session["_id"], "user_id": g.current_user_id})

        if action:
            print(f"  🚀 Navigation detected: {action}")

        session_data = _serialise_chat_session(session) if session else None
        
        return jsonify({
            "reply": reply,
            "action": action,
            "session": session_data,
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
        if not user:
            return jsonify({"error": "User not found"}), 404
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
        if not user or not check_password_hash(user.get("password_hash", ""), current_pw):
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
        pdf_file_id = str(body.get("pdf_file_id", "")).strip() or None

        # If finalizing with a pdf_file_id, try to resolve & upload to GCS
        gcs_object_path = None
        if not is_draft and pdf_file_id and ":" in pdf_file_id:
            pdf_path, _ = _resolve_generated_pdf({"pdf_file_id": pdf_file_id})
            if pdf_path and os.path.exists(pdf_path):
                gcs_object_path = _upload_to_gcs(pdf_path, g.current_user_id, doc_type)

        ai_created = bool(body.get("ai_created", False))
        source_email = str(body.get("source_email", "")).strip()
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "user_id":    g.current_user_id,
            "doc_type":   doc_type,
            "name":       str(body.get("name", "Untitled"))[:160],
            "icon":       str(body.get("icon", ""))[:16],
            "summary":    str(body.get("summary", ""))[:400],
            "ai_created": ai_created,
            "is_draft":   is_draft,
            "data":       data,
            "created_at": now,
            "updated_at": now,
        }
        if source_email:
            doc["source_email"] = source_email[:10000]
        # Set validation_status: AI-filled docs need validation, manual docs are auto-verified
        if not is_draft:
            doc["validation_status"] = "pending" if ai_created else "verified"
        if pdf_file_id:
            doc["pdf_file_id"] = pdf_file_id
        if gcs_object_path:
            doc["gcs_object_path"] = gcs_object_path

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
        if "pdf_file_id" in body:
            val = str(body["pdf_file_id"]).strip()
            if val:
                update_fields["pdf_file_id"] = val
        
        new_is_draft = body.get("is_draft")
        source_email = str(body.get("source_email", "")).strip()
        
        # Logic: Promotion from Draft to Final
        if not is_in_final and new_is_draft == False:
            # Fetch existing draft data to move
            draft_doc = db.drafts.find_one({"_id": oid, "user_id": g.current_user_id})
            if not draft_doc:
                return jsonify({"error": "Draft not found"}), 404
            
            # Merge updates
            draft_doc.update(update_fields)
            draft_doc["is_draft"] = False
            
            # Set validation_status when finalizing
            if draft_doc.get("ai_created", False):
                draft_doc["validation_status"] = "pending"
            else:
                draft_doc["validation_status"] = "verified"
            
            # Store source email for later validation
            if source_email and not draft_doc.get("source_email"):
                draft_doc["source_email"] = source_email[:10000]
            
            # If finalizing with a pdf_file_id, try to resolve & upload to GCS
            pdf_id = draft_doc.get("pdf_file_id", "")
            if pdf_id and ":" in pdf_id:
                pdf_path, _ = _resolve_generated_pdf({"pdf_file_id": pdf_id})
                if pdf_path and os.path.exists(pdf_path):
                    gcs_path = _upload_to_gcs(pdf_path, g.current_user_id, draft_doc.get("doc_type", ""))
                    if gcs_path:
                        draft_doc["gcs_object_path"] = gcs_path
            
            # Move to documents
            db.documents.insert_one(draft_doc)
            db.drafts.delete_one({"_id": oid})
            print(f"  🚀 Draft promoted to Final: {doc_id} (status: {draft_doc.get('validation_status')})")
            return jsonify(_obj_id_to_str(draft_doc))
        
        # Logic: Demotion from Final (Verified) back to Draft
        # Triggered when user edits a verified trade and clicks "Save Draft"
        if is_in_final and new_is_draft == True:
            # Fetch existing finalized document to move
            final_doc = db.documents.find_one({"_id": oid, "user_id": g.current_user_id})
            if not final_doc:
                return jsonify({"error": "Document not found"}), 404
            
            # Merge updates
            final_doc.update(update_fields)
            final_doc["is_draft"] = True
            
            # Clear stale PDF references — old PDF is now outdated since form data changed
            final_doc.pop("pdf_file_id", None)
            final_doc.pop("gcs_object_path", None)
            
            # Move to drafts
            db.drafts.insert_one(final_doc)
            db.documents.delete_one({"_id": oid})
            print(f"  📝 Verified trade demoted to Draft: {doc_id} (form edited, PDF references cleared)")
            return jsonify(_obj_id_to_str(final_doc))
        
        # Normal update within same collection
        current_coll = db.documents if is_in_final else db.drafts
        update_fields["is_draft"] = bool(new_is_draft) if new_is_draft is not None else (not is_in_final)  # type: ignore[assignment]

        # If already finalized but missing GCS path, upload PDF to cloud storage
        if is_in_final:
            doc = db.documents.find_one({"_id": oid, "user_id": g.current_user_id})
            if doc and not doc.get("gcs_object_path"):
                pdf_id = body.get("pdf_file_id", "") or update_fields.get("pdf_file_id", "")
                if pdf_id and ":" in pdf_id:
                    pdf_path, _ = _resolve_generated_pdf({"pdf_file_id": pdf_id})
                    if pdf_path and os.path.exists(pdf_path):
                        gcs_path = _upload_to_gcs(pdf_path, g.current_user_id, doc.get("doc_type", ""))
                        if gcs_path:
                            update_fields["gcs_object_path"] = gcs_path

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






@app.route("/api/documents/<doc_id>/pdf", methods=["GET"])
@require_auth
def api_serve_document_pdf(doc_id):
    """Serve the stored PDF for a finalized document. Tries temp disk first, then GCS."""
    try:
        db = get_db()
        oid = ObjectId(doc_id)
        doc = db.documents.find_one({"_id": oid, "user_id": g.current_user_id})
        if not doc:
            return jsonify({"error": "Document not found or not finalized"}), 404

        file_id = doc.get("pdf_file_id", "")
        if not file_id:
            return jsonify({"error": "No PDF stored for this document"}), 404

        # 1. Try to resolve from temp disk (recently generated PDFs)
        body = {"pdf_file_id": file_id}
        pdf_path, pdf_filename = _resolve_generated_pdf(body)

        if pdf_path and os.path.exists(pdf_path):
            return _send_pdf(pdf_path)

        # 2. Fallback: try GCS (archived PDFs)
        gcs_path = doc.get("gcs_object_path", "")
        if gcs_path:
            # Derive filename from file_id (job_id:filename) or GCS path
            gcs_filename = pdf_filename
            if not gcs_filename and ":" in file_id:
                gcs_filename = file_id.split(":", 1)[1]
            if not gcs_filename:
                gcs_filename = os.path.basename(gcs_path)
            if not gcs_filename:
                gcs_filename = "document.pdf"

            # Serve directly from backend to avoid CORS issues with cross-origin signed URLs
            pdf_bytes = _download_from_gcs(gcs_path)
            if pdf_bytes:
                return Response(
                    pdf_bytes,
                    mimetype="application/pdf",
                    headers={
                        "Content-Disposition": f"inline; filename={gcs_filename}",
                        "X-TradeDoc-File-Id": file_id,
                    },
                )

            # Fallback: signed URL redirect (requires GCS CORS if consumed by browser)
            signed_url = _generate_gcs_signed_url(gcs_path)
            if signed_url:
                return jsonify({"signed_url": signed_url, "filename": gcs_filename})

        return jsonify({"error": "PDF file not found on disk or in cloud storage — may have been cleaned up"}), 404
    except Exception as e:
        if isinstance(e, InvalidId):
            return jsonify({"error": "Invalid document id"}), 400
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════
# LANGGRAPH ENDPOINT: AI EXTRACT
#   classify email → extract JSON
# ═══════════════════════════════════════════

@app.route("/ai/extract", methods=["POST"])
@require_auth
@limiter.limit("5 per minute")
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
    if generator is None:
        return jsonify({"error": f"{doc_type.upper()} PDF generator not available — module missing from deployment"}), 503
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
        return _generate_pdf_response("fx_ndf", _generate_fx_pdf_direct, trade_data)
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
        return _generate_pdf_response("irs", _generate_irs_pdf_direct, trade_data)
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
        return _generate_pdf_response("cds", _generate_cds_pdf_direct, trade_data)
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
        return _generate_pdf_response("equity_trs", _generate_equity_trs_pdf_direct, trade_data)
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

        # Re-import inside the guarded block so Pylance knows they're bound
        from adobe.pdfservices.operation.auth.service_principal_credentials import ServicePrincipalCredentials as _SC  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdf_services import PDFServices as _PS  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdf_services_media_type import PDFServicesMediaType as _MT  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdfjobs.jobs.export_pdf_job import ExportPDFJob as _EJ  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdfjobs.params.export_pdf.export_pdf_params import ExportPDFParams as _EP  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdfjobs.params.export_pdf.export_pdf_target_format import ExportPDFTargetFormat as _TF  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdfjobs.params.export_pdf.export_ocr_locale import ExportOCRLocale as _OL  # type: ignore[no-redef]
        from adobe.pdfservices.operation.pdfjobs.result.export_pdf_result import ExportPDFResult as _ER  # type: ignore[no-redef]

        credentials = _SC(
            client_id=os.environ.get("PDF_SERVICES_CLIENT_ID"),
            client_secret=os.environ.get("PDF_SERVICES_CLIENT_SECRET"),
        )
        pdf_services = _PS(credentials=credentials)

        with open(pdf_path, "rb") as f:
            input_stream = f.read()

        asset = pdf_services.upload(input_stream=input_stream, mime_type=_MT.PDF)
        export_params = _EP(
            target_format=_TF.DOCX,
            ocr_lang=_OL.EN_US,
        )
        export_job = _EJ(input_asset=asset, export_pdf_params=export_params)
        location = pdf_services.submit(export_job)
        response = pdf_services.get_job_result(location, _ER)

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
@limiter.limit("5 per minute")
def api_validate():
    """
    Accepts email_text + pdf_filename, runs validation agent.
    Compares the generated PDF against the original email.
    If doc_id provided, marks the document as verified after successful validation.
    Supports PDFs from temp disk (pdf_file_id) or GCS (gcs_object_path).
    """
    try:
        if not os.environ.get("GEMINI_API_KEY"):
            return jsonify({"error": "AI service is not configured. Set GEMINI_API_KEY."}), 503
        body = _json_body()
        email_text = body.get("email_text", "")
        pdf_path, pdf_filename = _resolve_generated_pdf(body)

        # If not found on temp disk and gcs_object_path is provided, download from GCS
        if (not pdf_path or not os.path.exists(pdf_path)) and body.get("gcs_object_path"):
            gcs_path = body["gcs_object_path"]
            pdf_bytes = _download_from_gcs(gcs_path)
            if pdf_bytes:
                # Save to a temp location for the validation agent to read
                import tempfile
                user_id = _safe_user_id()
                tmp_dir = os.path.join(tempfile.gettempdir(), "tradedoc_validate", user_id)
                os.makedirs(tmp_dir, exist_ok=True)
                pdf_filename = secure_filename(body.get("pdf_filename", "confirmation.pdf"))
                if not pdf_filename.lower().endswith(".pdf"):
                    pdf_filename += ".pdf"
                pdf_path = os.path.join(tmp_dir, pdf_filename)
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                print(f"  📥 Downloaded PDF from GCS for validation: {pdf_filename}")

        if not pdf_filename:
            return jsonify({"error": "No PDF filename provided"}), 400
        if not email_text.strip():
            return jsonify({"error": "No email text provided for validation"}), 400
        if not pdf_path or not os.path.exists(pdf_path):
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

        # Mark document as verified + store validation report if doc_id provided
        doc_id = body.get("doc_id", "").strip()
        validation_report_text = result.get("validation_report", "")
        if doc_id:
            try:
                db = get_db()
                oid = ObjectId(doc_id)
                db.documents.update_one(
                    {"_id": oid, "user_id": g.current_user_id},
                    {"$set": {
                        "validation_status": "verified",
                        "validation_report": validation_report_text,
                        "updated_at": _iso_now()
                    }}
                )
                print(f"  ✅ Document {doc_id} marked as verified with stored validation report")
            except Exception:
                pass  # Non-critical — validation report still returned

        return jsonify({
            "validation_report": validation_report_text or "No report generated"
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════
# VALIDATION REPORT RETRIEVAL ENDPOINT
# ═══════════════════════════════════════════

@app.route("/api/documents/<doc_id>/validation", methods=["GET"])
@require_auth
def api_get_validation_report(doc_id):
    """Retrieve the stored validation report for a document."""
    try:
        db = get_db()
        oid = ObjectId(doc_id)
        doc = db.documents.find_one({"_id": oid, "user_id": g.current_user_id})
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        report = doc.get("validation_report", "")
        return jsonify({
            "validation_report": report or "",
            "has_report": bool(report and str(report).strip()),
            "validation_status": doc.get("validation_status", "pending")
        })
    except InvalidId:
        return jsonify({"error": "Invalid document id"}), 400
    except Exception as e:
        if isinstance(e, (ServerSelectionTimeoutError, PyMongoError)):
            return _database_error_response(e)
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

    try:
        get_db().command("ping")
        print("  ✅ MongoDB connected successfully")
    except Exception as e:
        print(f"  ⚠️  MongoDB not available: {e}")
        print("  ℹ️  Document saving/loading will fail")
        
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=PORT, debug=DEBUG)
