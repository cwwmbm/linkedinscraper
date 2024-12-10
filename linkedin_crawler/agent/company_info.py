# %%
from dotenv import load_dotenv
from typing import TypedDict, Annotated, List
from langchain_core.messages import HumanMessage, SystemMessage, AnyMessage, RemoveMessage
from langgraph.graph import add_messages, StateGraph, START, END
from langchain_google_community import GoogleSearchRun, GoogleSearchAPIWrapper
from linkedin_crawler.agent.llm_models import get_vertex_llm, get_general_llm
from linkedin_crawler.utils.utils import extract_json
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

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
class CompanyInfoInput(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]
    summary: str
    company: str


class CompanyInfoOutput(TypedDict):
    # TODO: Find better structure for job information (desc, comapny infor etc..)
    messages: Annotated[List[AnyMessage], add_messages]
    summary: str
    company: str
    
    address: str
    phone_number: str
    main_products: List[str]

    

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
   - One or Two Main products with descriptions and use cases

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
    

def extract_company_info(state):
    company_info_message = state['messages'][-1]
    try:
        company_info = extract_json(company_info_message.content)
        address = company_info.get('address', 'N/A')
        phone_number = company_info.get('phone_number', 'N/A')
        main_products = company_info.get('main_products', [])

    except Exception as e:
        print(f"Error extracting company info: {e}")
        address = 'N/A'
        phone_number = 'N/A'
        main_products = 'N/A'
      
        
    return {
        'address': address,
        'phone_numbe': phone_number,
        'main_products': main_products
    }

# %%



company_info_builder = StateGraph(input=CompanyInfoInput, output=CompanyInfoOutput)

company_info_builder.add_node(search_company_info)
company_info_builder.add_node(ToolNode(tools=tools))
company_info_builder.add_node(extract_company_info)


company_info_builder.add_edge(START, 'search_company_info')
company_info_builder.add_conditional_edges('search_company_info', tools_condition, {'tools': 'tools', '__end__': 'extract_company_info'})
company_info_builder.add_edge('tools', 'search_company_info')
company_info_builder.add_edge('extract_company_info', END)

company_info_agent = company_info_builder.compile(checkpointer=MemorySaver())

# %%

# from IPython.display import display, Image

# display(Image(company_info_agent.get_graph().draw_mermaid_png()))

# %%
