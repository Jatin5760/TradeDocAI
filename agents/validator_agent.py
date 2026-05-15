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

VALIDATION_PROMPT = """You are an expert trade documentation validator for derivatives markets.

You have been given:
1. The ORIGINAL EMAIL/MESSAGE containing trade details
2. The GENERATED PDF CONFIRMATION document (attached)

Your job is to produce a VALIDATION REPORT comparing the original email against the PDF confirmation.

Check for:
- **Missing Fields**: Data mentioned in the email but not present in the PDF
- **Mismatched Values**: Values in the PDF that don't match the email (dates, amounts, rates, names, etc.)
- **Formatting Issues**: Dates, amounts, or rates that appear incorrectly formatted in the PDF
- **Rendering Problems**: Any visual issues in the PDF (broken layout, overlapping text, missing sections)
- **Logical Inconsistencies**: e.g. settlement date before trade date, notional amounts that don't match forward rate × reference amount
- **Completeness**: Are all critical trade details from the email reflected correctly in the PDF?

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
