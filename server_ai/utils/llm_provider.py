import os
from dotenv import load_dotenv

# LangChain for the Graph Brain
from langchain_groq import ChatGroq


load_dotenv()

# Instantiate the LLM globally ONCE when the server starts
_GLOBAL_GRAPH_LLM = ChatGroq(
    model="llama-3.3-70b-versatile", 
    temperature=0.0,
    api_key=os.getenv("GROQ_API_KEY")
)

def get_graph_llm():
    """
    THE BRAIN: LangGraph uses Groq to evaluate transcripts 
    and make strict, logical decisions.
    Returns the global singleton instance.
    """
    return _GLOBAL_GRAPH_LLM



'''
def get_livekit_llm():
    """
    THE MOUTH: LiveKit uses Groq purely as a high-speed repeater.
    It receives the exact text from the Graph and echoes it.
    """
    return livekit_groq.LLM(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
    )
'''