# %%
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.tools import DuckDuckGoSearchRun
from typing import TypedDict

load_dotenv()

llm = ChatGroq(model="llama-3.3-70b-versatile")


# State
class JobState(TypedDict):
    # TODO: Find better structure for job information (desc, comapny infor etc..)
    company_name: str
    job_desc: str
    candidate_skills: str
    candidate_preferences: str
    
# Tools
def seach_company_infr(search_query):
    """It searches online to find company information to get company address, phone number major projects and so on.

    Args:
        company_name: name of the company
    """
    
    
    


def check_with_agent(job_desc, candidate_skills, candidate_preferences):
    # job_desc = state['jodb_desc']
    # candidate_skills = state['candidate_skills']
    # candidate_preferences = state['candidate_preferences']
    
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
- Match Percentage: [0-100%]
- Reasoning: Detailed explanation of skill matches and gaps
- Skill Relevance Breakdown

Important Considerations:
- Be flexible in skill interpretation
- Highlight potential skill transferability
- Provide constructive feedback on skill gaps
    """
    msg = f"""
    ========================================================
    Job Description: {job_desc}
    ========================================================
    Candidate Skills: {candidate_skills}
    ========================================================
    Candidate Preferences: {candidate_preferences}
    """
    response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=msg)])
    return response


# %%
job_desc = """About the job
At Weights & Biases, our mission is to build the best tools for AI developers. We founded our company on the insight that while there were excellent tools for developers to build better code, there were no similarly great tools to help ML practitioners build better models. Starting with our first experiment tracking product, we have since expanded our solution into a comprehensive AI developer platform for organizations focused on building their own deep learning models and generative AI applications.

Weights & Biases is a Series C company with $250M in funding and over 200 employees. We proudly serve over 1,000 customers and more than 30 foundation model builders including customers such as OpenAI, NVIDIA, Microsoft, and Toyota.

Shape the future of GenAI for the world’s leading enterprises.

We are looking for an AI Engineer who is ready to help some of the world’s top enterprises integrate GenAI into their operations. In this role, you will work directly with advanced software and ML teams, helping them deploy large-scale GenAI solutions that drive real business outcomes. You'll be hands-on, solving complex, real-world problems with Generative AI, and playing a key role in transforming how these enterprises operate.

As part of the GenAI Enterprise Accelerator program, you’ll work with top-tier companies who are at the beginning of their GenAI journey. You’ll be at the forefront of this shift, directly supporting enterprises in adopting and scaling GenAI technologies. Your role will be to guide teams through the practical aspects of implementing LLMs and ensure they are getting the most out of Weights & Biases’ tools to enhance their AI capabilities.

Responsibilities

Lead GenAI Implementations: Design, build, and optimize GenAI pipelines for enterprise clients, helping them integrate W&B tools to unlock the full potential of LLMs in their operations.
Hands-On Problem Solving: Partner with teams to understand their challenges and deliver technical solutions that meet their specific needs while navigating the complexities of productionizing GenAI.
Guide GenAI Adoption: Serve as a key advisor to help companies successfully implement GenAI at scale, ensuring smooth onboarding and continued success through W&B best practices.
Stay on the Cutting Edge: Keep up with the latest advancements in GenAI, bringing that knowledge to bear as you help enterprises push the boundaries of what’s possible with AI.
Customer-Centric Development: Provide continuous feedback to W&B’s product team, influencing the development of features based on real customer needs, challenges, and successes.
Develop Scalable AI Systems: Collaborate with customers to design robust, scalable systems that leverage LLMs, from proof of concept through full production deployment.


Requirements

Based in the San Francisco Bay Area. This role will be hybrid with occasional travel to meet with customers
3-5 years of relevant experience in similar roles, ideally working with enterprise clients or on large-scale machine learning projects.
Strong experience with Python and JavaScript, and a track record of success working with enterprise clients to solve technical challenges.
Excellent communication skills, with the ability to explain complex technical concepts clearly to both technical and non-technical stakeholders.
Experience working in cloud environments (AWS, GCP, Azure) and knowledge of Linux/Unix systems.
Expertise with Transformers, PyTorch, Numpy, and Pandas, alongside strong software development best practices.
Experience with new LLM/AI tools (Llamaindex, Copilot/Cursor, vector databases, Langchain, instructor, outlines, ...) and techniques.
Experience with version control systems like Git, automated testing, and CI/CD pipelines.
Demonstrated experience building AI apps in production
A strong drive to stay ahead of the curve with GenAI research and apply those insights to help enterprises build real-world applications.


Why This Role Is Unique

You’ll be working directly with some of the most advanced enterprises, helping them adopt and scale GenAI in high-impact, real-world applications.
You’ll be at the cutting edge of GenAI, working on projects that will shape how companies across industries use AI to solve their most critical problems.
Your work will directly influence the product roadmap for W&B’s GenAI tools, making you a key contributor to both customer success and product development.
You’ll gain exposure to diverse industries, solving unique and complex challenges in every engagement.


Our Benefits

🏝️ Flexible time off
🩺 Medical, Dental, and Vision for employees and Family Coverage
💵 Home office budget with a new high-powered laptop
🥇 Truly competitive salary and equity
🚼 12 weeks of Parental leave (U.S. specific)
📈 401(k) (U.S. specific)
Supplemental benefits may be available depending on your location


$182,000 - $248,000 a year

This position has an annual estimated salary of $182,000 - $248,000 per year. Weights & Biases is committed to providing competitive salary, equity and benefits packages for all full-time employees. The actual pay may vary depending on your skills, qualifications, experience, and work location.

We encourage you to apply even if your experience doesn't perfectly align with the job description as we seek out diverse and creative perspectives. Team members who love to learn and collaborate in an inclusive environment will flourish with us. We are an equal opportunity employer and do not discriminate on the basis of race, religion, color, national origin, gender, sexual orientation, age, marital status, veteran status, or disability status. If you need additional accommodations to feel comfortable during your interview process, reach out at careers@wandb.com.

"""

candidate_skills = """
1. Programming Languages:
- Python
- JavaScript

2. Frontend Technologies:
- React.js
- Next.js
- Redux
- HTML
- CSS

3. Backend Technologies:
- Node.js
- Express.js
- FastAPI
- Flask

4. Cloud & DevOps:
- AWS (Lambda, S3, DynamoDB)
- Docker
- Kubernetes
- Jenkins

5. Databases:
- MongoDB
- PostgreSQL
- DynamoDB

6. Specialized Skills:
- AI Agent Development
- Large Language Models (LLMs)
- LangGraph
- Retrieval-Augmented Generation (RAG)
- Serverless Computing
- CI/CD Pipelines
- OAuth Implementation

"""

candidate_preferences = """
1. Role Preferences:
- Software Engineer
- Full-Stack Developer
- AI/ML Engineer
- Cloud Solutions Engineer

2. Technology Interests:
- AI and Machine Learning
- Cloud-Native Applications
- Serverless Architecture
- Web Application Development

3. Industry Preferences:
- Tech Companies
- AI and Innovation-Driven Organizations

4. Work Environment Preferences:
- Innovative projects
- Opportunities for learning and implementing cutting-edge technologies
- Roles that involve building scalable, impactful solutions
"""


response = check_with_agent(job_desc, candidate_skills, candidate_preferences)
response 

# %%
response.pretty_print()
# %%
