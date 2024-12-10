# %%
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from typing import Optional
import os

# check any models 
def get_vertex_llm():
  from langchain_google_vertexai import ChatVertexAI
  vertex_llm = ChatVertexAI(  
      model="llama-3.2-90b-vision-instruct-maas",
      max_retries=1,
      location="us-central1",
      max_tokens=3000,
  )
  return vertex_llm

def get_instruct_llm():
  
  class ChatOpenRouter(ChatOpenAI):
    openai_api_base: str
    api_key: str
    model_name: str
    
    def __init__(
        self,
        model_name: str,
        openai_api_base: str = "https://openrouter.ai/api/v1",
        api_key: Optional[str] = None,
        **kwargs
      ):
      api_key = api_key or os.getenv("OPENROUTER_API_KEY")
      super().__init__(
        openai_api_base=openai_api_base,
        api_key=api_key,
        model_name=model_name,
        **kwargs
      )


  instruct_llm = ChatOpenRouter(model_name="meta-llama/llama-3.1-405b-instruct:free")
  return instruct_llm

def get_general_llm():
  general_llm = ChatGroq(model_name="llama-3.3-70b-versatile")
  return general_llm

# %%
