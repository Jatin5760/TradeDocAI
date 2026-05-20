"""
Gemini API Helper
===================
Shared helper for calling Gemini using the google-genai SDK.
Uses gemini-2.5-pro — higher quality than Flash, available on paid keys.

The API key is loaded from a .env file in the project root.
See .env.example for the expected format.
"""

import os
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load .env from project root (two levels up from this file: agents/ → project root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")

MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
_client = None


def _get_client():
    global _client
    if _client is None:
        use_vertex = os.getenv("USE_VERTEX_AI", "true").lower() == "true"
        if use_vertex:
            # Use explicit credentials file if present (local dev), otherwise fall back to ADC (Cloud Run)
            local_creds = _PROJECT_ROOT / "gcs-service-account.json"
            if local_creds.exists():
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(local_creds)
            project_id = os.getenv("GCP_PROJECT_ID", "gen-lang-client-0887590510")
            location = os.getenv("GCP_LOCATION", "us-central1")
            print(f"🔌 Connecting to Gemini via Vertex AI (Project: {project_id})")
            _client = genai.Client(
                vertexai=True,
                project=project_id,
                location=location
            )
        else:
            api_key = os.getenv("GEMINI_API_KEY", "")
            if not api_key:
                raise RuntimeError("GEMINI_API_KEY is not set. AI Studio client cannot start.")
            _client = genai.Client(api_key=api_key)
    return _client



def call_gemini(prompt: str, max_retries: int = 5, model_name: str | None = None, generation_config: dict | None = None, thinking_level: str | None = None) -> str:
    """
    Call Gemini for text-only tasks.
    Returns the response text.
    Handles rate limits (429) and high demand (503) with retries and fallback.
    
    generation_config: optional dict with keys like temperature, max_output_tokens,
                       response_mime_type (e.g. "application/json").
    """
    primary_model = model_name or MODEL
    use_vertex = os.getenv("USE_VERTEX_AI", "true").lower() == "true"
    if use_vertex and primary_model == "gemini-flash-latest":
        primary_model = "gemini-3.5-flash"
        
    fallback_default = "gemini-3.5-flash" if use_vertex else "gemini-flash-latest"
    fallback_model = fallback_default if ("2.0" in primary_model or "2.5" in primary_model or "3.0" in primary_model or "3.1" in primary_model or "3.5" in primary_model or "pro" in primary_model) else None
    
    # Build GenerateContentConfig
    config_dict = generation_config.copy() if generation_config else {}
    if "3." in primary_model and "thinking_config" not in config_dict and thinking_level:
        tl = getattr(types.ThinkingLevel, thinking_level, None)
        if tl:
            config_dict["thinking_config"] = types.ThinkingConfig(thinking_level=tl)
        
    config = types.GenerateContentConfig(**config_dict) if config_dict else None
    
    for attempt in range(max_retries):
        use_model = primary_model
        # Use fallback if primary is failing
        if attempt >= 2 and fallback_model:
            use_model = fallback_model

        try:
            response = _get_client().models.generate_content(
                model=use_model,
                contents=prompt,
                config=config
            )
            return (response.text or "").strip()
        except Exception as e:
            error_str = str(e).upper()
            # Catching 503, 429, 500, etc.
            is_retryable = any(msg in error_str for msg in ["429", "503", "500", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "SERVICE_UNAVAILABLE", "DEADLINE_EXCEEDED"])
            
            if is_retryable and attempt < max_retries - 1:
                wait = (attempt + 1) * 2
                print(f"  ⏳ Gemini {use_model} busy/error — retrying in {wait}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
            else:
                print(f"  ❌ Gemini Error: {error_str}")
                raise e

    raise Exception("Gemini API could not fulfill the request after all retries.")


def call_gemini_stream(prompt: str, model_name: str | None = None, generation_config: dict | None = None, max_retries: int = 2):
    """
    Call Gemini for text-only tasks with streaming — yields each token chunk
    immediately from the API for real-time ChatGPT-like typing effect.
    Retries on 503/429 with brief waits.
    
    Yields:
        str chunks as they arrive from Gemini (typically 1-5 tokens each).
    """
    import time as _time
    use_model = model_name or MODEL
    # Cap output tokens for speed — local chat responses should be short
    gc = generation_config or {}
    gc.setdefault("max_output_tokens", 200)
    config = types.GenerateContentConfig(**gc)
    
    for attempt in range(max_retries):
        try:
            stream = _get_client().models.generate_content_stream(
                model=use_model,
                contents=prompt,
                config=config
            )
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
            return  # success — exit retry loop
        except Exception as e:
            error_str = str(e).upper()
            is_retryable = any(msg in error_str for msg in ["429", "503", "500", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])
            if is_retryable and attempt < max_retries - 1:
                wait = (attempt + 1) * 1.5
                print(f"  ⏳ Gemini Stream retry in {wait}s (attempt {attempt+1})")
                _time.sleep(wait)
            else:
                print(f"  ❌ Gemini Stream Error: {e}")
                yield f"[Error: {str(e)[:100]}]"


def call_gemini_with_pdf(prompt: str, pdf_path: str, max_retries: int = 3, model_name: str | None = None, thinking_level: str | None = None) -> str:
    """
    Call Gemini with a PDF file.
    Handles high demand (503) and rate limits (429) with retries and fallback.
    """
    primary_model = model_name or MODEL
    use_vertex = os.getenv("USE_VERTEX_AI", "true").lower() == "true"
    if use_vertex and primary_model == "gemini-flash-latest":
        primary_model = "gemini-3.5-flash"
        
    fallback_default = "gemini-3.5-flash" if use_vertex else "gemini-flash-latest"
    fallback_model = fallback_default if ("2.0" in primary_model or "2.5" in primary_model or "3.0" in primary_model or "3.1" in primary_model or "3.5" in primary_model or "pro" in primary_model) else None
    
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
 
    contents = [
        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
        prompt
    ]
 
    for attempt in range(max_retries):
        use_model = primary_model
        if attempt == max_retries - 1 and fallback_model:
            use_model = fallback_model
            print(f"  🔄 Multimodal: Falling back to {use_model}...")
 
        try:
            config = None
            if "3." in use_model and thinking_level:
                tl = getattr(types.ThinkingLevel, thinking_level, None)
                if tl:
                    config = types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(thinking_level=tl)
                    )
            response = _get_client().models.generate_content(
                model=use_model,
                contents=contents,
                config=config
            )
            return (response.text or "").strip()
        except Exception as e:
            error_str = str(e).upper()
            is_retryable = any(msg in error_str for msg in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "SERVICE_UNAVAILABLE"])
            
            if is_retryable and attempt < max_retries - 1:
                wait = (attempt + 1) * 2
                if "429" in error_str: wait = (2 ** attempt) * 5
                print(f"  ⏳ Multimodal busy — retrying in {wait}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
            else:
                print(f"  ❌ Multimodal Error: {error_str}")
                raise e

    raise Exception("Gemini Multimodal API failed after all retries.")
