"""
FX NDF Confirmation Generator
================================
Takes a JSON file with trade data,
fills the Jinja2 LaTeX template,
and compiles to a PDF document.

Usage:
    python generate_fx_ndf.py
    python generate_fx_ndf.py --json my_trade.json
"""

import json
import os
import re
import shutil
import subprocess
import argparse
from jinja2 import Environment, FileSystemLoader

# ─────────────────────────────────────────────
# CONFIGURATION (paths derived from this file's location)
# ─────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(_BASE_DIR, "templates")
TEMPLATE_FILE = "fx_ndf_template.tex"
OUTPUT_DIR = os.path.join(_BASE_DIR, "output confirmations")
# Auto-detect pdflatex path — works on Windows (MiKTeX) and Linux/Docker (TeX Live)
PDFLATEX = shutil.which("pdflatex") or "/Library/TeX/texbin/pdflatex"
PDFLATEX_TIMEOUT_SECONDS = int(os.environ.get("PDFLATEX_TIMEOUT_SECONDS", "45"))
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMPLATE_DIR, exist_ok=True)


def _safe_filename(value):
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value or ""))
    return value.strip("._") or "Document"

# ─────────────────────────────────────────────
# SAMPLE JSON TRADE DATA
# In real system this comes from UI or API
# ─────────────────────────────────────────────
SAMPLE_TRADE = {
    # ── Title fields ──
    "reference_currency": "BRL",
    "settlement_currency": "USD",

    # ── General Terms ──
    "trade_date": "01 March 2026",
    "reference_currency_full": "Brazilian Real (BRL)",
    "notional_amount": "USD 5,000,000",
    "forward_rate": "5.25",
    "reference_currency_notional_amount": "BRL 26,250,000",
    "buyer": "Goldman Sachs International",
    "seller": "Banco Bradesco S.A.",
    "settlement_currency_full": "U.S. Dollars",
    "settlement_date": "03 June 2026, subject to adjustment if the Scheduled "
                       "Valuation Date is adjusted in accordance with the Following "
                       "Business Day Convention or if Valuation Postponement applies, "
                       "and in each such case, the Settlement Date shall be as soon "
                       "as practicable, but in no event later than two Business Days "
                       "after the date on which the Spot Rate is determined.",
    "settlement_type": "Non-Deliverable",
    "settlement_rate_option": "BRL PTAX (BRL09)",
    "valuation_date": "01 June 2026 (``Scheduled Valuation Date''), subject to "
                      "adjustment in accordance with the Preceding Business Day "
                      "Convention; provided however that, in the event of an "
                      "Unscheduled Holiday, subject to adjustment in accordance "
                      "with the Following Business Day Convention.",

    # ── Disruption Events ──
    # Set to empty string "" to hide this section entirely
    "price_source_disruption": "Applicable",

    # ── Disruption Fallbacks ──
    # Add or remove items freely — template handles any number
    "disruption_fallbacks": [
        "Valuation Postponement",
        "Calculation Agent Determination of Settlement Rate"
    ],

    # ── Other Terms ──
    # Each item is a dict with "title" and "description"
    # Add or remove items freely — template handles any number
    "other_terms": [
        {
            "title": "Unscheduled Holiday",
            "description": "``Unscheduled Holiday'' means that a day is not a "
                           "Business Day and the market was not aware of such fact "
                           "(by means of a public announcement or by reference to "
                           "other publicly available information) until a time later "
                           "than 9:00 a.m.\\ local time in the Principal Financial "
                           "Center(s) of the Reference Currency two Business Days "
                           "prior to the Scheduled Valuation Date."
        },
        {
            "title": "Deferral Period for Unscheduled Holiday",
            "description": "In the event the Scheduled Valuation Date becomes "
                           "subject to the Following Business Day Convention after "
                           "the occurrence of an Unscheduled Holiday, and if the "
                           "Valuation Date has not occurred on or before the 14th "
                           "consecutive day after the Scheduled Valuation Date "
                           "(any such period being a ``Deferral Period''), then the "
                           "next day after the Deferral Period that would have been "
                           "a Business Day, but for the Unscheduled Holiday, shall "
                           "be deemed to be the Valuation Date."
        },
        {
            "title": "Valuation Postponement for Price Source Disruption",
            "description": "``Valuation Postponement'' means, for purposes of "
                           "obtaining a Settlement Rate, that the Spot Rate will be "
                           "determined on the Business Day first succeeding the day "
                           "on which the Price Source Disruption ceases to exist, "
                           "unless the Price Source Disruption continues to exist "
                           "for a consecutive number of calendar days equal to the "
                           "Maximum Days of Postponement. In such event, the Spot "
                           "Rate will be determined on the next Business Day after "
                           "the Maximum Days of Postponement in accordance with the "
                           "next applicable Disruption Fallback."
        },
        {
            "title": "Cumulative Events",
            "description": "Notwithstanding anything herein to the contrary, in no "
                           "event shall the total number of consecutive calendar days "
                           "during which either (i) valuation is deferred due to an "
                           "Unscheduled Holiday, or (ii) a Valuation Postponement "
                           "shall occur (or any combination of (i) and (ii)), exceed "
                           "14 consecutive calendar days in the aggregate."
        },
        {
            "title": "Maximum Days of Postponement",
            "description": "Fourteen (14) calendar days"
        },
        {
            "title": "Relevant Cities for Business Day(s) for Valuation Date",
            "description": "Any of Rio de Janeiro, Brasilia or S\\~{a}o Paulo "
                           "\\underline{and} New York City"
        },
        {
            "title": "Relevant City for Business Day for Settlement Date",
            "description": "New York"
        }
    ],

    # ── Calculation Agent ──
    "calculation_agent": "Goldman Sachs International"
}


# ─────────────────────────────────────────────
# STEP 1 — LOAD JSON
# ─────────────────────────────────────────────
def load_trade_data(json_path: str = None) -> dict:
    if json_path and os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"  ✅ Loaded trade data from: {json_path}")
        return data
    else:
        print("  ✅ Using built-in sample trade data")
        return SAMPLE_TRADE


# ─────────────────────────────────────────────
# STEP 2 — FILL JINJA2 TEMPLATE
# ─────────────────────────────────────────────
def fill_template(trade_data: dict, template_dir: str = None) -> str:
    tpl_dir = template_dir or TEMPLATE_DIR
    # Set up Jinja2 with custom delimiters
    # Using << >> instead of {{ }} to avoid LaTeX conflicts
    env = Environment(
        loader=FileSystemLoader(tpl_dir),
        block_start_string='<<-',
        block_end_string='>>',
        variable_start_string='<<',
        variable_end_string='>>',
        comment_start_string='<#',
        comment_end_string='#>',
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True
    )

    template = env.get_template(TEMPLATE_FILE)
    filled = template.render(**trade_data)
    print("  ✅ Template filled successfully")
    return filled


# ─────────────────────────────────────────────
# STEP 3 — COMPILE TO PDF
# ─────────────────────────────────────────────
def compile_to_pdf(tex_content: str, trade_data: dict, output_dir: str = None) -> str:
    out_dir = output_dir or OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    # Create output filename from trade details
    ref_ccy = _safe_filename(trade_data.get("reference_currency", "CCY"))
    stl_ccy = _safe_filename(trade_data.get("settlement_currency", "USD"))
    date = _safe_filename(trade_data.get("trade_date", "Date"))
    output_name = f"FX_NDF_{ref_ccy}_{stl_ccy}_{date}"

    tex_path = os.path.join(out_dir, f"{output_name}.tex")
    pdf_path = os.path.join(out_dir, f"{output_name}.pdf")

    # Write filled .tex file
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)
    print(f"  ✅ LaTeX file written: {tex_path}")

    # Compile with pdflatex
    print("  ⏳ Compiling PDF...")
    try:
        result = subprocess.run(
            [PDFLATEX, "-interaction=nonstopmode",
            "-output-directory", out_dir, tex_path],
            capture_output=True, text=True, timeout=PDFLATEX_TIMEOUT_SECONDS
        )
    except subprocess.TimeoutExpired:
        print(f"  ❌ Compilation timed out after {PDFLATEX_TIMEOUT_SECONDS}s")
        return None

    if os.path.exists(pdf_path):
        print(f"  ✅ PDF generated: {pdf_path}")
        # Clean up auxiliary files
        for ext in ('.aux', '.log', '.out'):
            aux = os.path.join(out_dir, f"{output_name}{ext}")
            if os.path.exists(aux):
                os.remove(aux)
        return pdf_path
    else:
        print("  ❌ PDF compilation failed!")
        print("  LaTeX errors:")
        # Show last 20 lines of error log
        lines = result.stdout.split("\n")
        for line in lines[-20:]:
            if line.strip():
                print(f"    {line}")
        return None


# ─────────────────────────────────────────────
# PUBLIC API — called by server.py
# ─────────────────────────────────────────────
def generate_pdf(trade_data: dict, output_dir: str = None) -> str:
    """
    End-to-end: fill template + compile to PDF.
    Returns the absolute path to the generated PDF, or None on failure.
    """
    trade_data = _escape_latex(trade_data)
    filled_tex = fill_template(trade_data)
    pdf_path = compile_to_pdf(filled_tex, trade_data, output_dir)
    return pdf_path


def _escape_latex(data):
    """Escape LaTeX special characters in trade data values."""
    escaped = {}
    for key, value in data.items():
        if isinstance(value, str):
            escaped[key] = _escape_latex_string(value)
        elif isinstance(value, list):
            escaped[key] = [_escape_latex_item(item) for item in value]
        else:
            escaped[key] = value
    return escaped


def _escape_latex_item(item):
    """Escape LaTeX chars in a list item (string or dict)."""
    if isinstance(item, str):
        return _escape_latex_string(item)
    elif isinstance(item, dict):
        return {k: _escape_latex_string(v) if isinstance(v, str) else v for k, v in item.items()}
    return item


def _escape_latex_string(value):
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in value)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Generate FX NDF Confirmation PDF"
    )
    parser.add_argument(
        "--json",
        help="Path to trade JSON file (optional)",
        default=None
    )
    args = parser.parse_args()

    print("=" * 55)
    print("  FX NDF CONFIRMATION GENERATOR")
    print("=" * 55)

    # Step 1: Load trade data
    print("\n📋 Step 1: Loading trade data...")
    trade_data = load_trade_data(args.json)

    # Step 2: Fill template
    print("\n📝 Step 2: Filling Jinja2 template...")
    filled_tex = fill_template(trade_data)

    # Step 3: Compile to PDF
    print("\n📄 Step 3: Compiling to PDF...")
    pdf_path = compile_to_pdf(filled_tex, trade_data)

    # Done
    print("\n" + "=" * 55)
    if pdf_path:
        print(f"  ✅ SUCCESS!")
        print(f"  📄 PDF: {pdf_path}")
    else:
        print("  ❌ FAILED — check LaTeX installation")
        print("  Install: https://miktex.org (Windows)")
    print("=" * 55)


if __name__ == "__main__":
    main()
