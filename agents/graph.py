"""
LangGraph State Graph
=======================
Wires all agents into a LangGraph StateGraph with three invocable flows:
  1. ai_create:  classify → extract (returns JSON for auto-fill)
  2. compile_pdf: just the PDF node
  3. validate:    the validator node
"""

from .graph_runner import StateGraph, END
from .state import DocForgeState
from .classifier_agent import classify_document
from .extractor_agent import extract_trade_data
from .pdf_agent import compile_pdf
from .validator_agent import validate_document


# ═══════════════════════════════════════════
# FLOW 1: AI CREATE (classify → extract)
# ═══════════════════════════════════════════

def build_ai_create_graph():
    """classify email → extract JSON"""
    graph = StateGraph(DocForgeState)

    graph.add_node("classify", classify_document)
    graph.add_node("extract", extract_trade_data)

    graph.set_entry_point("classify")

    # After classify, check for error
    def should_continue_to_extract(state):
        if state.get("error"):
            return "end"
        return "extract"

    graph.add_conditional_edges(
        "classify",
        should_continue_to_extract,
        {"extract": "extract", "end": END}
    )

    graph.add_edge("extract", END)

    return graph.compile()


# ═══════════════════════════════════════════
# FLOW 2: COMPILE PDF
# ═══════════════════════════════════════════

def build_pdf_graph():
    """compile trade JSON to PDF"""
    graph = StateGraph(DocForgeState)

    graph.add_node("compile_pdf", compile_pdf)
    graph.set_entry_point("compile_pdf")
    graph.add_edge("compile_pdf", END)

    return graph.compile()


# ═══════════════════════════════════════════
# FLOW 3: VALIDATE
# ═══════════════════════════════════════════

def build_validation_graph():
    """validate JSON against email"""
    graph = StateGraph(DocForgeState)

    graph.add_node("validate", validate_document)
    graph.set_entry_point("validate")
    graph.add_edge("validate", END)

    return graph.compile()


# ═══════════════════════════════════════════
# PRE-COMPILED GRAPHS (import-ready)
# ═══════════════════════════════════════════

ai_create_graph = build_ai_create_graph()
pdf_compile_graph = build_pdf_graph()
validation_graph = build_validation_graph()
