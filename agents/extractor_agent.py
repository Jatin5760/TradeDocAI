"""
Extractor Agent
=================
Uses Gemini to extract trade data from an email into the correct JSON schema.
Loads the matching schema (FX, IRS, or CDS) and asks Gemini to populate every field.
"""

import json
import re
import os
from .gemini_helper import call_gemini
from .state import DocForgeState

# Path to UI schemas (Next.js static assets)
_SCHEMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ui-app", "public", "schemas")


def _load_schema(doc_type: str) -> dict:
    """Load the JSON schema for the given document type."""
    if doc_type == "fx_ndf":
        filename = "fx_schema.json"
    elif doc_type == "cds":
        filename = "cds_schema.json"
    elif doc_type == "equity_trs":
        filename = "equity_trs_schema.json"
    else:
        filename = "irs_schema.json"
    path = os.path.join(_SCHEMA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _extract_field_keys(schema: dict, doc_type: str, exhibit: str = "", termination_type: str = "", model_type: str = "") -> dict:
    """
    Walk the schema and extract all field keys with their labels,
    filtered by the appropriate exhibit / termination type / model type.
    Returns a dict: { key: label }
    """
    fields = {}

    if doc_type == "fx_ndf":
        for section in schema.get("sections", []):
            for f in section.get("fields", []):
                fields[f["key"]] = f.get("label", f["key"])

    elif doc_type == "cds":
        # CDS schema: sections is an object, all sections are always_show
        for sec_key, section in schema.get("sections", {}).items():
            if section.get("fields"):
                for f in section["fields"]:
                    fields[f["key"]] = f.get("label", f["key"])

    elif doc_type == "equity_trs":
        # Always include model_type itself
        fields["model_type"] = "Financing Model: 'I' for Term Rate, 'II' for Overnight"
        for sec_key, section in schema.get("sections", {}).items():
            show_for = section.get("show_for_models", None)
            if show_for and model_type and model_type not in show_for:
                continue
            # top-level fields
            for f in section.get("fields", []):
                fields[f["key"]] = f.get("label", f["key"])
            # subsections
            for sub in section.get("subsections", []):
                for f in sub.get("fields", []):
                    fields[f["key"]] = f.get("label", f["key"])

    else:
        # IRS schema
        fields["exhibit"] = "Exhibit Type (e.g. II-A)"
        fields["termination_type"] = "Termination Type (empty string, Optional, or Mandatory)"

        for sec_key, section in schema.get("sections", {}).items():
            if section.get("show_for_exhibits"):
                if exhibit and exhibit not in section["show_for_exhibits"]:
                    continue
            if section.get("show_for_termination"):
                if section["show_for_termination"] != termination_type:
                    continue
            if not section.get("always_show") and not section.get("show_for_exhibits") and not section.get("show_for_termination"):
                continue

            if section.get("subsections"):
                for sub in section["subsections"]:
                    for f in sub.get("fields", []):
                        fields[f["key"]] = f.get("label", f["key"])
            if section.get("fields"):
                for f in section["fields"]:
                    fields[f["key"]] = f.get("label", f["key"])

    return fields


# ═══════════════════════════════════════════════
# FIELD MAPPING HINTS
# Tells Gemini exactly what email patterns map
# to which JSON keys. This is the key to accuracy.
# ═══════════════════════════════════════════════

IRS_FIELD_HINTS = """
CRITICAL FIELD MAPPING GUIDE — read this carefully:

Party & Agreement fields:
- "party_a_name" ← Look for "Party A:" or the first named institution
- "party_a_lei" ← Look for "Party A LEI:" or "LEI:" next to Party A
- "party_a_attn" ← Look for "Attention:" under Party A
- "party_a_address" ← Look for "Address:" under Party A
- "party_b_name" ← Look for "Party B:" or the second named institution
- "party_b_lei" ← Look for "Party B LEI:" or "LEI:" next to Party B
- "party_b_attn" ← Look for "Attention:" under Party B
- "party_b_address" ← Look for "Address:" under Party B
- "confirmation_date" ← The date of the email/letter itself
- "transaction_title" ← Look for "Transaction Type:" or the main title. Copy the FULL title exactly, e.g. "Interest Rate Swap Transaction" NOT just "Interest Rate Swap"
- "isda_agreement_date" ← Look for "ISDA Master Agreement dated..."

General Terms:
- "notional_amount" ← Look for "Notional Amount:" (include currency, e.g. "USD 50,000,000")
- "trade_date" ← Look for "Trade Date:"
- "effective_date" ← Look for "Effective Date:"
- "termination_date" ← Look for "Termination Date:"
- "calculation_agent" ← Look for "Calculation Agent:"

Fixed Amounts (Exhibit II-A):
- "fixed_currency_amount" ← This is a MONETARY AMOUNT for the fixed leg (e.g. "USD 50,000,000"). Only set if a separate currency amount is listed for the fixed payer. Leave EMPTY "" if only a notional amount is given. Do NOT put the payer name here.
- "fixed_payment_dates" ← Look for "Payment Dates:" under FIXED section. Include frequency info like "Semi-Annual" and the full payment date description
- "fixed_rate_or_amount" ← Look for "Fixed Rate:" (e.g. "3.75% per annum")
- "fixed_day_count" ← Look for "Fixed Rate Day Count:" or "Day Count Fraction:" under fixed section (e.g. "30/360")
- "fixed_compounding" ← Look for "Compounding:" under FIXED section (e.g. "Inapplicable" or "Applicable")
- "fixed_delayed_payment" ← Look for "Delayed Payment:" or "Early Payment:"
- "fixed_negative_rate_method" ← Look for "Negative Interest Rate Method:"

Floating Amounts (Exhibit II-A):
- "floating_currency_amount" ← This is a MONETARY AMOUNT for the floating leg (e.g. "USD 50,000,000"). Only set if a separate currency amount is listed for the floating payer. Leave EMPTY "" if only a notional amount is given. Do NOT put the payer name here.
- "floating_payment_dates" ← Look for "Payment Dates:" under FLOATING section. Include frequency info like "Quarterly" and the full payment date description
- "floating_rate_option" ← Look for "Floating Rate Index:" or "Floating Rate Option:" (e.g. "USD-SOFR-COMPOUND")
- "designated_maturity" ← Look for "Designated Maturity:" (e.g. "3 Months")
- "spread" ← Look for "Spread:" (e.g. "0.25% per annum")
- "floating_day_count" ← Look for "Floating Rate Day Count:" or "Day Count Fraction:" under floating section (e.g. "Actual/360")
- "reset_dates" ← Look for "Reset Dates:" (e.g. "First day of each Calculation Period")
- "floating_averaging" ← Look for "Method of Averaging:"
- "discounting" ← Look for "Discounting:"
- "floating_compounding" ← Look for "Compounding:" under the FLOATING AMOUNTS section (NOT the fixed section). e.g. "Inapplicable" or "Applicable"

Logistics:
- "party_a_office" ← Look for "Party A Office:" (e.g. "London")
- "party_b_office" ← Look for "Party B Office:" (e.g. "New York")
- "party_a_accounts" ← Look for "Account for Party A:" or "Account Details"
- "party_b_accounts" ← Look for "Account for Party B:" or "Account Details"

Custom Clauses:
- "custom_clauses" ← Look for ADDITIONAL PROVISIONS, extra terms, netting clauses, business day conventions, etc. Return as array of {{"title": "...", "description": "..."}}.
  Example: {{"title": "Netting", "description": "Payments due on the same date..."}}
"""

EQUITY_TRS_FIELD_HINTS = """
CRITICAL FIELD MAPPING GUIDE FOR EQUITY TOTAL RETURN SWAP (TRS):

Party & Agreement:
- "party_a_name" ← Party A (Equity Amount Payer / Total Return Payer)
- "party_b_name" ← Party B (Floating Amount Payer)
- "party_b_attn" ← Attention line for Party B
- "party_b_address" ← Address for Party B
- "confirmation_date" ← Date of the confirmation letter
- "transaction_title" ← Full title e.g. "Equity Total Return Swap Confirmation"
- "isda_agreement_date" ← ISDA Master Agreement date

General Terms:
- "trade_date" ← Trade Date
- "effective_date" ← Effective Date
- "termination_date" ← Termination Date
- "calculation_agent" ← Calculation Agent
- "unscheduled_holiday_adjustment" ← Business day convention for unscheduled holidays

Floating Amount (common to both models):
- "floating_amount_payer" ← Who pays the floating amount
- "notional_amount" ← Notional Amount (e.g. USD 10,000,000)
- "floating_payment_dates" ← Payment dates for floating leg
- "floating_period_end_dates" ← Period end dates
- "spread" ← Spread over benchmark (e.g. 1.25% per annum)
- "day_count_fraction" ← Day count fraction (ACT/360, 30/360, etc.)
- "reset_dates" ← Reset dates for the floating rate
- "negative_interest_rate_method" ← Zero Floor or Negative Rates Apply
- "rounding" ← Rounding convention
- "delayed_payment" ← Delayed/Early payment terms
- "method_of_averaging" ← Method of Averaging
- "rate_cut_off_dates" ← Rate cut-off dates
- "successor_benchmark" ← Fallback benchmark
- "business_days" ← Business day centers

Model I — Term Rate Financing (SOFR/EURIBOR):
- "model_type" ← Set to "I"
- "floating_rate_option" ← e.g. SOFR, USD-LIBOR, EURIBOR
- "applicable_benchmark" ← e.g. USD SOFR
- "initial_floating_rate" ← Initial rate if fixed for first period
- "designated_maturity" ← e.g. 3 Months
- "fixing_day" ← e.g. 2 Business Days prior
- "fixing_time" ← e.g. 11:00 AM NY Time
- "linear_interpolation" ← Applicable / Not Applicable
- "compounding_applicable" ← "true" or "false"
- "compounding_type" ← e.g. Daily Compounding
- "compounding_dates" ← e.g. Each Business Day

Model II — Overnight Financing (\u20acSTR/SOFR overnight):
- "model_type" ← Set to "II"
- "floating_rate_option" ← e.g. \u20acSTR, SONIA, SOFR
- "applicable_benchmark" ← e.g. EUR Short-Term Rate
- "fixing_day" ← e.g. 1 TARGET Business Day prior
- "fixing_time" ← e.g. 9:00 AM CET
- "compounding_averaging_applicable" ← "true" or "false"
- "compounding" ← Applicable / Not Applicable
- "averaging" ← Applicable / Not Applicable
- "lookback" ← e.g. 5 Business Days
- "observation_period_shift" ← Applicable / Not Applicable
- "set_in_advance" ← Yes / No
- "lockout" ← e.g. 2 Business Days
- "daily_capped_floored_rate" ← e.g. Daily Floor at 0%
- "day_count_basis" ← ACT/360 etc.
- "index_provisions_applicable" ← "true" or "false"
- "index_method" ← e.g. Compounded Index
- "index_set_advance" ← Yes / No
- "index_observation_period_shift" ← Applicable / Not Applicable
- "index_day_count_basis" ← ACT/360 etc.
"""

FX_FIELD_HINTS = """
CRITICAL FIELD MAPPING GUIDE:

- "reference_currency" ← The non-deliverable currency code (e.g. "BRL", "CNY")
- "settlement_currency" ← The settlement currency code (e.g. "USD")
- "trade_date" ← Look for "Trade Date:"
- "reference_currency_full" ← Full name of reference currency (e.g. "Brazilian Real (BRL)")
- "notional_amount" ← Look for "Notional Amount:" (e.g. "USD 5,000,000")
- "forward_rate" ← Look for "Forward Rate:" or "NDF Rate:" (just the number, e.g. "5.25")
- "reference_currency_notional_amount" ← Look for reference currency amount (e.g. "BRL 26,250,000")
- "buyer" ← Look for "Buyer:" or "Reference Currency Buyer:"
- "seller" ← Look for "Seller:" or "Reference Currency Seller:"
- "settlement_currency_full" ← Full name (e.g. "U.S. Dollars")
- "settlement_date" ← Look for "Settlement Date:"
- "settlement_type" ← "Non-Deliverable" or "Deliverable"
- "settlement_rate_option" ← Look for "Settlement Rate Option:" or "Fixing Source:"
- "valuation_date" ← Look for "Valuation Date:" or "Fixing Date:"
- "price_source_disruption" ← Look for "Price Source Disruption:"
- "disruption_fallbacks" ← Array of fallback methods (e.g. ["Valuation Postponement", "..."])
- "other_terms" ← Array of {{"title": "...", "description": "..."}} for any extra terms
- "calculation_agent" ← Look for "Calculation Agent:"
"""

CDS_FIELD_HINTS = """
CRITICAL FIELD MAPPING GUIDE FOR CREDIT DEFAULT SWAP (CDS):

Party & Agreement fields:
- "party_a_name" ← The PROTECTION BUYER (Floating Rate Payer). Look for "Party A:", "Protection Buyer:", or "Floating Rate Payer:"
- "party_a_lei" ← Look for "Party A LEI:" or "LEI:" next to Party A
- "party_b_name" ← The PROTECTION SELLER (Fixed Rate Payer). Look for "Party B:", "Protection Seller:", or "Fixed Rate Payer:"
- "party_b_lei" ← Look for "Party B LEI:" or "LEI:" next to Party B
- "confirmation_date" ← The date of the confirmation letter itself
- "transaction_title" ← Full title e.g. "European Corporate Single Name Credit Default Swap"
- "isda_agreement_date" ← Look for "ISDA Master Agreement dated..."

General Terms:
- "transaction_type" ← Look for "Transaction Type:" (e.g. "Standard European Corporate")
- "trade_date" ← Look for "Trade Date:"
- "effective_date" ← Look for "Effective Date:"
- "scheduled_termination_date" ← Look for "Scheduled Termination Date:" (the protection end date)
- "calculation_agent" ← Look for "Calculation Agent:"
- "reference_entity" ← The company being insured against default. Look for "Reference Entity:"
- "reference_entity_lei" ← LEI of the Reference Entity
- "reference_obligation" ← The specific bond/loan used as reference. Look for "Reference Obligation:" or "Standard Reference Obligation:"
- "reference_obligation_cusip" ← CUSIP or ISIN of the reference obligation
- "seniority_level" ← Look for "Seniority Level:" (e.g. "Senior Level" or "Subordinated Level")
- "standard_reference_obligation" ← "Applicable" or "Not Applicable"

Fixed Payments (Premium Leg):
- "notional_amount" ← The Calculation Amount / Notional (e.g. "EUR 10,000,000")
- "fixed_rate" ← The credit spread in basis points per annum (e.g. "100" for 100bps). Look for "Fixed Rate:", "Credit Spread:", or "Running Spread:"
- "fixed_day_count" ← Look for "Fixed Rate Day Count Fraction:" (e.g. "Actual/360")
- "fixed_payment_dates" ← Look for "Fixed Rate Payer Payment Dates:" (e.g. "March 20, June 20, September 20 and December 20")
- "business_day_convention" ← Look for "Business Day Convention:" (e.g. "Following")
- "business_day_centers" ← Look for "Business Day:" or "Business Centers:" (e.g. "London, TARGET")
- "initial_payment_payer" ← Who makes the initial premium payment (e.g. "Party B")
- "initial_payment_amount" ← The upfront payment amount (e.g. "EUR 25,000")

Floating Payment & Settlement:
- "credit_event_notice_after_restructuring" ← "Applicable" or "Not Applicable" for Restructuring credit event
- "settlement_method" ← Look for "Settlement Method:" or "Settlement Terms:" (e.g. "Auction Settlement", "Physical Settlement", "Cash Settlement")
- "physical_settlement_period" ← For Physical Settlement, the settlement period
- "deliverable_obligation_category" ← For Physical Settlement (e.g. "Bond or Loan")
- "deliverable_obligation_characteristics" ← For Physical Settlement
- "escrow" ← "Applicable" or "Not Applicable"
- "valuation_method" ← For Cash Settlement (e.g. "Highest")
- "valuation_date" ← For Cash Settlement (e.g. "Single Valuation Date")
- "reference_price" ← Look for "Reference Price:" (typically "100%")

Additional Provisions:
- "fixed_recovery_final_price" ← For Fixed Recovery CDS, the pre-agreed final price (e.g. "40%")
- "recovery_lock_reference_price" ← For Recovery Lock CDS (e.g. "40%")

Logistics:
- "party_a_office" ← Look for "Party A Office:" or "Office for Party A:"
- "party_b_office" ← Look for "Party B Office:" or "Office for Party B:"
- "party_a_accounts" ← Look for "Account for Party A:" or "Account Details for Party A:"
- "party_b_accounts" ← Look for "Account for Party B:" or "Account Details for Party B:"
- "party_a_notice_details" ← Party A contact details for notices
- "party_b_notice_details" ← Party B contact details for notices
- "party_a_signatory_title" ← e.g. "Managing Director"
- "party_b_signatory_title" ← e.g. "Portfolio Manager"
- "broker_arranger_details" ← Broker or arranger details

Custom Clauses:
- "custom_clauses" ← Additional provisions, special terms, etc. Return as array of {{"title": "...", "description": "..."}}.
"""


EXTRACTION_PROMPT = """You are an expert trade documentation data extractor for derivatives markets.
You have PERFECT attention to detail and extract EVERY piece of data from emails.

DOCUMENT TYPE: {doc_type}
{exhibit_info}

YOUR TASK: Extract ALL trade data from the email below into a JSON object.

{field_hints}

Here are ALL the JSON keys you must populate:
{fields_description}

STRICT RULES:
1. Extract EVERY piece of data mentioned in the email. Do NOT skip any fields.
2. For fields you truly cannot find in the email, use an empty string "".
3. For "custom_clauses" or "other_terms", return an ARRAY of objects: [{{"title": "...", "description": "..."}}]
4. For "disruption_fallbacks", return an ARRAY of strings.
5. Dates: use "DD Month YYYY" format (e.g. "01 March 2026").
6. Currency amounts: include currency code (e.g. "USD 50,000,000").
7. Rates: include "per annum" where appropriate (e.g. "3.75% per annum").
8. Copy exact names, numbers, and terms from the email — do NOT paraphrase.
9. For payment dates fields, include BOTH the frequency (e.g. "Semi-Annual") AND the full date description from the email.
10. For payer fields (like "fixed_currency_amount", "floating_currency_amount"), extract WHO is paying (e.g. "Party A (Goldman Sachs International)").
11. For compounding fields, look in BOTH the Fixed and Floating sections separately.
12. Return ONLY valid JSON — no markdown, no code fences, no explanation.
{extra_rules}

EMAIL CONTENT:
{email_text}

Return the JSON object now:"""


def extract_trade_data(state: DocForgeState) -> DocForgeState:
    """LangGraph node: extract trade data from email into JSON."""
    email_text = state.get("email_text", "")
    doc_type = state.get("doc_type", "fx_ndf")
    exhibit = state.get("exhibit", "")
    termination_type = state.get("termination_type", "")
    model_type = state.get("model_type", "")

    if not email_text.strip():
        return {**state, "error": "No email text provided"}

    if state.get("error"):
        return state  # propagate previous error

    try:
        schema = _load_schema(doc_type)
        field_map = _extract_field_keys(schema, doc_type, exhibit, termination_type, model_type)

        # Build fields description
        fields_desc = "\n".join(
            f'  - "{k}": {v}'
            for k, v in field_map.items()
        )

        exhibit_info = ""
        if doc_type == "irs" and exhibit:
            exhibit_info = f"IRS EXHIBIT: {exhibit}\nTERMINATION TYPE: {termination_type or 'None'}"
        elif doc_type == "cds":
            exhibit_info = "CDS CONFIRMATION — 2014 ISDA Credit Derivatives Definitions"
        elif doc_type == "equity_trs":
            exhibit_info = f"EQUITY TRS CONFIRMATION — Model {model_type or 'I'} ({'Term Rate Financing' if model_type != 'II' else 'Overnight Financing'})"

        extra_rules = ""
        if doc_type == "irs":
            extra_rules = (
                f'\n13. Set "exhibit" to exactly "{exhibit}".'
                f'\n14. Set "termination_type" to exactly "{termination_type}".'
            )
        elif doc_type == "cds":
            extra_rules = (
                '\n13. For "fixed_rate", extract the numeric value only (basis points), e.g. "100" not "100bps".'
                '\n14. For "credit_event_notice_after_restructuring", use "Applicable" or "Not Applicable".'
            )
        elif doc_type == "equity_trs":
            extra_rules = (
                f'\n13. Set "model_type" to exactly "{model_type or "I"}".'
                '\n14. For boolean-like fields (compounding_applicable, compounding_averaging_applicable, index_provisions_applicable), use "true" or "false".'
            )

        if doc_type == "irs":
            field_hints = IRS_FIELD_HINTS
        elif doc_type == "cds":
            field_hints = CDS_FIELD_HINTS
        elif doc_type == "equity_trs":
            field_hints = EQUITY_TRS_FIELD_HINTS
        else:
            field_hints = FX_FIELD_HINTS

        doc_type_label = {
            "fx_ndf": "FX NDF",
            "irs": "IRS Confirmation",
            "cds": "CDS Confirmation",
            "equity_trs": f"Equity TRS Confirmation (Model {model_type or 'I'})"
        }.get(doc_type, doc_type.upper())

        prompt = EXTRACTION_PROMPT.format(
            doc_type=doc_type_label,
            exhibit_info=exhibit_info,
            field_hints=field_hints,
            fields_description=fields_desc,
            email_text=email_text,
            extra_rules=extra_rules
        )

        text = call_gemini(prompt, model_name=state.get("model"))

        # Robustly strip markdown code fences (e.g. ```json ... ```)
        # Must strip whitespace BEFORE checking endswith, old code had this bug
        text = re.sub(r'^```[a-zA-Z]*\s*\n', '', text)   # remove opening ```json
        text = re.sub(r'\n```\s*$', '', text.rstrip())    # remove closing ```
        text = text.strip()

        # Safety net: extract just the outermost JSON object if stray text remains
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)

        extracted = json.loads(text)
        print(f"  ✅ Extraction complete: {len(extracted)} fields populated")

        # Quick quality check: count non-empty fields
        filled = sum(1 for v in extracted.values() if v and v != "" and v != [])
        print(f"  📊 {filled}/{len(extracted)} fields have data")

        return {
            **state,
            "extracted_json": extracted,
            "error": ""
        }

    except Exception as e:
        print(f"  ❌ Extraction failed: {e}")
        return {**state, "error": f"Extraction failed: {str(e)}"}
