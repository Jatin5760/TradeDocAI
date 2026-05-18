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
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set. AI endpoints are unavailable until it is configured.")
    if _client is None:
        _client = genai.Client(api_key=api_key)
    return _client


def call_gemini(prompt: str, max_retries: int = 5, model_name: str | None = None, generation_config: dict | None = None) -> str:
    """
    Call Gemini for text-only tasks.
    Returns the response text.
    Handles rate limits (429) and high demand (503) with retries and fallback.
    
    generation_config: optional dict with keys like temperature, max_output_tokens,
                       response_mime_type (e.g. "application/json").
    """
    primary_model = model_name or MODEL
    # If the primary is a 2.x model, fallback to gemini-flash-latest if busy
    fallback_model = "gemini-flash-latest" if ("2.0" in primary_model or "2.5" in primary_model) else None
    
    # Build GenerateContentConfig if generation params provided
    config = types.GenerateContentConfig(**generation_config) if generation_config else None
    
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


def call_gemini_stream(prompt: str, model_name: str | None = None, generation_config: dict | None = None):
    """
    Call Gemini for text-only tasks with streaming — buffers 2-3 words per chunk
    for smooth, fast SSE that feels like ChatGPT.
    
    Yields:
        str chunks of 2-3 words each, or full lines on newline.
    """
    use_model = model_name or MODEL
    config = types.GenerateContentConfig(**generation_config) if generation_config else None
    
    try:
        stream = _get_client().models.generate_content_stream(
            model=use_model,
            contents=prompt,
            config=config
        )
        buffer = ""
        word_target = 0
        for chunk in stream:
            if chunk.text:
                buffer += chunk.text
                spaces = buffer.count(" ")
                if spaces >= word_target:
                    yield buffer
                    buffer = ""
                    word_target = 2  # batch 2-3 words
                elif "\n" in buffer:
                    yield buffer
                    buffer = ""
                    word_target = 2
        if buffer:
            yield buffer
    except Exception as e:
        print(f"  ❌ Gemini Stream Error: {e}")
        yield f"[Error: {str(e)[:100]}]"


def call_gemini_with_pdf(prompt: str, pdf_path: str, max_retries: int = 3, model_name: str | None = None) -> str:
    """
    Call Gemini with a PDF file.
    Handles high demand (503) and rate limits (429) with retries and fallback.
    """
    primary_model = model_name or MODEL
    fallback_model = "gemini-flash-latest" if ("2.0" in primary_model or "2.5" in primary_model) else None
    
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
            response = _get_client().models.generate_content(
                model=use_model,
                contents=contents
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
