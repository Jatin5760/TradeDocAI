"""
Groq Helper — thin wrapper around the Groq SDK for local form assistant (ChatSidebar).

Model: Llama 4 Scout 17B (meta-llama/llama-4-scout-17b-16e-instruct)
Free tier: 30K TPM, 500K TPD — more than enough for hackathon demo scale.

No retries, no fallback models, no cache — Groq LPU inference is fast & reliable.
"""

from groq import Groq
import os

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _get_client() -> Groq:
    """Create a Groq client from the GROQ_API_KEY env var."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set")
    return Groq(api_key=api_key)


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
    return response.choices[0].message.content.strip()


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