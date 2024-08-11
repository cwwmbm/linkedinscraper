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
        return [False, "Job description is empty", None]

    # Load resume
    file_path = './data/Chris Phillips Resume.docx'
    resume = read_resume(file_path)

    # Create the prompt
    prompt = f"""
    I am providing you two things: a job description and a resume. I want you to analyze the job description and the resume to see if they are a good match. If they are, return True and why they are a good match. If not, return False and why they are not a good match. The True or False should be the first line and then the explanation should start in a newline under that. Keep your response under 950 characters.

    Here is the job description:
    ### Job Description:
    {job}

    ### Here is my resume:
    {resume}
   """

    # Send the prompt to ChatGPT
    logging.info("Asking ChatGPT to analyze job")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ]
    )

    # Extract the ChatGPT analysis
    chatgpt_analysis = response.choices[0].message.content

    logging.info("Asking ChatGPT to analyze job")
    print(chatgpt_analysis)

    verdict = check_first_line(chatgpt_analysis)
    res = [verdict, chatgpt_analysis, job]
    return res


def read_resume(file_path):
    # Load the document
    try:
        doc = Document(file_path)
    except Exception as e:
        return f"Error reading the document: {str(e)}"

    # Extract text from each paragraph while skipping empty ones
    resume_text = []
    for para in doc.paragraphs:
        if para.text.strip():  # Skip empty paragraphs
            resume_text.append(para.text)

    # Join paragraphs with newline characters for readability
    return "\n".join(resume_text)


def check_first_line(text):
    # Split the text into lines
    first_line = text.splitlines()[0]  # This gives us the first line of the string

    # Regex pattern to match "True" or "False" at the beginning of the first line
    pattern = r"^(True|False)"

    match = re.match(pattern, first_line)

    if match:
        # Return True if the matched text is "True", otherwise return False
        return match.group(0) == "True"
    else:
        return False  # Return False if there is no match


# analyze_job(test_description_3)
