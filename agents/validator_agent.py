"""
Validator Agent
=================
Uses Gemini multimodal API to validate the generated PDF confirmation
against the original email. The model reads the PDF visually and compares
every detail against the source email.
"""

import os
from .gemini_helper import call_gemini_with_pdf
from .state import DocForgeState

VALIDATION_PROMPT = """You are an expert trade documentation validator for derivatives markets, with deep knowledge of ISDA and EMTA confirmation standards.

You have been given:
1. The ORIGINAL EMAIL/MESSAGE containing trade details
2. The GENERATED PDF CONFIRMATION document (attached)

Your job is to produce a VALIDATION REPORT comparing the ORIGINAL EMAIL against the PDF confirmation.

CRITICAL — WHAT TO VALIDATE vs WHAT TO IGNORE:

The PDF is an ISDA/EMTA-compliant trade confirmation. It should contain ONLY the fields that belong in a formal bilateral confirmation document. The email contains extra metadata that is intentionally excluded from the PDF per industry standards.

IGNORE (do NOT flag as missing) — these are email-only metadata, not confirmation fields:
- Trade Reference / Deal Reference / Transaction Reference numbers — these are internal tracking IDs, not confirmation fields
- LEI codes (Legal Entity Identifiers) — these are regulatory reporting identifiers submitted to trade repositories, NOT written into bilateral ISDA confirmations
- Attention lines (e.g. "Attention: FX Derivatives Desk") — routing metadata, not confirmation content
- Email addresses, phone numbers, CC fields — email metadata only
- Contact details / notice details that are only mentioned in the email signature block

ONLY validate these categories of fields:
- **Trade Economics**: dates (trade date, effective date, termination date, settlement date, valuation date), notional amounts, rates (fixed rate, floating rate, forward rate, spread), currencies, payment amounts
- **Party Identification**: party legal names, offices (if in PDF), addresses (if in PDF)
- **Transaction Classification**: transaction type, settlement type, exhibit type, governing law
- **Calculation Provisions**: calculation agent, day count fractions, business day conventions, disruption fallbacks, compounding methods
- **Dates & Rates**: all dates, all rates, all rate options (e.g. SOFR, EURIBOR, settlement rate option)

Check for:
- **Missing Fields**: Critical ISDA/EMTA confirmation data mentioned in the email but not present in the PDF (excluding email-only metadata listed above)
- **Mismatched Values**: Values in the PDF that don't match the email (dates, amounts, rates, names, etc.)
- **Formatting Issues**: Dates, amounts, or rates that appear incorrectly formatted in the PDF
- **Rendering Problems**: Any visual issues in the PDF (broken layout, overlapping text, missing sections)
- **Logical Inconsistencies**: e.g. settlement date before trade date, notional amounts that don't match forward rate × reference amount
- **Completeness**: Are all critical trade economics from the email reflected correctly in the PDF?

ORIGINAL EMAIL:
{email_text}

The PDF confirmation document is attached above. Read it carefully and compare every detail.

Produce a clear, structured validation report in Markdown format with these sections:

## Validation Summary
A one-line overall status: ✅ PASS, ⚠️ WARNINGS, or ❌ ISSUES FOUND

## Field-by-Field Check
A table with columns: Field | Email Value | PDF Value | Status (✅/⚠️/❌)

## Issues Found
List any problems with details.

## Recommendations
Suggestions for fixing any issues.

Return the Markdown report now:"""


def validate_document(state: DocForgeState) -> DocForgeState:
    """LangGraph node: validate generated PDF against original email using multimodal Gemini."""
    email_text = state.get("email_text", "")
    pdf_path = state.get("pdf_path", "")

    if not pdf_path or not os.path.exists(pdf_path):
        return {**state, "error": "No PDF file found to validate — please generate the PDF first"}

    if not email_text.strip():
        return {**state, "error": "No email text to validate against"}

    try:
        prompt = VALIDATION_PROMPT.format(email_text=email_text)

        print(f"  ⏳ Validating PDF: {os.path.basename(pdf_path)} against email...")
        report = call_gemini_with_pdf(prompt, pdf_path, model_name=state.get("model"))

        print(f"  ✅ Validation complete ({len(report)} chars)")

        return {
            **state,
            "validation_report": report,
            "error": ""
        }

    except Exception as e:
        print(f"  ❌ Validation failed: {e}")
        return {**state, "error": f"Validation failed: {str(e)}"}
