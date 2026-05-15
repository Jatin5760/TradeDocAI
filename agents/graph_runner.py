"""
Lightweight LangGraph-style State Graph Runner
=================================================
A minimal implementation of the StateGraph pattern that:
  - Chains nodes (agent functions) together
  - Passes a shared state dict through the pipeline
  - Supports conditional edges (skip on error)
  - Zero external dependencies

This replaces langgraph to avoid Python 3.9 / Windows
compatibility issues with uuid_utils / langchain_core.
"""


class StateGraph:
    """
    A simple directed graph of agent nodes.

    Usage:
        graph = StateGraph()
        graph.add_node("classify", classify_fn)
        graph.add_node("extract", extract_fn)
        graph.set_entry_point("classify")
        graph.add_edge("classify", "extract")
        graph.add_edge("extract", END)
        compiled = graph.compile()
        result = compiled.invoke({"email_text": "..."})
    """

    END = "__END__"

    def __init__(self, state_type=None):
        self.state_type = state_type  # accepted for API compat, not enforced
        self.nodes = {}          # name -> function
        self.edges = {}          # name -> next_name or None
        self.conditional_edges = {}  # name -> (condition_fn, mapping)
        self.entry_point = None

    def add_node(self, name: str, fn):
        self.nodes[name] = fn

    def set_entry_point(self, name: str):
        self.entry_point = name

    def add_edge(self, from_node: str, to_node: str):
        self.edges[from_node] = to_node

    def add_conditional_edges(self, from_node: str, condition_fn, mapping: dict):
        """
        condition_fn(state) -> key
        mapping: { key: next_node_name_or_END }
        """
        self.conditional_edges[from_node] = (condition_fn, mapping)

    def compile(self):
        return CompiledGraph(self)


class CompiledGraph:
    """Compiled graph that can be invoked with a state dict."""

    def __init__(self, graph: StateGraph):
        self.graph = graph

    def invoke(self, state: dict) -> dict:
        current = self.graph.entry_point
        if not current:
            raise ValueError("No entry point set")

        while current and current != StateGraph.END:
            # Run the node function
            node_fn = self.graph.nodes.get(current)
            if not node_fn:
                raise ValueError(f"Node '{current}' not found")

            print(f"  ▸ Running node: {current}")
            state = node_fn(state)

            # Determine next node
            if current in self.graph.conditional_edges:
                cond_fn, mapping = self.graph.conditional_edges[current]
                next_key = cond_fn(state)
                current = mapping.get(next_key, StateGraph.END)
            elif current in self.graph.edges:
                current = self.graph.edges[current]
            else:
                current = StateGraph.END

        return state


# Convenience alias
END = StateGraph.END
