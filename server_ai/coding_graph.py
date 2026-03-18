from typing import TypedDict
from langgraph.graph import StateGraph, START, END

# Define the State for the Coding Track
class CodingState(TypedDict):
    problem_title: str
    problem_description: str
    system_prompt: str

# The single node that generates the prompt
def coding_logic_node(state: CodingState):
    # This dynamically builds the prompt based on the current problem in the state
    prompt = f"""You are Viral, a strict technical interviewer. 
    The user is solving this problem: {state['problem_title']}
    Description: {state['problem_description']}
    
    RULES:
    1. Start by asking the user to read the question on the screen and explain their approach before they type.
    2. Never write the code for them. Give conceptual hints regarding data structures or algorithms.
    3. Remain completely silent while they are coding. Let them think.
    4. I will send you their execution results via a system message when they submit. Review the results with them.
    5. Keep your responses concise (1-3 sentences maximum).
    """
    
    # Return the updated prompt to be injected into the LLM
    return {"system_prompt": prompt}

# Build and compile the graph
def build_coding_graph():
    builder = StateGraph(CodingState)
    builder.add_node("coding_logic", coding_logic_node)
    
    # Simple flow: Start -> Generate Prompt -> End
    builder.add_edge(START, "coding_logic")
    builder.add_edge("coding_logic", END)
    
    return builder.compile()