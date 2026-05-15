"""
PDF Compiler Agent
====================
Calls the existing LaTeX pipeline to generate a PDF from trade JSON.
Supports FX NDF, IRS, CDS, and Equity TRS document types.
"""

import os
import sys
from .state import DocForgeState

# Add generator paths
_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.join(_ROOT, "templates", "FX_Trade_Confirmation"))
sys.path.insert(0, os.path.join(_ROOT, "templates", "IRS_Confirmation"))
sys.path.insert(0, os.path.join(_ROOT, "templates", "CDS_Confirmation"))
sys.path.insert(0, os.path.join(_ROOT, "templates", "Equity_TRS"))

from generate_fx_ndf import generate_pdf as generate_fx_pdf
from generate_irs import generate_pdf as generate_irs_pdf
from generate_cds import generate_pdf as generate_cds_pdf
from Generate_Equity_TRS import generate_pdf as generate_equity_trs_pdf

OUTPUT_DIR = os.path.join(_ROOT, "output_confirmations", "temp")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def compile_pdf(state: DocForgeState) -> DocForgeState:
    """LangGraph node: compile trade JSON to PDF via LaTeX."""
    trade_json = state.get("trade_json") or state.get("extracted_json")
    doc_type = state.get("doc_type", "fx_ndf")

    if not trade_json:
        return {**state, "error": "No trade JSON to compile"}

    if state.get("error"):
        return state

    try:
        print(f"  ⏳ Compiling {doc_type.upper()} PDF...")

        if doc_type == "fx_ndf":
            pdf_path = generate_fx_pdf(trade_json, OUTPUT_DIR)
        elif doc_type == "cds":
            pdf_path = generate_cds_pdf(trade_json, OUTPUT_DIR)
        elif doc_type == "equity_trs":
            pdf_path = generate_equity_trs_pdf(trade_json, OUTPUT_DIR)
        else:
            pdf_path = generate_irs_pdf(trade_json, OUTPUT_DIR)

        if pdf_path and os.path.exists(pdf_path):
            filename = os.path.basename(pdf_path)
            print(f"  ✅ PDF compiled: {filename}")
            return {
                **state,
                "pdf_path": pdf_path,
                "pdf_filename": filename,
                "error": ""
            }
        else:
            return {**state, "error": "PDF compilation failed — pdflatex error"}

    except Exception as e:
        print(f"  ❌ PDF compilation error: {e}")
        return {**state, "error": f"PDF compilation failed: {str(e)}"}
