"""
FX NDF Confirmation Generator — Streamlit UI
=============================================
Upload a JSON file → Generate PDF → View in browser

Run with:
    streamlit run ui.py
"""

import streamlit as st
import json
import os
import base64
import tempfile
from generate_fx_ndf import load_trade_data, fill_template, compile_to_pdf

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(_BASE_DIR, "templates")
OUTPUT_DIR   = os.path.join(_BASE_DIR, "output confirmations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="FX Trade Confirmation Generator",
    page_icon="📄",
    layout="wide"
)

# ─────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────
st.title("📄 FX NDF Trade Confirmation Generator")
st.markdown("Upload a JSON trade file to generate an official ISDA-style confirmation PDF.")
st.divider()

# ─────────────────────────────────────────────
# TWO COLUMN LAYOUT
# ─────────────────────────────────────────────
col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("📂 Upload Trade JSON")

    # File uploader
    uploaded_file = st.file_uploader(
        "Choose a JSON file",
        type=["json"],
        help="Upload a trade data JSON file"
    )

    # Option to use sample data
    use_sample = st.checkbox(
        "Use built-in sample trade data",
        value=False,
        help="Use the built-in BRL/USD sample trade if you don't have a JSON file"
    )

    st.divider()

    # Generate button
    generate_btn = st.button(
        "⚡ Generate Confirmation PDF",
        type="primary",
        use_container_width=True
    )

    # ── Show uploaded JSON preview ──
    if uploaded_file is not None:
        st.subheader("📋 Trade Data Preview")
        try:
            trade_json = json.load(uploaded_file)
            uploaded_file.seek(0)  # reset for re-reading later
            st.json(trade_json)
        except Exception as e:
            st.error(f"❌ Invalid JSON file: {e}")

    elif use_sample:
        st.subheader("📋 Sample Trade Data")
        from generate_fx_ndf import SAMPLE_TRADE
        st.json(SAMPLE_TRADE)


with col2:
    st.subheader("📄 Generated Confirmation")

    # ── GENERATE on button click ──
    if generate_btn:

        # Validate input
        if not uploaded_file and not use_sample:
            st.warning("⚠️ Please upload a JSON file or check 'Use built-in sample trade data'")

        else:
            with st.spinner("⏳ Generating confirmation PDF..."):
                try:
                    # Step 1 — Load trade data
                    if uploaded_file:
                        uploaded_file.seek(0)
                        trade_data = json.load(uploaded_file)
                        st.toast("✅ Trade data loaded from file")
                    else:
                        from generate_fx_ndf import SAMPLE_TRADE
                        trade_data = SAMPLE_TRADE
                        st.toast("✅ Using sample trade data")

                    # Step 2 — Fill Jinja2 template
                    filled_tex = fill_template(trade_data, TEMPLATE_DIR)
                    st.toast("✅ Template filled successfully")

                    # Step 3 — Compile to PDF
                    pdf_path = compile_to_pdf(filled_tex, trade_data)

                    if pdf_path and os.path.exists(pdf_path):
                        st.toast("✅ PDF compiled successfully")
                        st.success(f"✅ PDF generated successfully!")

                        # ── Display PDF in browser ──
                        with open(pdf_path, "rb") as f:
                            pdf_bytes = f.read()

                        # Embed PDF viewer
                        b64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")
                        pdf_display = f"""
                            <iframe
                                src="data:application/pdf;base64,{b64_pdf}"
                                width="100%"
                                height="800px"
                                type="application/pdf"
                                style="border: 1px solid #ddd; border-radius: 8px;">
                            </iframe>
                        """
                        st.markdown(pdf_display, unsafe_allow_html=True)

                        # ── Download button ──
                        st.download_button(
                            label="⬇️ Download PDF",
                            data=pdf_bytes,
                            file_name=os.path.basename(pdf_path),
                            mime="application/pdf",
                            use_container_width=True
                        )

                    else:
                        st.error("❌ PDF compilation failed! Check LaTeX errors below.")

                except json.JSONDecodeError as e:
                    st.error(f"❌ Invalid JSON: {e}")
                except Exception as e:
                    st.error(f"❌ Error: {e}")
                    st.exception(e)

    else:
        # Placeholder when nothing generated yet
        st.info("👈 Upload a JSON file and click **Generate Confirmation PDF** to get started.")

        # Show example JSON structure
        st.subheader("📝 Expected JSON Structure")
        example = {
            "reference_currency": "BRL",
            "settlement_currency": "USD",
            "trade_date": "01 March 2026",
            "reference_currency_full": "Brazilian Real (BRL)",
            "notional_amount": "USD 5,000,000",
            "forward_rate": "5.25",
            "reference_currency_notional_amount": "BRL 26,250,000",
            "buyer": "Goldman Sachs International",
            "seller": "Banco Bradesco S.A.",
            "settlement_currency_full": "U.S. Dollars",
            "settlement_date": "03 June 2026...",
            "settlement_type": "Non-Deliverable",
            "settlement_rate_option": "BRL PTAX (BRL09)",
            "valuation_date": "01 June 2026...",
            "price_source_disruption": "Applicable",
            "disruption_fallbacks": [
                "Valuation Postponement",
                "Calculation Agent Determination of Settlement Rate"
            ],
            "other_terms": [
                {
                    "title": "Maximum Days of Postponement",
                    "description": "Fourteen (14) calendar days"
                }
            ],
            "calculation_agent": "Goldman Sachs International"
        }
        st.json(example)

# ─────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────
st.divider()
st.caption("Virtusa Jatayu Season 5 — AI/ML Trade Confirmation Automation POC | Use Case 1")