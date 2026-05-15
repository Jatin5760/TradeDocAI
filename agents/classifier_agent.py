"""
Classifier Agent
==================
Uses Gemini to classify an email into:
  - doc_type: "fx_ndf" | "irs" | "cds" | "equity_trs"
  - exhibit: which IRS exhibit (II-A through II-J) — IRS only
  - termination_type: "" / "Optional" / "Mandatory" — IRS only
  - model_type: "I" | "II" — Equity TRS only
"""

import json
from .gemini_helper import call_gemini
from .state import DocForgeState

CLASSIFICATION_PROMPT = """You are an expert trade documentation classifier for derivatives markets.

Analyze the following email/message and classify the trade confirmation it describes.

Return a JSON object with exactly these fields:
{{
  "doc_type": "fx_ndf" or "irs" or "cds" or "equity_trs",
  "exhibit": "II-A" or "II-B" or "II-C" or "II-D" or "II-E" or "II-H" or "II-I" or "II-J" or "",
  "termination_type": "" or "Optional" or "Mandatory",
  "model_type": "I" or "II" or ""
}}

Classification rules:
- doc_type = "fx_ndf" if the email describes a Non-Deliverable Forward (NDF) FX transaction
- doc_type = "irs" if the email describes any Interest Rate Derivative (swap, cap, floor, swaption, OIS, FRA, basis swap)
- doc_type = "cds" if the email describes a Credit Default Swap (CDS) — key indicators:
    * Reference Entity (a company being insured against default)
    * Protection Buyer / Protection Seller
    * Credit Events (Bankruptcy, Failure to Pay, Restructuring)
    * Fixed Rate (premium in basis points)
    * 2014 ISDA Credit Derivatives Definitions
    * Scheduled Termination Date for credit protection
- doc_type = "equity_trs" if the email describes an Equity Total Return Swap (TRS) — key indicators:
    * Equity Amount Payer / Return Payer / Total Return Payer on an equity underlier
    * Reference to a stock, index, or basket (e.g. AAPL, SPX, EURO STOXX 50)
    * Floating Amount Payer paying a benchmark rate + spread (SOFR, EURIBOR, \u20acSTR, SONIA, etc.)
    * Terms like "Equity Notional Reset", "Performance Amount", "Dividend Amount"
    * 2002 or 2011 ISDA Equity Derivatives Definitions
    * Model I (term rate financing) or Model II (overnight financing / compounded overnight)

If doc_type is "irs", determine the exhibit:
- "II-A" = Standard Interest Rate Swap (fixed vs floating)
- "II-B" = Interest Rate Cap, Floor, or Collar
- "II-C" = Forward Rate Agreement (FRA)
- "II-D" = Overnight Index Swap (OIS)
- "II-E" = Swaption (option to enter a swap)
- "II-H" = Mark-to-Market Currency Swap
- "II-I" = Range Accrual Swap
- "II-J" = Floating-to-Floating (basis) Swap

If doc_type is "fx_ndf" or "cds", set exhibit to "".
If doc_type is "equity_trs", set exhibit to "".

For termination_type (IRS only):
- "" = no early termination clause mentioned
- "Optional" = optional early termination is mentioned
- "Mandatory" = mandatory early termination is mentioned
For non-IRS types, set termination_type to "".

For model_type (Equity TRS only):
- "I"  = Term Rate Financing (SOFR / EURIBOR designated maturity, fixing days, linear interpolation)
- "II" = Overnight Financing (compounded overnight, averaging, lookback, lockout, observation period shift)
- ""   = leave empty for non-Equity TRS documents

EMAIL CONTENT:
{email_text}

Return ONLY the JSON object, no markdown formatting, no explanation."""


def classify_document(state: DocForgeState) -> DocForgeState:
    """LangGraph node: classify the email into doc_type + exhibit + termination."""
    email_text = state.get("email_text", "")

    if not email_text.strip():
        return {**state, "error": "No email text provided"}

    try:
        prompt = CLASSIFICATION_PROMPT.format(email_text=email_text)
        text = call_gemini(prompt, model_name=state.get("model"))

        # Clean up any markdown code block wrapping
        if text.startswith("```"):
            text = text.split("\n", 1)[1]  # remove first line
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        result = json.loads(text)
        doc_type = result.get("doc_type", "fx_ndf")
        model_type = result.get("model_type", "") if doc_type == "equity_trs" else ""
        print(f"  ✅ Classification: doc_type={doc_type}, "
              f"exhibit={result.get('exhibit','')}, "
              f"termination={result.get('termination_type','')}"
              + (f", model_type={model_type}" if doc_type == "equity_trs" else ""))

        return {
            **state,
            "doc_type": doc_type,
            "exhibit": result.get("exhibit", ""),
            "termination_type": result.get("termination_type", ""),
            "model_type": model_type,
            "error": ""
        }
    except Exception as e:
        print(f"  ❌ Classification failed: {e}")
        return {**state, "error": f"Classification failed: {str(e)}"}
