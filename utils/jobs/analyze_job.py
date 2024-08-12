import logging
import re
import os
from typing import Tuple

from docx import Document
from dotenv import load_dotenv
from openai import OpenAI


# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
# Set the OpenAI API key
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def analyze_job(job: dict) -> Tuple[int, str, dict]:
    if job['job_description'] == 'Could not find Job Description':
        return [0, 'Could not find Job Description', job]

# def analyze_job(job):
    # Load resume
    file_path = './data/Chris Phillips Resume.docx'
    resume = read_resume(file_path)

    # Create the prompt
    prompt = f"""
    I am providing you two things: a job description and my personal resume. I want you to look at each and decide if I am a good candidate for the role. For analysis I want you to look at the keywords in the job description as if you were a part of an ATS(applicant tracking system). I want you to grade harshly and strictly analyze each aspect of the job description and my resume.

    As a response, I want you to give me a confidence score between 0 and 100 percent.
    Here is the confidence score breakdown:

    1. **0-20% - "Not a Good Fit"**
       - **Description**: The resume does not align with the job requirements at all. Relevant skills, qualifications, or experiences are missing.
       - **Action**: Consider applying for a different position or enhancing your qualifications.

    2. **21-40% - "Limited Fit"**
       - **Description**: Some relevant skills or experiences are present, but there are significant gaps in qualifications. The job would likely require considerable upskilling.
       - **Action**: Look for jobs that align better with your current qualifications or consider gaining more experience.

    3. **41-60% - "Moderate Fit"**
       - **Description**: The resume has several relevant elements, but not enough to demonstrate strong suitability for the position. You might meet some, but not all, of the important criteria.
       - **Action**: Consider applying, but be prepared to explain how your background aligns with the job requirements in your application.

    4. **61-80% - "Good Fit"**
       - **Description**: The resume matches most of the key requirements, showcasing a strong alignment with the job description. However, there may still be a few areas where additional experience or skills are needed.
       - **Action**: It would be reasonable to apply for this position, highlighting your relevant skills and experiences.

    5. **81-100% - "Excellent Fit"**
       - **Description**: The resume almost or completely matches the job requirements, demonstrating a strong reputation and fit for the role. You possess most or all of the qualifications and experiences needed.
       - **Action**: Apply confidently and prepare to discuss your qualifications in detail during the interview.

    The format of the response should be in the format of 0-100 (int), then a new line, then an explanation beginning with "True" or "False" for if you think I'm a good candidate. Keep your response under 950 characters.

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


    confidence_score  = int(chatgpt_analysis.splitlines()[0])
    res = [confidence_score, chatgpt_analysis, job]

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

