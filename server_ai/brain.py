import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

class AIBrain:
    def __init__(self):
        # 1. Initialize Groq via LangChain
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.3, # Slight temperature for natural conversation
            groq_api_key=os.getenv("GROQ_API_KEY")
        )
        
        # 2. Set the Persona
        system_prompt = SystemMessage(
            content="You are a professional AI interviewer conducting a technical interview. "
                    "Keep your responses concise, conversational, and natural (1-2 sentences maximum). "
                    "Acknowledge the user's answer, then ask exactly one follow-up question."
        )
        
        # 3. Memory Array to hold the conversation history
        self.history = [system_prompt]

    async def generate_reply(self, user_text: str) -> str:
        """Takes user text, updates history, calls Groq, and returns the response."""
        print("🧠 [Groq is thinking...]")
        try:
            # Append what the user just said
            self.history.append(HumanMessage(content=user_text))
            
            # Call Groq asynchronously (ainvoke) so it doesn't block the audio stream
            response = await self.llm.ainvoke(self.history)
            
            # Save the AI's reply to memory so it remembers it later
            self.history.append(AIMessage(content=response.content))
            
            return response.content
        except Exception as e:
            return f"Error connecting to brain: {e}"