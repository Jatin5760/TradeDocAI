import json

def build_assistant_prompt(message: str, doc_type: str, schema: dict, current_data: dict, history: list) -> str:
    """
    Constructs the prompt with context (schema, filled data, history) for the form-aware assistant.
    """
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    # Build schema summary — field labels + keys for context
    def summarise_schema(s):
        lines = []
        sections = s.get("sections", {})
        if isinstance(sections, dict):
            for sec_key, sec in sections.items():
                lines.append(f"\nSection: {sec.get('title', sec_key)}")
                for sub in sec.get("subsections", []):
                    lines.append(f"  Subsection: {sub.get('title','')}")
                    for f in sub.get("fields", []):
                        req = "[required]" if f.get("required") else ""
                        lines.append(f"    - {f.get('label','')} ({f.get('key','')}): {f.get('type','')} {req}")
                for f in sec.get("fields", []):
                    req = "[required]" if f.get("required") else ""
                    lines.append(f"  - {f.get('label','')} ({f.get('key','')}): {f.get('type','')} {req}")
        elif isinstance(sections, list):
            for sec in sections:
                lines.append(f"\nSection: {sec.get('title', sec.get('id', ''))}")
                for sub in sec.get("subsections", []):
                    lines.append(f"  Subsection: {sub.get('title','')}")
                    for f in sub.get("fields", []):
                        req = "[required]" if f.get("required") else ""
                        lines.append(f"    - {f.get('label','')} ({f.get('key','')}): {f.get('type','')} {req}")
                for f in sec.get("fields", []):
                    req = "[required]" if f.get("required") else ""
                    lines.append(f"  - {f.get('label','')} ({f.get('key','')}): {f.get('type','')} {req}")
        return "\n".join(lines) if lines else json.dumps(s, indent=2)[:3000]

    schema_summary = summarise_schema(schema) if isinstance(schema, dict) else ""

    # Only show filled fields in context
    current_data = current_data or {}
    filled = {k: v for k, v in current_data.items() if v not in (None, "", [], {})}
    filled_str = json.dumps(filled, indent=2) if filled else "No fields filled in yet."

    # Conversation history (last 8 turns)
    history_str = ""
    for turn in history[-8:]:
        role = turn.get("role", "user")
        content = turn.get("content", turn.get("text", ""))
        role_label = "User" if role == "user" else "Assistant"
        history_str += f"{role_label}: {content}\n"

    prompt = f"""You are TradeDoc AI Assistant — a friendly expert assistant built into the TradeDoc AI platform.
You help users understand and fill in trade confirmation documents for financial derivatives.

DOCUMENT TYPE: {doc_display}

DOCUMENT SCHEMA (fields the user needs to fill):
{schema_summary}

CURRENT FORM DATA (filled so far):
{filled_str}

CONVERSATION HISTORY:
{history_str}
User: {message}

INSTRUCTIONS:
- Be CRISP and SHORT. 1-3 sentences max. No greetings, no fluff, no markdown. Get straight to the point.
- If asked about a field, explain it in one sentence with one example value. Do NOT say "I'm not aware" — always find and explain the closest matching field.
- For select/dropdown fields, simply state the available options and recommend the most common one.
- If the user asks why a field is needed, explain its purpose in one sentence.
- You can navigate the user. Append [NAVIGATE:page-name] at the end (e.g. [NAVIGATE:ai] or [NAVIGATE:dashboard]).
- Do NOT fabricate data. If truly unsure, say "Check with your counterparty."
- CRITICAL: Plain text ONLY — no bold (**), no italics (*), no backticks, no headings, no bullet lists, no numbered lists."""

    return prompt


def build_mistake_check_prompt(doc_type: str, current_data: dict, schema: dict) -> str:
    """Build prompt for Gemini to review ONLY filled form fields for mistakes. Never mention missing fields."""
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    # Extract field labels/keys for context
    fields_info = []
    sections = schema.get("sections", {})
    if isinstance(sections, dict):
        for sec_key, sec in sections.items():
            for f in sec.get("fields", []):
                fields_info.append(f"  - {f.get('label','')} ({f.get('key','')}): {'required' if f.get('required') else 'optional'}, type={f.get('type','')}")
            for sub in sec.get("subsections", []):
                for f in sub.get("fields", []):
                    fields_info.append(f"  - {f.get('label','')} ({f.get('key','')}): {'required' if f.get('required') else 'optional'}, type={f.get('type','')}")
    elif isinstance(sections, list):
        for sec in sections:
            for f in sec.get("fields", []):
                fields_info.append(f"  - {f.get('label','')} ({f.get('key','')}): {'required' if f.get('required') else 'optional'}, type={f.get('type','')}")

    filled = {k: v for k, v in (current_data or {}).items() if v not in (None, "", [], {})}
    filled_str = json.dumps(filled, indent=2) if filled else "No fields filled."

    return f"""You are a trade document validator. Review ONLY the FILLED fields in this {doc_display} form for errors. DO NOT comment on empty/missing fields — the user will ask about those separately.

SCHEMA FIELDS:
{chr(10).join(fields_info) if fields_info else 'No schema fields available'}

FILLED DATA (review ONLY these — ignore anything not listed here):
{filled_str}

CHECK FOR (only among filled fields):
1. Unusual or unrealistic amounts/dates
2. Nonsensical placeholder text (e.g., "test", "xyz", random characters) instead of real names/values
3. Inconsistent counterparty names across fields
4. Type mismatches (e.g., text where a date is expected)
5. Anything that looks like a copy-paste error or gibberish

CRITICAL RULES:
- ONLY review fields that appear in FILLED DATA above. If a field is empty, DO NOT mention it.
- NEVER say "missing" or "not filled" or "absent" — that's a separate feature the user will invoke explicitly.
- If you find issues in filled fields, list each as one plain sentence.
- If all filled fields look correct, just say "All filled fields look correct."
- Keep it CRISP and SHORT — 2-4 sentences max.
- Plain text ONLY — no markdown, no bold, no italics, no bullet lists."""


def build_missing_fields_prompt(doc_type: str, current_data: dict, schema: dict) -> str | None:
    """Build prompt for Gemini to list which required fields are still empty."""
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    # Collect all required fields and check which are unfilled
    all_required = []
    unfilled_required = []
    sections = schema.get("sections", {})
    if isinstance(sections, dict):
        for sec_key, sec in sections.items():
            sec_title = sec.get("title", sec_key)
            for f in sec.get("fields", []):
                if f.get("required"):
                    key = f.get("key", "")
                    label = f.get("label", key)
                    all_required.append((sec_title, label, key))
                    if not current_data.get(key) or current_data.get(key) in (None, "", [], {}):
                        unfilled_required.append((sec_title, label, key))
            for sub in sec.get("subsections", []):
                for f in sub.get("fields", []):
                    if f.get("required"):
                        key = f.get("key", "")
                        label = f.get("label", key)
                        all_required.append((sec_title, label, key))
                        if not current_data.get(key) or current_data.get(key) in (None, "", [], {}):
                            unfilled_required.append((sec_title, label, key))

    total_required = len(all_required)
    missing_count = len(unfilled_required)

    if missing_count == 0:
        return None  # No missing required fields — caller should handle

    missing_lines = "\n".join([f"  - {label} ({key}) [Section: {sec}]" for sec, label, key in unfilled_required])
    all_lines = "\n".join([f"  - {label} ({key}) [Section: {sec}]" for sec, label, key in all_required])

    return f"""The user is filling a {doc_display} form and wants to know which required fields are still empty.

ALL REQUIRED FIELDS ({total_required} total):
{all_lines}

MISSING REQUIRED FIELDS ({missing_count} remaining):
{missing_lines}

TASK: Tell the user concisely which fields they still need to fill. Group by section if possible.

CRITICAL RULES:
- List only the missing required fields. Be specific with field names.
- Group by section for readability (e.g., "In Party Information: Counterparty Name, Execution Date").
- Keep it CRISP — 2-4 sentences max.
- If only 1-2 fields remain, make it encouraging: "Almost done! Just fill in..."
- Plain text ONLY — no markdown, no bold, no bullet lists, no headings."""


def build_field_explain_prompt(doc_type: str, user_msg: str, schema: dict) -> str:
    """Build prompt for Gemini to explain what a form field means."""
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    # Extract all field labels/keys for Gemini to find the right one
    fields_summary = []
    sections = schema.get("sections", {})
    if isinstance(sections, dict):
        for sec_key, sec in sections.items():
            for f in sec.get("fields", []):
                fields_summary.append(f"{f.get('label','')} (key: {f.get('key','')}, type: {f.get('type','')})")
            for sub in sec.get("subsections", []):
                for f in sub.get("fields", []):
                    fields_summary.append(f"{f.get('label','')} (key: {f.get('key','')}, type: {f.get('type','')})")
    elif isinstance(sections, list):
        for sec in sections:
            for f in sec.get("fields", []):
                fields_summary.append(f"{f.get('label','')} (key: {f.get('key','')}, type: {f.get('type','')})")

    return f"""The user is filling a {doc_display} form and is asking about a specific field.

USER QUESTION: "{user_msg}"

AVAILABLE FIELDS IN THIS FORM:
{chr(10).join(fields_summary) if fields_summary else 'No fields available'}

INSTRUCTIONS:
1. ALWAYS identify and explain the closest matching field from the list. NEVER say "I'm not aware" or "can't identify" — always pick the best match.
2. Explain what it means in one short sentence for {doc_display}.
3. Give 1 realistic example value.
4. If it's a select/dropdown field, list the available options briefly.
5. Keep it under 50 words. Be direct, no fluff.
CRITICAL: Plain text ONLY — no markdown. Just a short, direct sentence."""
