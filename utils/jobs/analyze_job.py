import logging
import re
import os

from docx import Document
from dotenv import load_dotenv
from openai import OpenAI


# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
# Set the OpenAI API key
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')





def analyze_job(job):
    if job['description'] is None:
        return False

    # Load resume
    file_path = '../../data/Chris Phillips Resume.docx'
    resume = read_docx(file_path)

    prompt = f"""
    I am providing you two things: a job description and a resume. I want you to analyze the job description and the resume to see if they are a good match. If they are, return True and why they are a good match. If not, return False and why they are not a good match. The True or False should be the first line and then the explanation should start in a newline under that.

    Here is the job description:
    ### Job Description:
    {job['description']}

    ### Here is my resume:
    {resume}
   """

    # Send the initial prompt to ChatGPT
    logging.info("Asking ChatGPT to analyze job")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ]
    )

    # Extract the initial tailored resume content
    tailored_resume = response.choices[0].message.content



def read_docx(file_path):
    # Load the document
    doc = Document(file_path)

    # Extract text from each paragraph
    doc_text = []
    for para in doc.paragraphs:
        doc_text.append(para.text)

    return "\n".join(doc_text)  # Joining paragraphs with newlines

