# %%
from dotenv import load_dotenv
from typing import TypedDict, Annotated, List
from langchain_core.messages import HumanMessage, SystemMessage, AnyMessage, RemoveMessage
from langgraph.graph import add_messages
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_google_community import GoogleSearchRun, GoogleSearchAPIWrapper
from linkedin_crawler.llm_models import get_vertex_llm, get_general_llm
load_dotenv()

general_llm = get_general_llm()
instruct_llm = get_vertex_llm()

# Tools

GoogleSearchAPIWrapper()
def search_online(search_query: str) -> str:
    """It searches on the internet to get information.

    Args:
        search_query: query to search on the internet.
    """
    
    search = GoogleSearchRun(api_wrapper=GoogleSearchAPIWrapper())

    search_res = search.invoke(search_query)
    return search_res

tools = [search_online]

research_llm = instruct_llm.bind_tools(tools)

# State
class JobFilterInputState(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]
    summary: str
    
    company: str
    candidate_skills: str
    candidate_preferences: str
    job_desc: str
    
class JobFilterState(TypedDict):
    # TODO: Find better structure for job information (desc, comapny infor etc..)
    messages: Annotated[List[AnyMessage], add_messages]
    summary: str
    
    company: str
    candidate_skills: str
    candidate_preferences: str
    job_desc: str
    
    address: str
    phone_number: str
    main_products: List[str]
    
    match_percentage: int
    match_reason: str
    

# Nodes
def search_company_info(state):
    sys_msg = r"""# Objective
Retrieve company information using the `search_online` tool.

## Available Tool
- `search_online(search_query: str) -> str`
  - Uses Google to search online
  - Returns search result snippets

## Workflow
1. Construct precise search query
2. Use `search_online` to gather information
3. Analyze results systematically
4. Extract:
   - Company HQ address
   - Phone number
   - Main products with descriptions and use cases

## Output Format
```json
{
  "company": "",
  "address": "",
  "phone_number": "",
  "main_products": [
    {
      "name": "",
      "description": "",
      "use_cases": [
        ""
      ]
    }
  ]
}
```

## Search Strategy
- Refine queries if initial search lacks detail
- Cross-reference multiple result snippets
- Prioritize official sources

## Product Information Guidelines
- Provide a concise 2-3 sentence description for each main product
- Highlight key features and technological innovations
- Identify primary industries or applications where the product is used
- Include specific use cases that demonstrate the product's practical value

## Constraints
- Use only verifiable information
- Indicate if data is incomplete
    """
    
    msg = f"""
    Find company information of {state['company']}
    """
    response = research_llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=msg)] + state['messages'])
    return {
        'messages': [response]
    }

def search_summarize(state):
    sys_msg = """# Company Information Extraction and Summarization Prompt

You are a systematic information extractor and summarizer for company research. Your primary objective is to distill internet search results into a concise, structured summary focusing on the following key pieces of information:

## Extraction Priorities
1. **Company Address**: Full, precise physical location
2. **Phone Number**: Primary contact number
3. **Main Products**: 
   - Core product/service offerings
   - Brief, clear descriptions of each main product

## Summarization Guidelines
- Ignore irrelevant information such as:
  - Detailed financial reports
  - Employee count
  - Historical background
  - Marketing slogans
  - Non-essential web page content

- Prioritize direct, factual information
- Use clear, professional language
- Eliminate redundant or repetitive details
- Maintain a maximum of 3-4 sentences per product description

## Output Format
```
Company Name: [Official Company Name]
Address: [Full Physical Address]
Phone: [Primary Contact Number]

Main Products:
1. [Product Name]
   - [Concise Product Description]
2. [Product Name]
   - [Concise Product Description]
```

## Critical Instructions
- If any key information (address, phone, products) is missing, clearly state "Information Not Found"
- Do not fabricate or assume information
- Stick strictly to verifiable facts from search results"""

    response = instruct_llm.invoke([SystemMessage(content=sys_msg)] + state['messages'])
    delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][:-2]]
    return {
        "messages": [delete_messages]
    }
    

def evaluate_job(state):
    job_desc = state['jodb_desc']
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
        "relevanceLevel": "High/Medium/Low",
        "details": "Explanation of skill match"
        }
    ],
    "skill_gaps": [
        {
        "missingSkill": "Specific Skill",
        "criticality": "High/Medium/Low",
        "recommendations": "Suggestions for skill development"
        }
    ],
    "recommended_next_steps": [
        "Specific actionable recommendations"
    ]
}
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
    return {
        'messages': [response],
    }



def context_summarize(state, node):
    sys_msg = "You are an advanced summarization assistant. Your role is to read and analyze the provided text and create a concise summary, capturing the key ideas, themes, and significant points. Retain essential technical details and context, avoid redundancy, and present the information in a clear and structured format." 
    
    # First, we get any existing summary
    summary = state.get("summary", "")

    # Create our summarization prompt 
    if summary:
        
        # A summary already exists
        summary_message = (
            f"This is summary of the conversation to date: {summary}\n\n"
            "Extend the summary by taking into account the new messages above:"
        )
    else:    
        summary_message = "Create a summary of the conversation above:"
        
    
    
    response = instruct_llm.invoke([SystemMessage(content=sys_msg)] + state['messages'] + [HumanMessage(content=summary_message)])
    delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][:-2]]
    
    state = {"summary": response.content, "messages": delete_messages}
    
    return node(state)
    
# %%

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition

builder = StateGraph(input=JobFilterInputState, output=JobFilterState)

builder.add_node(search_company_info)
builder.add_node(ToolNode(tools=tools))

builder.add_edge(START, 'search_company_info')
builder.add_conditional_edges('search_company_info', tools_condition)
builder.add_edge('tools', 'search_company_info')

graph = builder.compile()

from IPython.display import display, Image

display(Image(graph.get_graph().draw_mermaid_png()))

# %%
