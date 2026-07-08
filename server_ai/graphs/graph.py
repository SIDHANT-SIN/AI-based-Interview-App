from langgraph.graph import StateGraph, END
from graphs.state import InterviewState
from graphs.nodes import intro_node, tech_node, hr_node

def route_phase(state: InterviewState) -> str:
    phase = state.get("current_phase", "intro")
    if phase == "intro":
        return "intro"
    elif phase == "tech":
        return "tech"
    elif phase == "hr":
        return "hr"
    else:
        return END

def build_interview_graph():
    workflow = StateGraph(InterviewState)

    workflow.add_node("intro", intro_node)
    workflow.add_node("tech", tech_node)
    workflow.add_node("hr", hr_node)

    # Entry point routes to the correct node based on the current phase
    workflow.set_conditional_entry_point(
        route_phase,
        {
            "intro": "intro",
            "tech": "tech",
            "hr": "hr",
            END: END,
        }
    )

    workflow.add_edge("intro", END)
    workflow.add_edge("tech", END)
    workflow.add_edge("hr", END)

    return workflow.compile()