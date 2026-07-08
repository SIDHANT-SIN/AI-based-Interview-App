from langgraph.graph import StateGraph, END
from graphs.coding_state import CodingState
from graphs.coding_nodes import approach_node, implementation_node, complexity_node # 🛠️ Import end_node

def route_coding_phase(state: CodingState) -> str:
    phase = state.get("current_phase", "approach")
    # 🛠️ Added "end" to the valid routing paths
    if phase in ["approach", "implementation", "complexity"]:
        return phase
    return END

def build_coding_graph():
    workflow = StateGraph(CodingState)

    workflow.add_node("approach", approach_node)
    workflow.add_node("implementation", implementation_node)
    workflow.add_node("complexity", complexity_node)
    
    workflow.set_conditional_entry_point(
        route_coding_phase,
        {
            "approach": "approach",
            "implementation": "implementation",
            "complexity": "complexity", # 🛠️ Map the end phase
            END: END,
        }
    )

    workflow.add_edge("approach", END)
    workflow.add_edge("implementation", END)
    workflow.add_edge("complexity", END)

    return workflow.compile()