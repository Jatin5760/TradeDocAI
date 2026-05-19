# TradeDoc AI — LLM Migration Plan: API Key to Vertex AI + Groq

**Status:** Draft — awaiting approval  
**Context:** Hackathon demo. Current Gemini paid API keys fail with 503/429/RESOURCE_EXHAUSTED under load.  
**Goal:** Bulletproof reliability during demo + visually fast responses for judges.  
**Budget:** $300 GCP credits (more than enough — ~$0.50 total for demo day).

---

## 1. Current Architecture (The Problem)

```
┌─────────────┐     ┌─────────────────────┐
│  Cloud Run  │────▶│ Google AI Studio API │  ← Shared capacity pool
│  server.py  │     │ (API Key auth)       │     No SLA, strict RPM limits
└─────────────┘     └─────────────────────┘
                           │
                    503/429 ERRORS
                    under any load
```

All 6 call sites hit the same bottleneck:

| Call Site | File | Model | Fails Under |
|---|---|---|---|
| Chat Copilot (stream) | [`server.py:1161`](server.py:1161) | `gemini-flash-latest` | Any concurrent chat |
| Chat Copilot (non-stream) | [`server.py:1277`](server.py:1277) | `gemini-flash-latest` | Any concurrent chat |
| Assistant — mistake check | [`server.py:1306`](server.py:1306) | `gemini-flash-latest` | Peak usage |
| Assistant — form overview | [`server.py:1321`](server.py:1321) | `gemini-flash-latest` | Peak usage |
| Assistant — general | [`server.py:1355`](server.py:1355) | `gemini-flash-latest` | Peak usage |
| Classifier Agent | [`agents/classifier_agent.py:84`](agents/classifier_agent.py:84) | `gemini-2.5-pro` | Heavy PDF ingestion |
| Extractor Agent | [`agents/extractor_agent.py:421`](agents/extractor_agent.py:421) | `gemini-2.5-pro` | Complex JSON extraction |
| Validator Agent | [`agents/validator_agent.py:84`](agents/validator_agent.py:84) | `gemini-2.5-pro` | Multimodal PDF review |

---

## 2. Target Architecture (The Fix)

```
┌─────────────┐
│  Cloud Run  │
│  server.py  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│   LLM Router          │  ← NEW: agents/llm_router.py
│   (unified interface) │
└──────┬───────────────┘
       │
       ├──────────────▶ Vertex AI Gemini 2.5 Pro
       │                (GCP — service account auth)
       │                • Extraction / Classification
       │                • PDF Multimodal Validation
       │                • Fallback for chat if Groq fails
       │
       └──────────────▶ Groq — Llama 3.3 70B
                        (groq.com — free tier)
                        • Chat Copilot (stream + non-stream)
                        • Form Assistant
                        • Mistake checks
                        • Fallback for extraction if Vertex fails
```

### Why Two Providers?

| Provider | Strength | Weakness |
|---|---|---|
| **Groq** (Llama 3.3 70B) | 300+ tok/s, free, no rate limits at demo scale | No multimodal (PDF), slightly less precise on structured JSON |
| **Vertex AI Gemini 2.5 Pro** | Multimodal PDF, strong structured extraction, enterprise SLA | 50-100 tok/s, costs ~$2/day at moderate load |

Each provider compensates for the other's weakness. The router auto-selects based on task type and falls back automatically.

---

## 3. Detailed Implementation Steps

### Step 1: Create `agents/llm_router.py` (NEW FILE)

This replaces `agents/gemini_helper.py` entirely. Core design:

```python
# Pseudocode structure — NOT the actual implementation
class LLMRouter:
    """Routes LLM calls to the best provider based on task type."""

    ROUTE_CHAT = "chat"          # → Groq primary, Vertex fallback
    ROUTE_EXTRACTION = "extraction"  # → Vertex primary, Groq fallback
    ROUTE_MULTIMODAL = "multimodal"  # → Vertex only (Groq can't do PDF)

    def route(self, task: str, prompt: str, **kwargs) -> str:
        ...

    def route_stream(self, task: str, prompt: str, **kwargs) -> Generator:
        ...

    def route_with_pdf(self, prompt: str, pdf_path: str) -> str:
        ...
```

**Key design decisions:**

- Same function signatures as current `call_gemini()`, `call_gemini_stream()`, `call_gemini_with_pdf()` — makes migration a find-and-replace
- Vertex AI auth: uses Cloud Run's default service account + `google-cloud-aiplatform` SDK. **No API key needed** — automatic via the GCP metadata server
- Groq auth: uses `GROQ_API_KEY` env var (free from console.groq.com)
- Fallback chain: primary → secondary → error. Each step has its own retry logic
- Response format normalization: Groq and Vertex return slightly different structures; the router normalizes

### Step 2: GCP Console Setup (Manual, ~5 minutes)

1. **Enable Vertex AI API**: GCP Console → APIs & Services → Enable "Vertex AI API"
2. **Grant IAM role**: IAM → Cloud Run service account → Add role `Vertex AI User` (`aiplatform.user`)
3. That's it. No keys to generate, no secrets to rotate. Cloud Run handles auth automatically.

### Step 3: Groq Setup (Manual, ~2 minutes)

1. Go to [console.groq.com](https://console.groq.com) → sign up (free)
2. Create an API key
3. Add `GROQ_API_KEY=...` to your Cloud Run env vars

### Step 4: Files to Change

| File | Change | Impact |
|---|---|---|
| **NEW** `agents/llm_router.py` | Full router implementation | Core of migration |
| [`agents/gemini_helper.py`](agents/gemini_helper.py) | Add deprecation comment, keep as-is for rollback | Safety net |
| [`server.py`](server.py:74) | `from agents.llm_router import call_gemini, call_gemini_stream` | 2-line change |
| [`agents/classifier_agent.py`](agents/classifier_agent.py:12) | Same import change | 1-line change |
| [`agents/extractor_agent.py`](agents/extractor_agent.py:11) | Same import change | 1-line change |
| [`agents/validator_agent.py`](agents/validator_agent.py:10) | Same import change | 1-line change |
| [`agents/system_health_check.py`](agents/system_health_check.py:117) | Same import change | 1-line change |
| [`server.py`](server.py:955) | Health check reports Vertex + Groq status | Know which providers are up |
| [`requirements.txt`](requirements.txt) | Add `groq`, `google-cloud-aiplatform` | New dependencies |
| `.env.example` | Replace `GEMINI_API_KEY` with `GROQ_API_KEY`, `GCP_PROJECT_ID` | Documentation |
| [`server.py:954`](server.py:954) | `"gemini_configured"` → `"vertex_configured" + "groq_configured"` | Health endpoint |

### Step 5: `.env.example` Changes

```diff
- GEMINI_API_KEY=your_gemini_api_key_here
- GEMINI_MODEL=gemini-2.5-pro
+ # ── Groq (fast chat, free tier) ──────────────────────────
+ # Get your key at: https://console.groq.com
+ GROQ_API_KEY=your_groq_api_key_here
+
+ # ── Vertex AI (GCP — uses service account, not API key) ─
+ # Your GCP project ID (required for Vertex AI)
+ GCP_PROJECT_ID=your-gcp-project-id
+ GCP_LOCATION=us-central1
+ # Preferred models
+ VERTEX_CHAT_MODEL=gemini-2.5-flash
+ VERTEX_PRO_MODEL=gemini-2.5-pro
```

### Step 6: `requirements.txt` Changes

```diff
- google-genai>=1.0
+ google-cloud-aiplatform>=1.60
+ groq>=0.9
+ google-genai>=1.0  # keep for fallback compatibility
```

---

## 4. Routing Logic (Decision Matrix)

```
User request arrives at server.py
         │
         ▼
┌─ Is this a chat/copilot call? (stream or non-stream)
│  YES → Route to Groq (Llama 3.3 70B)
│        • Built with build_assistant_prompt() or generic chat
│        • If Groq fails → fallback to Vertex Gemini Flash
│        • If Vertex fails → return friendly error
│
├─ Is this an extraction/classification call?
│  YES → Route to Vertex AI Gemini 2.5 Pro
│        • Classifier agent: email → doc type + sub-type
│        • Extractor agent: email + schema → structured JSON
│        • If Vertex fails → fallback to Groq
│        • If Groq fails → return error
│
└─ Is this a PDF validation call?
   YES → Route to Vertex AI Gemini 2.5 Pro (multimodal)
         • send PDF bytes + prompt
         • NO Groq fallback (Groq doesn't support PDFs)
         • If Vertex fails → return error
```

---

## 5. Hackathon Demo Risk Mitigation

| Risk | Mitigation |
|---|---|
| Groq is down | Router auto-falls-back to Vertex AI for all call types |
| Vertex AI is down | Router auto-falls-back to Groq for text calls; PDF returns friendly error |
| Internet slow during demo | Both providers have low-latency endpoints; Groq is especially fast |
| GCP project not enabled | Pre-demo checklist: run health check endpoint to verify both providers |
| Rate limits on demo day | Groq free tier gives 30 RPM — more than enough. Vertex gives 300 RPM for Flash |
| Judges ask about PDF validation | Vertex handles multimodal reliably; demo the extraction + validation pipeline |

---

## 6. Rollback Plan

If anything goes wrong during the hackathon:

1. The old [`agents/gemini_helper.py`](agents/gemini_helper.py) is kept intact (not deleted)
2. To rollback: change the import line in [`server.py`](server.py:74) back from `agents.llm_router` to `agents.gemini_helper`
3. That's it — one line change, instant rollback

---

## 7. Pre-Demo Validation Checklist

- [ ] `GET /health/ready` returns `{"vertex": true, "groq": true}`
- [ ] Send a chat message → response arrives in <2 seconds
- [ ] Send an extraction request → JSON returned correctly
- [ ] Send a PDF for validation → multimodal review works
- [ ] Kill Groq (remove key) → chat still works via Vertex fallback
- [ ] Kill Vertex → extraction returns Groq fallback response

---

## 8. Cost Estimate for Hackathon Day

| Provider | Calls | Tokens | Cost |
|---|---|---|---|
| Groq | ~500 chat messages | ~500K tokens | $0 (free tier) |
| Vertex AI Pro | ~20 extractions | ~80K tokens | ~$0.13 |
| Vertex AI Flash (fallback chat) | ~50 fallback calls | ~50K tokens | ~$0.04 |
| Vertex AI Pro (PDF validation) | ~10 validations | ~50K tokens (incl PDF) | ~$0.56 |
| **Total** | | | **~$0.73** |

Your $300 credits cover this ~410x over.

---

## 9. Migration Summary

| What | From | To |
|---|---|---|
| Auth method | API key in `.env` | GCP service account (automatic) + Groq API key |
| Chat model | Gemini Flash (API key) | Llama 3.3 70B via Groq (fast, free) |
| Extraction model | Gemini 2.5 Pro (API key) | Gemini 2.5 Pro via Vertex AI (reliable) |
| PDF model | Gemini 2.5 Pro (API key) | Gemini 2.5 Pro via Vertex AI (reliable) |
| Rate limit errors | Frequent 503/429 | Vanishes — enterprise SLA |
| Chat response speed | ~2-4 seconds | ~0.5-1 second (4x faster — judges impressed) |
| Code changes | — | ~20 lines changed across 6 files + 1 new file |

---

*End of plan. Awaiting your approval to switch to code mode for implementation.*