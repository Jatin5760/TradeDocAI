"""
Groq Helper — thin wrapper around the Groq SDK for local form assistant (ChatSidebar).

Model: Llama 4 Scout 17B (meta-llama/llama-4-scout-17b-16e-instruct)
Free tier: 30K TPM, 500K TPD per key — 5 keys for high-volume round-robin.

Round-robin key rotation across GROQ_API_KEY_1..5 to spread rate limits.
Thread-safe via a simple lock + counter.
"""

from groq import Groq
import os
import threading

MODEL = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

# ── Round-robin key pool ────────────────────────────────────
_MAX_KEYS = 5
_keys: list[str] = []
_lock = threading.Lock()
_counter = 0

for i in range(1, _MAX_KEYS + 1):
    key = os.getenv(f"GROQ_API_KEY_{i}")
    if key:
        _keys.append(key)

if not _keys:
    raise RuntimeError(
        "No GROQ_API_KEY_1..5 environment variables are set. "
        "At least one key is required."
    )


def _get_client() -> Groq:
    """Create a Groq client using the next key in round-robin order."""
    global _counter
    with _lock:
        key = _keys[_counter % len(_keys)]
        _counter += 1
    return Groq(api_key=key)


def call_groq(
    prompt: str,
    max_tokens: int = 280,
    temperature: float = 0.2,
) -> str:
    """Non-streaming Groq call. Returns the full response text."""
    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    content = response.choices[0].message.content
    return content.strip() if content else ""


def call_groq_stream(
    prompt: str,
    max_tokens: int = 280,
    temperature: float = 0.2,
):
    """Streaming Groq call. Buffers 2-3 words before yielding each chunk
    for a smoother, more natural typing animation on the frontend."""
    stream = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    )
    buffer = ""
    word_target = 2  # yield after accumulating 2 words, then aim for 2-3
    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            buffer += content
            spaces = buffer.count(" ")
            if spaces >= word_target:
                yield buffer
                buffer = ""
                word_target = 2  # batch next 2-3 words
            elif "\n" in buffer:
                yield buffer
                buffer = ""
                word_target = 2
    if buffer:
        yield buffer