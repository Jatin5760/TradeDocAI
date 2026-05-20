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
import random
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
from agents.groq_helper import call_groq, call_groq_stream
from agents.gemini_helper import call_gemini  # still used by classifier / extractor / validator

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
        if os.path.exists(GCS_CREDENTIALS_PATH):
            _gcs_client = storage.Client.from_service_account_json(GCS_CREDENTIALS_PATH)  # type: ignore[union-attr]
        else:
            # Cloud Run / no local key: use Application Default Credentials
            print("  🔐 GCS using Application Default Credentials (ADC)")
            _gcs_client = storage.Client()  # type: ignore[union-attr]
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


def _build_chat_prompt(user_msg: str) -> str:
    """Build prompt for global ChatCopilot — stateless, no history."""
    current_time = datetime.now(timezone.utc).strftime("%B %d, %Y")
    prompt = f"You are TradeDoc Copilot, a friendly and knowledgeable AI assistant built into the TradeDoc AI platform. Today's date is {current_time}. "
    prompt += "You specialize in trade confirmation documents for financial derivatives — IRS, CDS, FX NDF, Equity TRS — but you're also happy to help with general questions. "
    prompt += "Be warm, conversational, and genuinely helpful. Provide rich, detailed explanations with examples when relevant. "
    prompt += "Use clean markdown formatting (**bold** for key terms, bullet lists where helpful, ### headings for sections) to make replies beautiful and easy to read. "
    prompt += f"User: {user_msg}\nAssistant:"
    return prompt

# ── Local Form Assistant Helpers ─────────────────────────



def _doc_display_name(doc_type: str) -> str:
    name_map = {
        "fx_ndf": "FX Non-Deliverable Forward (NDF)",
        "irs": "Interest Rate Swap (IRS)",
        "cds": "Credit Default Swap (CDS)",
        "equity_trs": "Equity Total Return Swap (TRS)",
    }
    return name_map.get(doc_type, doc_type.upper())


def _is_value_filled(val: object) -> bool:
    if val is None:
        return False
    if isinstance(val, str):
        return val.strip() != ""
    if isinstance(val, (list, tuple, set)):
        return len(val) > 0
    if isinstance(val, dict):
        return len(val) > 0
    return True


def _matches_show_when(show_when: dict | None, data: dict) -> bool:
    if not show_when:
        return True
    field = show_when.get("field")
    target_val = show_when.get("value")
    operator = show_when.get("operator") or "equal"
    src_val = data.get(field)
    if operator == "not_equal":
        return src_val != target_val
    return src_val == target_val


def _section_is_visible(section: dict, doc_type: str, data: dict) -> bool:
    if not section:
        return False
    if doc_type == "irs":
        exhibits = section.get("show_for_exhibits") or []
        if exhibits and data.get("exhibit") not in exhibits:
            return False
        termination = section.get("show_for_termination")
        if termination and data.get("termination_type") != termination:
            return False
        if not (section.get("always_show") or exhibits or termination):
            return False
    elif doc_type == "equity_trs":
        models = section.get("show_for_models") or []
        if models and data.get("model_type") not in models:
            return False
    if not _matches_show_when(section.get("show_when"), data):
        return False
    return True


def _field_is_visible(field: dict, data: dict) -> bool:
    return _matches_show_when(field.get("show_when"), data)


def _iter_visible_fields(schema: dict, data: dict, doc_type: str):
    sections = schema.get("sections", {})
    if isinstance(sections, list):
        for sec in sections:
            if not _section_is_visible(sec, doc_type, data):
                continue
            sec_title = sec.get("title", sec.get("id", ""))
            for field in sec.get("fields", []) or []:
                if _field_is_visible(field, data):
                    yield sec_title, field
            for sub in sec.get("subsections", []) or []:
                sub_title = sub.get("title", sec_title)
                for field in sub.get("fields", []) or []:
                    if _field_is_visible(field, data):
                        yield sub_title, field
    elif isinstance(sections, dict):
        for sec_key, sec in sections.items():
            if not _section_is_visible(sec, doc_type, data):
                continue
            sec_title = sec.get("title", sec_key)
            for field in sec.get("fields", []) or []:
                if _field_is_visible(field, data):
                    yield sec_title, field
            for sub in sec.get("subsections", []) or []:
                sub_title = sub.get("title", sec_title)
                for field in sub.get("fields", []) or []:
                    if _field_is_visible(field, data):
                        yield sub_title, field





def _nav_friendly_name(action: str) -> str:
    """Map internal action codes to user-friendly page names."""
    names = {
        "landing": "Dashboard",
        "analytics": "Analytics",
        "ai": "AI Extraction",
        "settings-profile": "Settings",
        "settings-preference": "Preferences",
        "settings-password": "Security",
        "my-documents": "My Documents",
        "form-fx_ndf": "FX NDF Form",
        "form-irs": "IRS Form",
        "form-cds": "CDS Form",
        "form-equity_trs": "Equity TRS Form",
    }
    return names.get(action, action.replace("-", " ").title())

_NAV_REPLIES = [
    "Sure, let's go to {page}!",
    "Heading towards {page}.",
    "Launching {page} for you.",
    "Taking you to {page} now.",
    "Opening {page} — one moment.",
    "Right away, navigating to {page}.",
]

def _nav_reply(action: str) -> str:
    return random.choice(_NAV_REPLIES).format(page=_nav_friendly_name(action))


def _extract_chat_action(reply: str, user_msg: str) -> tuple[str, str | None]:
    action = None
    nav_pattern = r"\[NAVIGATE:?\s*([\w\-]+)\]"
    nav_match = re.search(nav_pattern, reply, re.IGNORECASE)

    if nav_match:
        action = nav_match.group(1).lower().strip()
        reply = re.sub(nav_pattern, "", reply, flags=re.IGNORECASE).strip()

    if not action:
        # Only extract nav from reply if the USER explicitly asked for navigation
        nav_intent_phrases = [
            "take me to", "go to", "navigate to", "show me", "open the",
            "i want to go to", "bring me to", "switch to", "take me",
            "create an", "create a", "fill the", "fill a", "start the",
        ]
        user_lower = user_msg.lower()
        user_wants_nav = any(phrase in user_lower for phrase in nav_intent_phrases)

        if user_wants_nav:
            keywords = {
                "landing": "landing", "home": "landing", "dashboard": "landing",
                "analytics": "analytics", "charts": "analytics", "stats": "analytics",
                "ai": "ai", "extraction": "ai", "upload": "ai",
                "settings": "settings-profile", "profile": "settings-profile",
                "preference": "settings-preference", "model": "settings-preference",
                "password": "settings-password", "security": "settings-password",
                "documents": "my-documents", "history": "my-documents",
                "fx ndf": "form-fx_ndf", "irs": "form-irs", "cds": "form-cds",
                "equity trs": "form-equity_trs",
            }
            text_to_check = (reply + " " + user_msg).lower()
            for kw, target in keywords.items():
                if kw in text_to_check:
                    action = target
                    break

    if action:
        nav_only_phrases = ["take me to", "go to", "navigate to", "show me", "open", "switch to", "bring me to", "i want to go to", "create an", "create a", "fill the", "fill a", "start the"]
        is_nav_only = any(p in user_msg.lower() for p in nav_only_phrases) or not reply.strip()
        if is_nav_only and not re.search(r"\?", user_msg):
            reply = _nav_reply(action)

    return reply, action

def _detect_fast_navigation(user_msg: str) -> str | None:
    """Detects explicit navigation commands to save time/cost — only triggers on clear nav intent."""
    msg = user_msg.lower().strip()
    
    # Must contain an explicit navigation phrase
    nav_phrases = ["go to", "open", "show", "switch to", "take me to", "navigate to", "move to",
                   "bring me to", "i want to go to", "create an", "create a", "fill the", "fill a",
                   "start the"]
    has_nav_intent = any(msg.startswith(p) or p in msg for p in nav_phrases)
    
    if not has_nav_intent:
        return None
    
    # Navigation keywords — only form targets use the form- prefix
    keywords = {
        "landing": "landing", "home": "landing", "dashboard": "landing",
        "analytics": "analytics", "charts": "analytics", "stats": "analytics",
        "ai": "ai", "extraction": "ai", "upload": "ai",
        "settings": "settings-profile", "profile": "settings-profile",
        "documents": "my-documents", "history": "my-documents",
        "fx ndf": "form-fx_ndf", "irs": "form-irs", "cds": "form-cds",
        "equity trs": "form-equity_trs",
    }
    
    for kw, target in keywords.items():
        if kw in msg:
            print(f"  ⚡ Fast Navigation Triggered: {target}")
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
    return MONGO_DB_NAME or _mongo_db_name_from_uri(MONGO_URI) or "tradedoc"


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

        # ── Adaptive detail detection (applies to both local and global scope) ──
        msg_lower = user_msg.lower()
        wants_detail = any(kw in msg_lower for kw in [
            "in detail", "detailed", "elaborate", "explain more", "tell me more",
            "examples", "example", "thorough", "deep dive", "break down", "expand",
        ])

        def _max_t(base: int) -> int:
            """Default ~500 words / 700 tokens. Explicit detail ask → ~800 words / 1100 tokens."""
            return 1100 if wants_detail else 700

        # ── Local Scope (ChatSidebar — Groq Llama 4 Scout, no DB, no session) ──
        if scope == "local" and doc_type and schema:
            active_field_key = body.get("active_field_key")
            active_field_label = body.get("active_field_label", "")
            data_context = current_data or {}

            # ── Helper: find a single field by key in the schema ──
            def _find_field_in_schema(schema_obj, field_key):
                if not schema_obj or not field_key:
                    return None
                sections = schema_obj.get("sections", {})
                sec_list = list(sections.values()) if isinstance(sections, dict) else (sections if isinstance(sections, list) else [])
                for sec in sec_list:
                    for f in sec.get("fields", []) or []:
                        if f.get("key") == field_key:
                            return f
                    for sub in sec.get("subsections", []) or []:
                        for f in sub.get("fields", []) or []:
                            if f.get("key") == field_key:
                                return f
                return None

            # ── Helper: build filled-fields JSON for AI context ──
            def _build_filled_context(data: dict) -> dict:
                """Return only filled (non-empty) fields from current_data."""
                filled = {}
                for k, v in data.items():
                    if _is_value_filled(v):
                        # Truncate long values for prompt efficiency
                        val_str = str(v)
                        filled[k] = val_str[:120] + ("…" if len(val_str) > 120 else "")
                return filled

            # ── SSE response helpers ──
            def _reply_local(reply: str, action: str | None = None):
                """Non-streaming JSON response or fake-stream (single-token SSE)."""
                if not stream:
                    return jsonify({"reply": reply, "action": action, "session": None, "message": None})
                # Fake SSE for non-streaming replies
                def _fake_sse():
                    yield f"data: {json.dumps({'token': reply})}\n\n"
                    yield f"data: {json.dumps({'done': True, 'reply': reply, 'action': action})}\n\n"
                return Response(
                    _fake_sse(),
                    mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
                )

            def _groq_stream_response(prompt: str, max_tokens: int = 280):
                """Real SSE token-by-token streaming from Groq."""
                def generate():
                    full_text = ""
                    try:
                        for token in call_groq_stream(prompt, max_tokens=max_tokens, temperature=0.2):
                            full_text += token
                            yield f"data: {json.dumps({'token': token})}\n\n"
                        clean_text, action = _extract_chat_action(full_text, user_msg)
                        yield f"data: {json.dumps({'done': True, 'reply': clean_text, 'action': action})}\n\n"
                    except Exception as e:
                        yield f"data: {json.dumps({'error': str(e)[:200]})}\n\n"
                return Response(
                    generate(),
                    mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
                )

            # ── Intent detection ──
            doc_display = _doc_display_name(doc_type)
            doc_aliases = {
                "fx_ndf": ["fx ndf", "ndf", "fx forward"],
                "irs": ["irs", "interest rate swap"],
                "cds": ["cds", "credit default swap"],
                "equity_trs": ["equity trs", "trs", "total return swap"],
            }
            mentions_doc = any(alias in msg_lower for alias in doc_aliases.get(doc_type, []))

            is_missing_check = any(kw in msg_lower for kw in [
                "what's missing", "whats missing", "what is missing",
                "missing fields", "remaining", "still need", "left to fill",
                "not filled", "empty fields", "what else", "what do i need"
            ])
            is_field_explain = bool(active_field_key) and any(kw in msg_lower for kw in [
                "this field", "field meaning", "field definition", "explain this",
                "explain field", "describe this", "definition", "define",
                "purpose of", "example", "format", "how do i fill",
                "what should i enter", "what should i put"
            ])
            is_common_mistakes = any(kw in msg_lower for kw in [
                "common mistake", "common mistakes", "common error", "typical error",
                "what goes wrong", "common pitfall", "pitfalls", "gotcha",
                "usually wrong", "often mistaken"
            ])
            is_mistake_check = any(kw in msg_lower for kw in [
                "check my entries", "check entries", "review my entries",
                "review", "verify", "validate", "mistake", "errors",
                "wrong", "correct", "any issues", "look over"
            ]) and not is_missing_check and not is_common_mistakes and not is_field_explain
            is_form_overview = any(kw in msg_lower for kw in [
                "what is", "about this form", "overview", "tell me about",
                "summary", "whats this", "what's this", "what is this form"
            ]) and ("form" in msg_lower or mentions_doc) and not is_field_explain and not is_common_mistakes and not is_missing_check and not is_mistake_check
            wants_deep_check = any(kw in msg_lower for kw in ["deep", "detailed", "thorough", "full review", "full check"])

            # ── INTENT: Missing Fields ──
            if is_missing_check:
                filled = _build_filled_context(data_context)
                # Collect required field labels from schema
                required_labels: list[str] = []
                for _, field in _iter_visible_fields(schema, data_context, doc_type):
                    if field.get("required") and not _is_value_filled(data_context.get(field.get("key", ""))):
                        required_labels.append(field.get("label") or field.get("key", ""))
                if not required_labels:
                    return _reply_local("✅ All required fields are filled. You can review optional fields or generate the confirmation.")

                prompt = (
                    f"DOCUMENT: {doc_display}\n"
                    f"FILLED FIELDS: {json.dumps(filled, default=str)}\n"
                    f"REQUIRED FIELDS STILL EMPTY: {', '.join(required_labels[:20])}\n"
                    f"User asks: \"{user_msg}\"\n"
                    f"Use clean markdown (**bold** for section names, bullet lists for fields). "
                    f"Group remaining fields by section. "
                    f"If only 1-2 fields remain, make it encouraging: \"Almost done! Just fill in...\" "
                    f"Be friendly and helpful — explain what each remaining field means briefly. Do NOT mention filled fields."
                )
                if stream:
                    return _groq_stream_response(prompt, max_tokens=_max_t(180))
                reply = call_groq(prompt, max_tokens=_max_t(180))
                reply, _ = _extract_chat_action(reply, user_msg)
                return _reply_local(reply)

            # ── INTENT: Mistake Check ("Am I correct?") ──
            if is_mistake_check:
                filled = _build_filled_context(data_context)
                if not filled:
                    return _reply_local("You haven't filled any fields yet. Start filling in the form and I'll review your entries.")

                prompt = (
                    f"DOCUMENT: {doc_display}\n"
                    f"FILLED FIELDS: {json.dumps(filled, default=str)}\n"
                    f"User asks: \"{user_msg}\"\n"
                    f"Review ONLY the filled fields above. Point out: wrong dates, nonsense values, "
                    f"inconsistent entries, type mismatches. Be specific — mention field names. "
                    f"Use clean markdown (**bold** for field names, bullet lists for issues). "
                    f"For each issue found, briefly explain why it might be wrong and suggest the correct format. "
                    f"If no issues, end with: \"**No obvious issues found** — everything looks good.\""
                )
                if stream:
                    return _groq_stream_response(prompt, max_tokens=_max_t(280))
                reply = call_groq(prompt, max_tokens=_max_t(280))
                reply, action = _extract_chat_action(reply, user_msg)
                return _reply_local(reply, action)

            # ── INTENT: Field Explain ──
            if is_field_explain and active_field_key:
                resolved_field = _find_field_in_schema(schema, active_field_key)
                field_label = active_field_label or (resolved_field.get("label") if resolved_field else active_field_key)
                field_type = resolved_field.get("type", "text") if resolved_field else "text"
                options = resolved_field.get("options", []) if resolved_field else []

                prompt = (
                    f"DOCUMENT: {doc_display}\n"
                    f"FIELD: {field_label} (key: {active_field_key}) — type: {field_type}"
                    + (f", options: {json.dumps(options)[:200]}" if options else "")
                    + f"\nUser asks: \"{user_msg}\"\n"
                    f"Use clean markdown (**bold** for key terms, bullet lists). "
                    f"Include: meaning, a real-world example, and a practical tip. "
                    f"If select field, ALWAYS identify and recommend the best matching option from the list. "
                    f"Never say you're not aware — pick the closest one. Be conversational and helpful."
                )
                if stream:
                    return _groq_stream_response(prompt, max_tokens=_max_t(120))
                reply = call_groq(prompt, max_tokens=_max_t(120))
                reply, _ = _extract_chat_action(reply, user_msg)
                return _reply_local(reply)

            # ── INTENT: Common Mistakes ──
            if is_common_mistakes:
                prompt = (
                    f"DOCUMENT: {doc_display}\n"
                    f"User asks: \"{user_msg}\"\n"
                    f"Use clean markdown (**bold** for warnings, bullet lists for each mistake). "
                    f"Be specific with real examples and explain the consequence of each mistake."
                )
                if stream:
                    return _groq_stream_response(prompt, max_tokens=_max_t(200))
                reply = call_groq(prompt, max_tokens=_max_t(200))
                reply, _ = _extract_chat_action(reply, user_msg)
                return _reply_local(reply)

            # ── INTENT: Form Overview ──
            if is_form_overview:
                prompt = (
                    f"DOCUMENT: {doc_display}\n"
                    f"User asks: \"{user_msg}\"\n"
                    f"Use clean markdown (**bold** for key concepts, bullet lists for examples). "
                    f"Explain what this document is, where it's used in the financial world, "
                    f"and give real examples. Be engaging and informative."
                )
                if stream:
                    return _groq_stream_response(prompt, max_tokens=_max_t(150))
                reply = call_groq(prompt, max_tokens=_max_t(150))
                reply, _ = _extract_chat_action(reply, user_msg)
                return _reply_local(reply)

            # ── Generic / Casual Chat ──
            from agents.assistant_agent import build_casual_chat_prompt
            prompt = build_casual_chat_prompt(doc_type, user_msg)

            if stream:
                return _groq_stream_response(prompt, max_tokens=_max_t(250))

            reply = call_groq(prompt, max_tokens=_max_t(250))
            reply, action = _extract_chat_action(reply, user_msg)
            return _reply_local(reply, action)

        # ── Global Scope (ChatCopilot — stateless, no DB, no session, no history) ──
        prompt = _build_chat_prompt(user_msg)

        reply = call_groq(prompt, max_tokens=_max_t(500))

        return jsonify({
            "reply": reply,
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

        # Try to resolve & upload to GCS (for both drafts and finals)
        gcs_object_path = None
        if pdf_file_id and ":" in pdf_file_id:
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
        # Set validation_status: All final documents start as pending until they are signed
        if not is_draft:
            doc["validation_status"] = "pending"
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
            
            # Set validation_status when finalizing: all finalized docs start as pending until they are signed
            draft_doc["validation_status"] = "pending"
            
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

        # If missing GCS path, upload PDF to cloud storage (for both drafts and documents)
        doc = current_coll.find_one({"_id": oid, "user_id": g.current_user_id})
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


def _stamp_signature_to_pdf(input_pdf_path, output_pdf_path, signature_base64_str, user_name):
    import io
    import base64
    from datetime import datetime, timezone, timedelta
    from PIL import Image
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader

    if "," in signature_base64_str:
        signature_base64_str = signature_base64_str.split(",", 1)[1]

    img_data = base64.b64decode(signature_base64_str)
    img = Image.open(io.BytesIO(img_data))

    reader = PdfReader(input_pdf_path)
    writer = PdfWriter()

    num_pages = len(reader.pages)
    if num_pages == 0:
        raise ValueError("Cannot sign an empty PDF")

    last_page_idx = num_pages - 1
    last_page = reader.pages[last_page_idx]
    page_width = float(last_page.mediabox.width)
    page_height = float(last_page.mediabox.height)

    # Signature box coordinates (bottom right signature area)
    sig_w = 120
    sig_h = 45
    sig_x = page_width - sig_w - 60
    sig_y = 65

    # Generate signature overlay PDF page using reportlab
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(page_width, page_height))
    # Draw signature image on the canvas using ImageReader wrapper
    img_reader = ImageReader(img)
    can.drawImage(img_reader, sig_x, sig_y, sig_w, sig_h, mask='auto')

    # Draw metadata labels
    can.setFont("Helvetica-Bold", 8)
    can.setFillColorRGB(0.1, 0.1, 0.4)  # Dark Blue
    can.drawString(sig_x, sig_y + sig_h + 5, "Digitally Signed By:")

    can.setFont("Helvetica", 8)
    can.setFillColorRGB(0.3, 0.3, 0.3)  # Slate Gray
    can.drawString(sig_x, sig_y + sig_h - 5, user_name)
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)
    can.drawString(sig_x, sig_y - 12, now_ist.strftime("%d-%b-%Y %I:%M %p IST"))

    can.save()
    packet.seek(0)
    sig_reader = PdfReader(packet)
    sig_page = sig_reader.pages[0]

    # Copy pages to writer
    for i in range(num_pages):
        page = reader.pages[i]
        if i == last_page_idx:
            page.merge_page(sig_page)
        writer.add_page(page)

    with open(output_pdf_path, "wb") as f:
        writer.write(f)


@app.route("/api/documents/<doc_id>/sign", methods=["POST"])
@require_auth
def api_sign_document(doc_id):
    """Stamp digital signature on the last page of a trade confirmation PDF."""
    try:
        db = get_db()
        oid = ObjectId(doc_id)
        doc = db.documents.find_one({"_id": oid, "user_id": g.current_user_id})
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        if doc.get("signed"):
            return jsonify({"error": "Document is already signed"}), 400

        body = _json_body()
        signature_data = body.get("signature_data", "")
        if not signature_data:
            return jsonify({"error": "Missing signature_data"}), 400

        file_id = doc.get("pdf_file_id", "")
        if not file_id:
            return jsonify({"error": "No PDF stored for this document"}), 400

        body_pdf = {"pdf_file_id": file_id}
        pdf_path, pdf_filename = _resolve_generated_pdf(body_pdf)

        # If not cached locally, pull from GCS first
        if not pdf_path or not os.path.exists(pdf_path):
            gcs_path = doc.get("gcs_object_path", "")
            if not gcs_path:
                return jsonify({"error": "PDF file not cached locally and no cloud backup found"}), 404

            pdf_bytes = _download_from_gcs(gcs_path)
            if not pdf_bytes:
                return jsonify({"error": "Failed to retrieve PDF file from cloud backup"}), 404

            user_id = g.current_user_id
            if file_id and ":" in file_id:
                job_id, filename = file_id.split(":", 1)
                job_id = secure_filename(job_id)
                job_dir = os.path.join(TEMP_PDF_DIR, user_id, job_id)
                os.makedirs(job_dir, exist_ok=True)
                pdf_path = os.path.join(job_dir, filename)
            else:
                job_dir = os.path.join(TEMP_PDF_DIR, user_id, "temp_downloads")
                os.makedirs(job_dir, exist_ok=True)
                pdf_path = os.path.join(job_dir, "document.pdf")

            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)

        user = db.users.find_one({"_id": ObjectId(g.current_user_id)})
        user_name = user.get("name", "Authorized Signatory") if user else "Authorized Signatory"

        temp_signed_path = pdf_path + ".signed"
        _stamp_signature_to_pdf(pdf_path, temp_signed_path, signature_data, user_name)

        # Replace original cached file
        shutil.move(temp_signed_path, pdf_path)

        # Overwrite GCS version if available
        gcs_object_path = doc.get("gcs_object_path", "")
        if GCS_AVAILABLE and gcs_object_path:
            _upload_to_gcs(pdf_path, g.current_user_id, doc.get("doc_type", ""))

        # Update DB document status
        now = datetime.now(timezone.utc).isoformat()
        db.documents.update_one(
            {"_id": oid},
            {"$set": {
                "signed": True,
                "signed_at": now,
                "validation_status": "verified",
                "updated_at": now
            }}
        )

        return jsonify({
            "status": "success",
            "pdf_url": f"/api/documents/{doc_id}/pdf?t={int(time.time())}"
        })

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
# WORKFLOW EXECUTION / EMAIL SENDING ENDPOINT
# ═══════════════════════════════════════════

@app.route("/api/workflow/execute", methods=["POST"])
@require_auth
def api_execute_workflow():
    """Execute the visual workflow, calling Groq to draft an email and sending it via SMTP."""
    try:
        body = _json_body()
        input_text = body.get("input_text", "")
        prompt = body.get("prompt", "")
        recipient_emails = body.get("recipients", [])
        pdf_file_id = body.get("pdf_file_id", "")
        pdf_filename = body.get("pdf_filename", "")

        custom_sender = body.get("custom_sender", {})
        
        # 1. Resolve SMTP credentials
        custom_pwd = custom_sender.get("smtp_password")
        if custom_pwd:
            # Full custom SMTP login
            smtp_host = custom_sender.get("smtp_host") or "smtp.gmail.com"
            try:
                smtp_port = int(custom_sender.get("smtp_port") or "587")
            except ValueError:
                smtp_port = 587
            smtp_user = custom_sender.get("smtp_user")
            smtp_password = custom_pwd
            smtp_from_name = custom_sender.get("smtp_from_name") or "TradeDoc AI Operations"
            reply_to_email = smtp_user
        else:
            # Use default system SMTP credentials, but customize from/reply-to headers
            smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
            try:
                smtp_port = int(os.environ.get("SMTP_PORT", "587"))
            except ValueError:
                smtp_port = 587
            smtp_user = os.environ.get("SMTP_USER")
            smtp_password = os.environ.get("SMTP_PASSWORD")
            
            custom_name = custom_sender.get("smtp_from_name")
            custom_email = custom_sender.get("smtp_user")
            
            if custom_name and custom_email:
                smtp_from_name = f"{custom_name} ({custom_email})"
            elif custom_name:
                smtp_from_name = custom_name
            elif custom_email:
                smtp_from_name = f"TradeDoc Operations ({custom_email})"
            else:
                smtp_from_name = os.environ.get("SMTP_FROM_NAME", "TradeDoc AI Operations")
                
            reply_to_email = custom_email or smtp_user

        if not smtp_user or not smtp_password:
            return jsonify({"error": "SMTP credentials (user/password) not configured in .env or custom sender node"}), 400

        if not recipient_emails:
            return jsonify({"error": "No recipient emails provided"}), 400

        # 2. Resolve PDF if provided
        pdf_path = None
        pdf_display_name = "trade_confirmation.pdf"
        
        if pdf_file_id:
            doc = None
            try:
                # Check if it looks like a 24-character hex ObjectId
                if len(pdf_file_id) == 24 and all(c in "0123456789abcdefABCDEF" for c in pdf_file_id):
                    doc = get_db().documents.find_one({"_id": ObjectId(pdf_file_id), "user_id": g.current_user_id})
            except Exception:
                pass
                
            if doc:
                # Resolve from document metadata
                real_file_id = doc.get("pdf_file_id")
                gcs_path = doc.get("gcs_object_path")
                doc_name = doc.get("summary", "trade_confirmation")
                
                if not doc_name.lower().endswith(".pdf"):
                    pdf_display_name = secure_filename(doc_name) + ".pdf"
                else:
                    pdf_display_name = secure_filename(doc_name)
                
                # Check local disk
                if real_file_id:
                    resolved_path, resolved_name = _resolve_generated_pdf({"pdf_file_id": real_file_id})
                    if resolved_path and os.path.exists(resolved_path):
                        pdf_path = resolved_path
                
                # Download from GCS if not present locally
                if not pdf_path and gcs_path:
                    print(f"  ☁️  Downloading selected PDF from GCS: {gcs_path}")
                    pdf_bytes = _download_from_gcs(gcs_path)
                    if pdf_bytes:
                        temp_job_dir = os.path.join(TEMP_PDF_DIR, g.current_user_id, "workflow_downloads")
                        os.makedirs(temp_job_dir, exist_ok=True)
                        temp_pdf_path = os.path.join(temp_job_dir, pdf_display_name)
                        with open(temp_pdf_path, "wb") as f:
                            f.write(pdf_bytes)
                        pdf_path = temp_pdf_path
                        print(f"  ✅ Cached GCS PDF locally at: {pdf_path}")
            else:
                # Fallback to legacy string check
                resolved_path, resolved_name = _resolve_generated_pdf({"pdf_file_id": pdf_file_id, "pdf_filename": pdf_filename})
                if resolved_path:
                    pdf_path = resolved_path
                    pdf_display_name = resolved_name
        elif pdf_filename:
            resolved_path, resolved_name = _resolve_generated_pdf({"pdf_filename": pdf_filename})
            if resolved_path:
                pdf_path = resolved_path
                pdf_display_name = resolved_name
        
        # 3. Call Groq to generate a professional email body
        groq_prompt = (
            "You are a professional operations officer at a financial institution drafting a trade confirmation email. "
            f"Write a highly professional and polite email using the following instructions: '{prompt}'.\n"
            f"Here is the context or source details of the trade/email:\n---\n{input_text}\n---\n"
            "Generate only the email body. Make sure the email sounds polite, professional, and clear. Do not include subject lines in the output content itself, just the email body starting with a professional salutation and ending with a professional sign-off (leave placeholders for names if not known)."
        )
        email_body = call_groq(groq_prompt, max_tokens=1000, temperature=0.3)

        # 4. Construct professional HTML Email and Send
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.base import MIMEBase
        from email import encoders

        success_count = 0
        failed_recipients = []

        for recipient in recipient_emails:
            recipient = recipient.strip()
            if not recipient:
                continue
            
            # Create message container
            msg = MIMEMultipart("related")
            msg["Subject"] = f"Trade Confirmation Document: {(pdf_display_name or '').replace('.pdf', '')}"
            msg["From"] = f"{smtp_from_name} <{smtp_user}>"
            msg["To"] = recipient
            if reply_to_email:
                msg["Reply-To"] = reply_to_email

            # Build HTML body
            email_body_html = email_body.replace('\n', '<br>')
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {{
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                  color: #334155;
                  background-color: #ffffff;
                  margin: 0;
                  padding: 0;
                  -webkit-font-smoothing: antialiased;
                }}
                .container {{
                  width: 100%;
                  margin: 0;
                  background-color: #ffffff;
                  overflow: hidden;
                }}
                .header {{
                  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #4f46e5 100%);
                  padding: 55px 30px;
                  text-align: center;
                  color: #ffffff;
                  border-bottom: 4px solid #6366f1;
                  width: 100%;
                  box-sizing: border-box;
                }}
                .content {{
                  max-width: 650px;
                  margin: 0 auto;
                  padding: 45px 24px;
                  line-height: 1.8;
                  font-size: 15px;
                  color: #1e293b;
                }}
                .footer {{
                  max-width: 650px;
                  margin: 0 auto;
                  padding: 30px 24px;
                  text-align: center;
                  font-size: 11px;
                  color: #94a3b8;
                  border-top: 1px solid #f1f5f9;
                  letter-spacing: 0.02em;
                }}
                .attachment-box {{
                  margin-top: 30px;
                  padding: 18px;
                  background-color: #f8fafc;
                  border: 1.5px dashed #cbd5e1;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #818cf8; margin-bottom: 8px;">Automated Operations Portal</div>
                  <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">TradeDoc AI</h1>
                  <div style="font-size: 13px; color: #cbd5e1; margin-top: 6px; font-weight: 500;">Secure Trade Confirmation Service</div>
                </div>
                <div class="content">
                  <div style="font-family: inherit; font-size: 15px; color: #334155;">
                    {email_body_html}
                  </div>
                  
                  {f'''
                  <div class="attachment-box">
                    <span style="font-size: 28px; vertical-align: middle;">📄</span>
                    <div style="display: inline-block; vertical-align: middle; margin-left: 8px;">
                      <strong style="color: #0f172a; font-size: 14px;">{pdf_display_name}</strong><br>
                      <span style="color: #64748b; font-size: 12px;">Trade Confirmation PDF attached. Please review and sign.</span>
                    </div>
                  </div>
                  ''' if pdf_path else ''}
                </div>
                <div class="footer">
                  This is an automated trade confirmation notification generated securely by TradeDoc AI.<br>
                  &copy; {datetime.now().year} TradeDoc AI. All rights reserved.
                </div>
              </div>
            </body>
            </html>
            """
            
            msg_alternative = MIMEMultipart("alternative")
            msg.attach(msg_alternative)

            # Plain text fallback
            text_part = MIMEText(email_body, "plain")
            msg_alternative.attach(text_part)

            # HTML part
            html_part = MIMEText(html_content, "html")
            msg_alternative.attach(html_part)

            # Attach PDF if available
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={pdf_display_name}",
                    )
                    msg.attach(part)

            # Send email
            try:
                if smtp_port == 465:
                    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
                else:
                    server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, recipient, msg.as_string())
                server.quit()
                success_count += 1
            except Exception as mail_err:
                traceback.print_exc()
                failed_recipients.append({"recipient": recipient, "error": str(mail_err)})

        return jsonify({
            "status": "complete",
            "success_count": success_count,
            "failed_recipients": failed_recipients,
            "email_draft": email_body
        }), 200

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

    try:
        get_db().command("ping")
        print("  ✅ MongoDB connected successfully")
    except Exception as e:
        print(f"  ⚠️  MongoDB not available: {e}")
        print("  ℹ️  Document saving/loading will fail")
        
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=PORT, debug=DEBUG)
