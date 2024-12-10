# %%
from dotenv import load_dotenv
from typing import TypedDict, Annotated, List
from langchain_core.messages import HumanMessage, SystemMessage, AnyMessage
from langgraph.graph import add_messages, StateGraph, START, END
from linkedin_crawler.agent.llm_models import get_vertex_llm, get_general_llm
from linkedin_crawler.utils.utils import extract_json
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

general_llm = get_general_llm()
instruct_llm = get_vertex_llm()

# State
class JobEvaluationInput(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]
    summary: str
    
    company: str
    candidate_skills: str
    candidate_preferences: str
    job_desc: str
    
class Skill(TypedDict):
    skill: str
    criticality: str

class JobEvaluationOutput(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]
    summary: str
    
    company: str
    candidate_skills: str
    candidate_preferences: str
    job_desc: str
    
    match_percentage: int
    overall_assessment: str
    recommended_next_steps: List[str]
    matched_skills: List[Skill]
    skill_gaps: List[Skill]
    
def evaluate_job(state):
    job_desc = state['job_desc']
    candidate_skills = state['candidate_skills']
    candidate_preferences = state['candidate_preferences']
    
    sys_msg = """You are an AI job matching assistant designed to evaluate job descriptions against a candidate's skills and preferences. Your primary goal is to determine how well a job matches a candidate's profile.

Job Matching Criteria:
- Skill Matching:
  1. Perform a semantic matching of skills, allowing for related technology and skill equivalents
  2. Prioritize required skills over preferred skills
  3. Aim for a minimum 70% skill match
  4. Consider skill proximity and transferability (e.g., React matching with Next.js, AI agent matching with Gen AI)

Matching Process:
1. Analyze the job description's required and preferred skills
2. Compare these skills against the candidate's skills
3. Calculate a match percentage
4. Provide detailed reasoning for the match assessment

Output Format:
```json
{
    "match_percentage": 0-100,
    "overall_assessment": "Brief overall evaluation",
    "matched_skills:": [
        {
        "skill": "Specific Skill",
        "criticality": "High/Medium/Low",
        }
    ],
    "skill_gaps": [
        {
        "skill": "Specific Skill",
        "criticality": "High/Medium/Low",
        }
    ],
    "recommended_next_steps": [
        "Specific actionable recommendations"
    ]
}
## Constraints
- Use only verifiable information
- If information is not found respond with **Information Not Found**
    """
    msg = f"""
    ========================================================
    Job Description: {job_desc}
    ========================================================
    Candidate Skills: {candidate_skills}
    ========================================================
    Candidate Preferences: {candidate_preferences}
    ========================================================
    """
    response = general_llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=msg)])
    job_evaluation = extract_json(response.content)
    
        
    match_percentage = job_evaluation.get('match_percentage', -1)
    overall_assessment = job_evaluation.get('overall_assessment', 'N/A')
    recommended_next_steps = job_evaluation.get('recommended_next_steps', [])
    matched_skills = job_evaluation.get('matched_skills', [])
    skill_gaps = job_evaluation.get('skill_gaps', [])

    return {
        'messages': [response],
        'match_percentage': match_percentage,
        'overall_assessment': overall_assessment,
        'recommended_next_steps': recommended_next_steps,
        'matched_skills': matched_skills,
        'skill_gaps': skill_gaps,
    }

# %%

job_evaluation_builder = StateGraph(input=JobEvaluationInput, output=JobEvaluationOutput)
job_evaluation_builder.add_node(evaluate_job)
job_evaluation_builder.add_edge(START, 'evaluate_job')
job_evaluation_builder.add_edge('evaluate_job', END)

job_evaluation_agent = job_evaluation_builder.compile(checkpointer=MemorySaver())


# %%

# from IPython.display import display, Image
# display(Image(job_evaluation_agent.get_graph().draw_mermaid_png()))

# %%
