import os
import json
import asyncio
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from openai import AsyncOpenAI

# ---------------------------------------------------------------------------
# Shared Groq client for the judge calls (fast, cheap model)
# ---------------------------------------------------------------------------
_groq = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
)
JUDGE_MODEL = "llama-3.3-70b-versatile"

# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------
Stage = Literal["intro", "approach", "coding", "review", "complexity"]

class CodingState(TypedDict):
    problem_title:       str
    problem_description: str
    system_prompt:       str
    stage:               Stage
    last_user_message:   str
    hints_given:         int
    failure_reason:      str


# ---------------------------------------------------------------------------
# Shared base persona injected into every prompt
# ---------------------------------------------------------------------------
_BASE_PERSONA = """\
You are Viral — an uncompromisingly strict, senior software-engineering interviewer.

GLOBAL CONDUCT RULES (non-negotiable in every stage):
• Maintain a cold, professional, evaluative tone at all times. Zero warmth.
• Never volunteer hints, solutions, or affirmations unless the stage explicitly permits it.
• Never confirm whether an answer is correct or incorrect until the execution results arrive.
• Keep every response to a maximum of 2 sentences unless a stage rule requires more.
• If the candidate is off-topic, unprofessional, or engaging in small talk, shut it down \
immediately with a single, terse redirect. Example: "This is a technical interview. \
Please address the problem."
• Do not repeat yourself. If you have already said something, assume the candidate heard it.\
"""


# ---------------------------------------------------------------------------
# LLM judge helpers  (all async, return structured dicts)
# ---------------------------------------------------------------------------

async def _judge_approach(problem_title: str, problem_description: str,
                           user_message: str) -> dict:
    """
    Returns:
        off_topic           (bool) — message is unrelated to the problem
        approach_explained  (bool) — candidate articulated a valid algorithmic approach
    Even a completely wrong approach counts as "explained" as long as it's
    coherent and directed at the problem.
    """
    prompt = f"""You are a strict technical-interview judge evaluating a candidate's response.

PROBLEM: {problem_title}
DESCRIPTION: {problem_description}

CANDIDATE SAID: "{user_message}"

Evaluate ONLY on these two criteria and respond with ONLY a raw JSON object
(no markdown, no preamble):
{{
  "off_topic": true/false,
  "approach_explained": true/false
}}

CRITERIA:
- off_topic: true ONLY if the message is pure small talk or completely unrelated to the
  problem domain (e.g. "how was your day", "tell me a joke"). A wrong or vague technical
  answer is NOT off-topic.
- approach_explained: If the user gives anything related to the problem like any general 
idea about the data any data structure or any kind of algorithm then return true.
  "I don't know" or total silence does NOT qualify."""

    resp = await _groq.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=60,
    )
    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"off_topic": False, "approach_explained": False}


async def _judge_code(problem_title: str, problem_description: str,
                      submission_details: str) -> dict:
    """
    Returns:
        code_correct (bool) — code has actual logic AND execution output passes
    """
    prompt = f"""You are a strict technical-interview judge evaluating a candidate's code submission.

PROBLEM: {problem_title}
DESCRIPTION: {problem_description}

SUBMISSION DETAILS (Code & Output):
{submission_details}

Evaluate BOTH the source code and the execution output.
A correct solution MUST:
1. Contain actual algorithmic logic (If the candidate simply hardcoded 'return' or printed exact answers to bypass the test cases, you MUST fail them).
2. Have execution output that indicates passing test cases/success.

Respond with ONLY raw JSON (no markdown, no preamble):
{{
  "code_correct": true/false,
  "failure_reason": "If false, a strict 1-sentence reason why (e.g., 'Candidate hardcoded the return values to bypass tests', 'SyntaxError on line 4', 'Fails for negative numbers'). If true, leave empty."
}}"""

    resp = await _groq.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=30,
    )
    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"code_correct": False}

# ---------------------------------------------------------------------------
# Stage nodes
# ---------------------------------------------------------------------------

def _intro_node(state: CodingState) -> dict:
    """
    Fires exactly once on the very first user interaction.
    Generates the opening system prompt and advances to 'approach'.
    """
    prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Introduction

Your sole objective right now is to:
1. Greet the candidate with a single sentence — no pleasantries.
2. Inform them that the problem is displayed on their screen.
3. Instruct them to read it and articulate their intended approach BEFORE writing
   a single line of code.

Do not explain the problem yourself. Do not offer any hints.
The problem title for your reference only: {state['problem_title']}"""

    return {"system_prompt": prompt, "stage": "approach"}


async def _approach_node(state: CodingState) -> dict:
    """
    Evaluates whether the candidate has explained a valid approach.
    - Off-topic → sharp professional redirect, stay in 'approach'
    - Approach not yet explained → push harder, stay in 'approach'
    - Approach explained → advance to 'coding'
    """
    verdict = await _judge_approach(
        state["problem_title"],
        state["problem_description"],
        state["last_user_message"],
    )

    if verdict.get("off_topic"):
        prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Approach elicitation — candidate went off-topic

The candidate just said something irrelevant. Your response must:
• Call it out in exactly one sentence.
• Redirect them immediately to explain their algorithmic approach to:
  {state['problem_title']}

Do not acknowledge or engage with the off-topic content whatsoever."""
        return {"system_prompt": prompt, "stage": "approach"}

    if not verdict.get("approach_explained"):
        prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Approach elicitation — candidate has not yet explained an approach

The candidate has not provided a coherent algorithmic approach to:
  Problem: {state['problem_title']}
  Description: {state['problem_description']}

Your response must:
• Acknowledge that their answer was insufficient in one terse sentence.
• Demand they articulate their approach: data structures, algorithm choice, edge cases.
• Be specific about what you expect — not vague encouragement.

Do not give hints. Do not suggest any approach yourself."""
        return {"system_prompt": prompt, "stage": "approach"}

    # Approach explained — advance
    prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Approach accepted — transitioning to coding

The candidate has sufficiently articulated their approach.
Your response MUST:
• In ONE sentence: acknowledge the approach was received.
• In ONE sentence: tell them to start coding their solution now.

ABSOLUTE PROHIBITIONS — violating any of these is a critical failure:
✗ Do NOT ask any follow-up questions whatsoever.
✗ Do NOT ask about input format, constraints, edge cases, or examples.
✗ Do NOT ask them to elaborate further on their approach.
✗ Do NOT ask for time or space complexity before they code.
The approach phase is OVER. Your only job now is to send them to code.

Problem: {state['problem_title']}"""
    return {"system_prompt": prompt, "stage": "coding"}


async def _coding_node(state: CodingState) -> dict:
    """
    The candidate is writing code. Viral is silent unless:
    - Candidate asks for a hint (one is permitted)
    - Candidate asks something unrelated (shut it down)
    """
    user_msg = state["last_user_message"].lower()
    hints_used = state.get("hints_given", 0)

    # Detect hint request heuristically (graph-level; LLM confirms in prompt)
    hint_keywords = ["hint", "help", "stuck", "clue", "don't know", "not sure", "confused"]
    wants_hint = any(kw in user_msg for kw in hint_keywords)

    if wants_hint and hints_used == 0:
        prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Coding — candidate requested their ONE permitted hint

Problem: {state['problem_title']}
Description: {state['problem_description']}

You must provide a single, minimal, directional hint — not a solution, not pseudo-code,
not an explanation of the algorithm. One sentence pointing them in the right direction.
Make it clear this was their only hint. After this, you will not assist further.

Do NOT reveal time or space complexity. Do NOT suggest data structures explicitly."""
        return {"system_prompt": prompt, "stage": "coding", "hints_given": 1}

    if wants_hint and hints_used >= 1:
        prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Coding — candidate requested another hint after exhausting their allowance

Your response must:
• State in one sentence that their hint allowance is exhausted.
• Direct them to work through it independently.
• Remain silent until they submit their code.

Do not soften this. Do not apologise."""
        return {"system_prompt": prompt, "stage": "coding"}

    # Any other message while coding — maintain silence / redirect
    prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Coding — candidate has spoken; evaluate whether to respond

The candidate said: "{state['last_user_message']}"

If this is small talk or irrelevant: one sentence redirect — tell them to focus on coding.
If this is a clarifying question about the problem statement itself (not how to solve it):
  answer it factually in one sentence, nothing more.
Otherwise: do not respond. Remain observationally silent.
Reminder: problem on screen is "{state['problem_title']}"."""
    return {"system_prompt": prompt, "stage": "coding"}


async def _review_node(state: CodingState) -> dict:
    """
    Receives execution output embedded in last_user_message (set by the webhook handler).
    Judges correctness and either advances to 'complexity' or sends back to 'coding'.
    """
    verdict = await _judge_code(
        state["problem_title"],
        state["problem_description"],
        state["last_user_message"],
    )

    if verdict.get("code_correct"):
        prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Code review — solution is CORRECT

The candidate's code passed. Your response must:
• Acknowledge correctness in exactly one sentence — no praise, no celebration.
• Immediately pivot: ask them for the time complexity AND space complexity of their solution.
• Make it clear you expect precise Big-O notation with justification.

Problem: {state['problem_title']}"""
        return {"system_prompt": prompt, "stage": "complexity"}

    # Code is wrong — send back
    # 🛠️ Grab the reason from the judge
    reason = verdict.get("failure_reason", "Execution failed or logic is invalid.")
    
    prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Code review — solution is INCORRECT

Execution output: {state['last_user_message']}
Secret Judge Note (Do not mention there is a judge): {reason}

Your response must:
• Tell the candidate strictly that their submission is rejected.
• Tell them EXACTLY why based on the Secret Judge Note (e.g., "Do not hardcode answers to bypass my tests", or "You have a syntax error").
• Direct them to fix it immediately.
• Do not offer a hint on how to fix the algorithmic logic itself.
"""
    return {"system_prompt": prompt, "stage": "coding", "failure_reason": reason}


def _complexity_node(state: CodingState) -> dict:
    """
    The final stage — elicit and evaluate time + space complexity.
    """
    prompt = f"""{_BASE_PERSONA}

CURRENT STAGE: Complexity analysis

The candidate is now expected to state the time and space complexity of their solution to:
  Problem: {state['problem_title']}
  Description: {state['problem_description']}

Their response so far: "{state['last_user_message']}"

Evaluate their answer:
• If they gave correct Big-O for both time AND space with a valid justification: \
  acknowledge it in one sentence and conclude the interview with a single closing statement.
• If they gave an incorrect or incomplete complexity: identify the error precisely in \
  one sentence and ask them to reconsider. Do not give the answer.
• If they gave no answer: demand it. Big-O notation. Both dimensions. Now."""
    return {"system_prompt": prompt, "stage": "complexity"}


# ---------------------------------------------------------------------------
# Router: decides which node to run based on current stage
# ---------------------------------------------------------------------------

def _route(state: CodingState) -> str:
    return state.get("stage", "intro")


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_coding_graph():
    builder = StateGraph(CodingState)

    builder.add_node("intro",      _intro_node)
    builder.add_node("approach",   _approach_node)
    builder.add_node("coding",     _coding_node)
    builder.add_node("review",     _review_node)
    builder.add_node("complexity", _complexity_node)

    # Every invocation enters through the router
    builder.add_conditional_edges(
        START,
        _route,
        {
            "intro":      "intro",
            "approach":   "approach",
            "coding":     "coding",
            "review":     "review",
            "complexity": "complexity",
        },
    )

    # All nodes exit to END — state mutations drive the next invocation's route
    builder.add_edge("intro",      END)
    builder.add_edge("approach",   END)
    builder.add_edge("coding",     END)
    builder.add_edge("review",     END)
    builder.add_edge("complexity", END)

    return builder.compile()