import json


def _compact_value(val, max_len: int = 80) -> str:
    if isinstance(val, str):
        text = val.strip()
    else:
        try:
            text = json.dumps(val, ensure_ascii=True)
        except Exception:
            text = str(val)
    if len(text) > max_len:
        return text[: max_len - 3] + "..."
    return text


def _matches_show_when(show_when: dict | None, data: dict) -> bool:
    if not show_when:
        return True
    field = show_when.get("field")
    target_val = show_when.get("value")
    operator = show_when.get("operator") or "equal"
    src_val = data.get(field)
    if operator == "not_equal":
        return src_val != target_val
    return src_val == target_val


def _section_is_visible(section: dict, doc_type: str, data: dict) -> bool:
    if doc_type == "irs":
        exhibits = section.get("show_for_exhibits") or []
        if exhibits and data.get("exhibit") not in exhibits:
            return False
        termination = section.get("show_for_termination")
        if termination and data.get("termination_type") != termination:
            return False
        if not (section.get("always_show") or exhibits or termination):
            return False
    elif doc_type == "equity_trs":
        models = section.get("show_for_models") or []
        if models and data.get("model_type") not in models:
            return False
    if not _matches_show_when(section.get("show_when"), data):
        return False
    return True


def _field_is_visible(field: dict, data: dict) -> bool:
    return _matches_show_when(field.get("show_when"), data)


def _iter_visible_fields(schema: dict, doc_type: str, data: dict):
    sections = schema.get("sections", {})
    if isinstance(sections, list):
        for sec in sections:
            if not _section_is_visible(sec, doc_type, data):
                continue
            for f in sec.get("fields", []) or []:
                if _field_is_visible(f, data):
                    yield sec.get("title", sec.get("id", "")), f
            for sub in sec.get("subsections", []) or []:
                for f in sub.get("fields", []) or []:
                    if _field_is_visible(f, data):
                        yield sub.get("title", sec.get("title", "")), f
    elif isinstance(sections, dict):
        for sec_key, sec in sections.items():
            if not _section_is_visible(sec, doc_type, data):
                continue
            for f in sec.get("fields", []) or []:
                if _field_is_visible(f, data):
                    yield sec.get("title", sec_key), f
            for sub in sec.get("subsections", []) or []:
                for f in sub.get("fields", []) or []:
                    if _field_is_visible(f, data):
                        yield sub.get("title", sec.get("title", sec_key)), f

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

    filled = {k: v for k, v in (current_data or {}).items() if v not in (None, "", [], {})}
    filled_keys = set(filled.keys())

    fields_info = []
    for _, f in _iter_visible_fields(schema, doc_type, current_data or {}):
        if f.get("key") in filled_keys:
            fields_info.append(
                f"  - {f.get('label','')} ({f.get('key','')}): {'required' if f.get('required') else 'optional'}, type={f.get('type','')}"
            )

    compact_filled = {k: _compact_value(v) for k, v in filled.items()}
    filled_str = json.dumps(compact_filled, ensure_ascii=True) if compact_filled else "No fields filled."

    return f"""Review ONLY filled fields in {doc_display}. Ignore empty fields.
Filled: {filled_str}
Context: {chr(10).join(fields_info) if fields_info else 'none'}
Check for nonsense text, bad dates, inconsistent names, type mismatches.
Reply in 2-4 plain text sentences — no markdown, no bold, no bullet lists, no headings.
If no issues, end with: "No obvious issues found — everything looks good." """


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
    data = current_data or {}
    for sec_title, f in _iter_visible_fields(schema, doc_type, data):
        if f.get("required"):
            key = f.get("key", "")
            label = f.get("label", key)
            all_required.append((sec_title, label, key))
            if not data.get(key) or data.get(key) in (None, "", [], {}):
                unfilled_required.append((sec_title, label, key))

    total_required = len(all_required)
    missing_count = len(unfilled_required)

    if missing_count == 0:
        return None  # No missing required fields — caller should handle

    missing_lines = "\n".join([f"  - {label} ({key}) [Section: {sec}]" for sec, label, key in unfilled_required])
    all_lines = "\n".join([f"  - {label} ({key}) [Section: {sec}]" for sec, label, key in all_required])

    return f"""{doc_display}: {missing_count}/{total_required} required fields missing.
{missing_lines}
Reply in 2-4 plain text sentences only — no markdown, no bullet lists, no bold, no headings.
Group remaining fields by section inline, like: "In Party Information: Counterparty Name and Execution Date. In Trade Details: Notional Amount."
If only 1-2 fields remain, make it encouraging: "Almost done! Just fill in..." Keep it crisp."""


def build_field_explain_prompt(doc_type: str, field_key: str, field_label: str, resolved_field: dict | None) -> str:
    """Build prompt for Gemini to explain ONE specific form field — the one the user clicked.
    
    The server resolves the exact field from the schema before calling this.
    Only that single field's info is sent to Gemini — NOT the entire schema.
    """
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    if not resolved_field:
        return f"""Explain "{field_label}" in {doc_display}.
Reply in 2-3 plain text sentences — no markdown, no bullet lists, no bold, no headings.
Include meaning, a quick example, and a practical tip. Under 60 words."""

    field_type = resolved_field.get("type", "text")
    field_required = resolved_field.get("required", False)
    field_placeholder = resolved_field.get("placeholder", "")
    field_options = resolved_field.get("options", None)

    # Build a tight, focused prompt with only this one field
    options_str = ""
    if field_type == "select" and field_options:
        opt_labels = []
        for o in field_options:
            if isinstance(o, dict):
                opt_labels.append(o.get("label", o.get("value", "")))
            else:
                opt_labels.append(str(o))
        if opt_labels:
            options_str = f"\nDropdown options: {', '.join(opt_labels)}"

    return f"""User clicked "{field_label}" ({field_type}) in {doc_display}. Required: {'Yes' if field_required else 'No'}.{options_str}
Reply in 2-3 plain text sentences — no markdown, no bullet lists, no bold, no headings.
Include: meaning, a short example, and a practical tip. If select, ALWAYS identify and recommend the best matching option from the list. Never say you're not aware — pick the closest one. Under 70 words."""


def build_common_mistakes_prompt(doc_type: str) -> str:
    """Build prompt for Gemini to list common mistakes people make on this document type.
    No schema needed — purely domain knowledge about the trade document type."""
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    return f"""List 3-4 common mistakes when filling {doc_display}.
Reply in 3-4 plain text sentences — no markdown, no bullet lists, no bold, no headings.
Each mistake as its own short sentence. Under 80 words."""


def build_form_overview_prompt(doc_type: str) -> str:
    """Build prompt for Gemini to explain what the form is, where it's used, with examples.
    No schema needed — purely domain knowledge."""
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper())

    return f"""Explain {doc_display}: what it is, where used, 1-2 examples.
Reply in 2-4 plain text sentences — no markdown, no bullet lists, no bold, no headings. Under 70 words."""


def build_casual_chat_prompt(doc_type: str, user_msg: str) -> str:
    """Lightweight prompt for casual conversation — NO schema dump, fast responses."""
    doc_name_map = {
        "fx_ndf":     "FX Non-Deliverable Forward (NDF)",
        "irs":        "Interest Rate Swap (IRS) Confirmation",
        "cds":        "Credit Default Swap (CDS) Confirmation",
        "equity_trs": "Equity Total Return Swap (TRS) Confirmation",
    }
    doc_display = doc_name_map.get(doc_type, doc_type.upper()) if doc_type else "a trade confirmation"

    return f"""User: "{user_msg}" | Context: filling {doc_display}.
Reply in 2-3 plain text sentences — no markdown, no bullet lists, no bold, no headings.
Be direct, warm, and helpful."""
