"""
LangGraph State Definition
============================
Shared TypedDict that flows through all agent nodes.
"""

from typing import TypedDict, Optional


class DocForgeState(TypedDict, total=False):
    # ── Input ───────────────────────────
    email_text: str                    # Raw email pasted by user
    mode: str                          # "ai_create" | "compile_pdf" | "validate"
    model: Optional[str]               # Specific Gemini model to use


    # ── Classification output ───────────
    doc_type: str                      # "fx_ndf" | "irs" | "cds" | "equity_trs"
    exhibit: str                       # "II-A", "II-B", ... (IRS only)
    termination_type: str              # "" | "Optional" | "Mandatory" (IRS only)
    model_type: str                    # "I" | "II" (Equity TRS only)

    # ── Extraction output ───────────────
    extracted_json: dict               # The populated trade JSON

    # ── PDF compilation output ──────────
    trade_json: dict                   # JSON to compile (may come from user, not AI)
    pdf_path: str                      # Path to generated PDF
    pdf_filename: str                  # Just the filename

    # ── Word conversion output ──────────
    docx_path: str                     # Path to generated Word file
    docx_filename: str                 # Just the filename

    # ── Validation output ───────────────
    validation_report: str             # Markdown report from validator

    # ── Error handling ──────────────────
    error: str                         # Error message if any step fails
