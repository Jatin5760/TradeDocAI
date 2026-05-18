"""
CDS Confirmation Generator
============================
Takes a JSON file, fills the Jinja2 LaTeX template,
compiles to PDF using pdflatex.

Usage:
    python generate_cds.py
    python generate_cds.py --json trade_CDS_sample.json
"""

import json
import os
import shutil
import subprocess
import argparse
from jinja2 import Environment, FileSystemLoader

# ─────────────────────────────────────────────
# CONFIGURATION (paths derived from this file's location)
# ─────────────────────────────────────────────
_BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR  = os.path.join(_BASE_DIR, "templates")
TEMPLATE_FILE = "CDS_Confirmation_Template.tex"
OUTPUT_DIR    = os.path.join(_BASE_DIR, "output_confirmations")
# Auto-detect pdflatex path — works on Windows (MiKTeX) and Linux/Docker (TeX Live)
PDFLATEX      = shutil.which("pdflatex") or \
                r"C:\Users\sanja\AppData\Local\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"

os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_trade_data(json_path=None):
    if json_path and os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"  [SUCCESS] Loaded: {json_path}")
        return data
    else:
        print("  [ERROR] No JSON file provided or file not found")
        return None


def fill_template(trade_data, template_dir=None):
    tpl_dir = template_dir or TEMPLATE_DIR
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
    print("  [SUCCESS] Template filled")
    return filled


def compile_to_pdf(tex_content, trade_data, output_dir=None):
    out_dir = output_dir or OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    party_a  = trade_data.get("party_a_name", "PartyA").replace(" ", "_")
    date     = trade_data.get("trade_date", "UnknownDate").replace(" ", "_")
    
    # Clean naming convention specific to CDS
    name     = f"CDS_Confirmation_{party_a}_{date}"

    tex_path = os.path.join(out_dir, f"{name}.tex")
    pdf_path = os.path.join(out_dir, f"{name}.pdf")

    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)
    print(f"  [SUCCESS] .tex written: {tex_path}")

    print("  [INFO] Compiling PDF...")
    result = subprocess.run(
        [PDFLATEX, "-interaction=nonstopmode",
         "-output-directory", out_dir, tex_path],
        capture_output=True, text=True
    )

    if os.path.exists(pdf_path):
        print(f"  [SUCCESS] PDF generated: {pdf_path}")
        # Clean up auxiliary files
        for ext in ('.aux', '.log', '.out'):
            aux = os.path.join(out_dir, f"{name}{ext}")
            if os.path.exists(aux):
                os.remove(aux)
        return pdf_path
    else:
        print("  [ERROR] Compilation failed!")
        for line in result.stdout.split("\n")[-20:]:
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
    # Escape LaTeX special characters in all string values
    trade_data = _escape_latex(trade_data)
    filled_tex = fill_template(trade_data)
    pdf_path = compile_to_pdf(filled_tex, trade_data, output_dir)
    return pdf_path


def _escape_latex(data):
    """Escape LaTeX special characters in trade data values."""
    escaped = {}
    for key, value in data.items():
        if isinstance(value, str):
            # Escape % for LaTeX (but not already escaped ones)
            value = value.replace('\\%', '__ESCAPED_PCT__')
            value = value.replace('%', '\\%')
            value = value.replace('__ESCAPED_PCT__', '\\%')
            # Escape & for LaTeX
            value = value.replace('\\&', '__ESCAPED_AMP__')
            value = value.replace('&', '\\&')
            value = value.replace('__ESCAPED_AMP__', '\\&')
            escaped[key] = value
        elif isinstance(value, list):
            escaped[key] = [_escape_latex_item(item) for item in value]
        else:
            escaped[key] = value
    return escaped


def _escape_latex_item(item):
    """Escape LaTeX chars in a list item (string or dict)."""
    if isinstance(item, str):
        item = item.replace('%', '\\%').replace('&', '\\&')
        return item
    elif isinstance(item, dict):
        return {k: v.replace('%', '\\%').replace('&', '\\&') if isinstance(v, str) else v
                for k, v in item.items()}
    return item


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", default=None)
    args = parser.parse_args()

    print("=" * 55)
    print("  CDS CONFIRMATION GENERATOR")
    print("=" * 55)

    print("\n[STEP 1] Loading trade data...")
    trade_data = load_trade_data(args.json)
    if not trade_data:
        return

    print("\n[STEP 2] Filling template...")
    
    # Escape LaTeX characters before filling
    trade_data_escaped = _escape_latex(trade_data)
    filled_tex = fill_template(trade_data_escaped)

    print("\n[STEP 3] Compiling PDF...")
    pdf_path = compile_to_pdf(filled_tex, trade_data_escaped)

    print("\n" + "=" * 55)
    if pdf_path:
        print(f"  [SUCCESS] SUCCESS: {pdf_path}")
    else:
        print("  [ERROR] FAILED")
    print("=" * 55)


if __name__ == "__main__":
    main()