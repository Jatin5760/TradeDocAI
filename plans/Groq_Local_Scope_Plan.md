# Groq Migration Plan — Local Form Assistant (ChatSidebar)

**Date:** 2026-05-19  
**Scope:** `scope="local"` in `/api/chat` (ChatSidebar form assistant)  
**What stays:** Global chatbot (`scope="global"`), extraction, classification, validation — all Gemini  
**What changes:** Local form assistant → Groq Llama 4 Scout 17B

---

## Files Changed

| # | File | Action | Lines |
|---|---|---|---|
| 1 | [`agents/groq_helper.py`](agents/groq_helper.py) | **NEW** — Groq SDK wrapper | ~40 |
| 2 | [`server.py`](server.py) | Remove Gemini cruft + add Groq in local scope | ~100 removed, ~80 added |
| 3 | [`requirements.txt`](requirements.txt) | Add `groq>=0.9` | 1 line |
| 4 | `.env.example` | Add `GROQ_API_KEY` | 3 lines |
| 5 | [`agents/system_health_check.py`](agents/system_health_check.py:117) | Update chatbot test to use Groq (optional) | ~5 lines |

---

## Step 1: `agents/groq_helper.py` (NEW)

Simple wrapper — no retries, no fallback, no cache. Groq is reliable.

```python
from groq import Groq
import os

MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

def _get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def call_groq(prompt: str, max_tokens: int = 280, temperature: float = 0.2) -> str:
    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()

def call_groq_stream(prompt: str, max_tokens: int = 280, temperature: float = 0.2):
    stream = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

---

## Step 2: `server.py` — What to Remove

### Remove these functions entirely:
- `_local_cache_get` (line 446-453)
- `_local_cache_set` (line 456-457)
- `_format_bullets` (line 547-554)
- `_collect_missing_required` (line 557-564)
- `_collect_validation_issues` (line 567-612)
- `_local_stream_reply` (line 615-617)

### Remove these variables/imports:
- `_LOCAL_ASSISTANT_CACHE` dict
- `_LOCAL_ASSISTANT_CACHE_TTL_SECONDS`
- `from agents.gemini_helper import call_gemini, call_gemini_stream` (line 74)

### Keep these (still needed):
- `_is_value_filled` — used by field checks
- `_matches_show_when` — used by `_iter_visible_fields`
- `_section_is_visible` — used by `_iter_visible_fields`
- `_iter_visible_fields` — used in prompt building
- `_extract_chat_action` — keep for navigation (Groq will output `[NAVIGATE:page]`)

---

## Step 3: `server.py` — Rewrite Local Scope (lines 1122-1323)

Clean rewrite: intent detection stays same → each intent builds one prompt → one Groq call.

### New Prompt Templates

**Missing Fields:**
```
DOCUMENT: {doc_name}
FILLED FIELDS: {filled_json}
SCHEMA REQUIRED FIELDS: {required_list}
User: "{message}"
List which required fields are still empty. Group by section. 70 words max.
```

**Mistake Check ("Am I correct?"):**
```
DOCUMENT: {doc_name}
FILLED FIELDS: {filled_json}
User asks: "{message}"
Review ONLY the filled fields above. Point out: wrong dates, nonsense values,
inconsistent entries, type mismatches. Be specific — mention field names.
Max 150 words. If everything looks fine, say so briefly.
```

**Field Explain:**
```
DOCUMENT: {doc_name}
FIELD: {label} ({key}) — type: {type}, options: {options}
User asks: "{message}"
Explain this field in 1-2 short sentences. Give one example value. 50 words max.
```

**Common Mistakes:**
```
DOCUMENT: {doc_name}
User asks: "{message}"
List 3-4 common mistakes for this document type. Be specific with examples.
Use bullet points. 100 words max.
```

**Form Overview:**
```
DOCUMENT: {doc_name}
User asks: "{message}"
Give a short overview of this document — what it is, key sections, and purpose.
3-4 sentences. 70 words max.
```

**Casual Chat:**
```
You are TradeDoc AI Assistant — friendly, expert, built into the TradeDoc AI platform.
DOCUMENT: {doc_name}
User: "{message}"
Reply naturally. 50-70 words max unless user asks for detail (then 200 max).
Use [NAVIGATE:page-name] to navigate (ai, dashboard, settings, documents, form-irs, form-cds, etc).
```

---

## Step 4: `server.py` — Global Scope (lines 1325-1370)

**UNCHANGED.** Gemini stays for global ChatCopilot. Only change: remove `from agents.gemini_helper import call_gemini, call_gemini_stream` from line 74 and move it to line ~1325 (import only where needed).

---

## Step 5: Dependencies

### `requirements.txt` additions:
```
groq>=0.9
```

### `.env.example` additions:
```
# ── Groq (Fast Chat, Free Tier) ──────────────────────────
GROQ_API_KEY=your_groq_api_key_here
```

---

## What Changes Visually (User Perspective)

| Feature | Before (Gemini) | After (Groq) |
|---|---|---|
| Chat speed | 2-4 seconds | 0.3-0.6 seconds |
| 503 errors | Frequent | None |
| Missing fields check | Rule-based (misses context) | AI-powered (understands semantics) |
| "Am I correct?" | Simple rule check only | Groq catches date ordering, value inconsistencies |
| Cache | 5-min cache on field explanations | No cache needed (Groq is fast enough) |
| Streaming | Fake SSE (whole text at once) | Real SSE (token-by-token typing effect) |

---

*End of plan. Ready for code mode implementation.*