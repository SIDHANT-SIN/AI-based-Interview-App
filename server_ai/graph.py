from langgraph.graph import StateGraph, END
from state import InterviewState
from nodes import evaluate_response_node, phase_manager_node, prompt_generator_node

def build_interview_graph():
    # 1. Initialize the Graph with our strict State structure
    workflow = StateGraph(InterviewState)

    # 2. Add our worker nodes to the graph
    workflow.add_node("evaluate", evaluate_response_node)
    workflow.add_node("manage_phases", phase_manager_node)
    workflow.add_node("generate_prompt", prompt_generator_node)

    # 3. Define the strict linear flow
    workflow.set_entry_point("evaluate")
    workflow.add_edge("evaluate", "manage_phases")
    workflow.add_edge("manage_phases", "generate_prompt")
    workflow.add_edge("generate_prompt", END)

    # 4. Compile it into a runnable application
    return workflow.compile()

# Provide a quick way to test the graph independently!
if __name__ == "__main__":
    app = build_interview_graph()
    
    # Mocking what LiveKit would send to the graph after a user speaks
    initial_state = {
        "current_phase": "project",
        "resume_summary": "Built a React and Node.js AI Interviewer application.",
        "latest_transcript": "Yes, I used LiveKit to handle the real-time WebRTC audio streaming.",
        "project_q_count": 9, # We are at question 9!
        "hr_q_count": 0,
        "system_prompt": ""
    }
    
    print("--- Running Background Director ---")
    final_state = app.invoke(initial_state)
    
    print("\n--- Final Output ---")
    print(f"New Phase: {final_state['current_phase']}")
    print(f"Project Count: {final_state['project_q_count']}")
    print(f"New LiveKit Prompt: {final_state['system_prompt']}")