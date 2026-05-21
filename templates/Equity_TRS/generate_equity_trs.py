"""
Equity TRS Confirmation Generator
==================================
Takes a JSON file containing trade data (Model I or Model II), 
fills the Jinja2 LaTeX template for Equity Swaps, and 
compiles to PDF using pdflatex.

Usage:
    python generate_equity_trs.py --json trade_equity_sample.json
"""

import json
import os
import shutil
import subprocess
import argparse
from jinja2 import Environment, FileSystemLoader

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
_BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR  = os.path.join(_BASE_DIR, "templates")
TEMPLATE_FILE = "equity_trs_template.tex"
OUTPUT_DIR    = os.path.join(_BASE_DIR, "output_confirmations")

# Auto-detect pdflatex path
PDFLATEX      = shutil.which("pdflatex") or \
                r"C:\Users\sanja\AppData\Local\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"

os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_trade_data(json_path=None):
    """Loads JSON trade data and ensures model_type is present."""
    if json_path and os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Validation for Model Type (Required for the .tex logic)
        if "model_type" not in data:
            print("  ⚠️ Warning: 'model_type' not found in JSON. Defaulting to 'I'.")
            data["model_type"] = "I"
            
        print(f"  ✅ Loaded: {json_path} (Model {data['model_type']})")
        return data
    else:
        print("  ❌ No JSON file provided or file not found")
        return None


def fill_template(trade_data, template_dir=None):
    """Initializes Jinja environment with custom delimiters and renders template."""
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
    
    try:
        template = env.get_template(TEMPLATE_FILE)
        filled = template.render(**trade_data)
        print("  ✅ Template filled successfully")
        return filled
    except Exception as e:
        print(f"  ❌ Template rendering error: {e}")
        return None


def compile_to_pdf(tex_content, trade_data, output_dir=None):
    """Writes .tex file and runs pdflatex."""
    out_dir = output_dir or OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    # Naming convention: Confirmation_TRS_[Model]_[PartyA]_[Date]
    model    = trade_data.get("model_type", "I")
    party_a  = trade_data.get("party_a_name", "PartyA").replace(" ", "_")
    date     = trade_data.get("trade_date", "Date").replace(" ", "_").replace("/", "-")
    name     = f"Confirmation_EquityTRS_Model{model}_{party_a}_{date}"

    tex_path = os.path.join(out_dir, f"{name}.tex")
    pdf_path = os.path.join(out_dir, f"{name}.pdf")

    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)
    print(f"  ✅ .tex written: {tex_path}")

    print("  ⏳ Compiling PDF (pdflatex)...")
    result = subprocess.run(
        [PDFLATEX, "-interaction=nonstopmode",
         "-output-directory", out_dir, tex_path],
        capture_output=True, text=True
    )

    if os.path.exists(pdf_path):
        print(f"  ✅ PDF generated: {pdf_path}")
        # Cleanup auxiliary files created by LaTeX
        for ext in ('.aux', '.log', '.out'):
            aux = os.path.join(out_dir, f"{name}{ext}")
            if os.path.exists(aux):
                os.remove(aux)
        return pdf_path
    else:
        print("  ❌ Compilation failed! Check LaTeX syntax.")
        # Print the last few lines of the log for debugging
        print("\n--- LaTeX Error Log Snippet ---")
        print("\n".join(result.stdout.split("\n")[-15:]))
        return None


def _escape_latex(data):
    """Escape LaTeX special characters in trade data values recursively."""
    if isinstance(data, dict):
        return {key: _escape_latex(val) for key, val in data.items()}
    elif isinstance(data, list):
        return [_escape_latex(item) for item in data]
    elif isinstance(data, str):
        placeholders = {
            r'\&': 'LATEXESCAMP',
            r'\%': 'LATEXESCPCT',
            r'\$': 'LATEXESCDOL',
            r'\#': 'LATEXESCHASH',
            r'\_': 'LATEXESCSUB',
            r'\{': 'LATEXESCLBR',
            r'\}': 'LATEXESCRBR',
            r'\textasciitilde{}': 'LATEXESCTILDE',
            r'\textasciicircum{}': 'LATEXESCCARET',
        }
        for escaped_seq, placeholder in placeholders.items():
            data = data.replace(escaped_seq, placeholder)
        
        data = data.replace(r'\~', 'LATEXESCTILDE')
        data = data.replace(r'\^', 'LATEXESCCARET')

        data = data.replace('{', r'\{')
        data = data.replace('}', r'\}')
        data = data.replace('~', r'\textasciitilde{}')
        data = data.replace('^', r'\textasciicircum{}')
        data = data.replace('&', r'\&')
        data = data.replace('%', r'\%')
        data = data.replace('$', r'\$')
        data = data.replace('#', r'\#')
        data = data.replace('_', r'\_')
        
        restorations = {
            'LATEXESCAMP': r'\&',
            'LATEXESCPCT': r'\%',
            'LATEXESCDOL': r'\$',
            'LATEXESCHASH': r'\#',
            'LATEXESCSUB': r'\_',
            'LATEXESCLBR': r'\{',
            'LATEXESCRBR': r'\}',
            'LATEXESCTILDE': r'\textasciitilde{}',
            'LATEXESCCARET': r'\textasciicircum{}',
        }
        for placeholder, escaped_seq in restorations.items():
            data = data.replace(placeholder, escaped_seq)
        return data
    else:
        return data


def generate_pdf(trade_data: dict, output_dir: str = None) -> str:
    """Public API for generating the Equity TRS PDF."""
    trade_data = _escape_latex(trade_data)
    filled_tex = fill_template(trade_data)
    if filled_tex:
        return compile_to_pdf(filled_tex, trade_data, output_dir)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", help="Path to trade JSON file", default=None)
    args = parser.parse_args()

    print("=" * 60)
    print("  EQUITY TRS CONFIRMATION GENERATOR (ISDA 2021/2002)")
    print("=" * 60)

    trade_data = load_trade_data(args.json)
    if not trade_data:
        return

    pdf_path = generate_pdf(trade_data)

    print("\n" + "=" * 60)
    if pdf_path:
        print(f"  ✅ SUCCESS: {pdf_path}")
    else:
        print("  ❌ FAILED")
    print("=" * 60)


if __name__ == "__main__":
    main()
