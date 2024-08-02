import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
# Set the OpenAI API key
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))


def tailor_resume(job_description, skills_list, resume_text):
    # Prompt template
    prompt_template = """
    Adjust the provided resume to perfectly match the given job description by selecting the best four skills for each role from the provided skills list. Ensure the formatting remains consistent and the final document stays within one page.

    ### Skills List:
    {skills_list}

    ### Job Description:
    {job_description}
    """

    # Fill in the prompt with job description and skills list
    prompt = prompt_template.format(skills_list=skills_list, job_description=job_description)

    # Send the request to ChatGPT
    response = client.chat.completions.create(model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": prompt},
    ])

    # Extract the tailored resume content
    tailored_resume_content = response.choices[0].message.content

    return tailored_resume_content



# Example usage
with open('./data/input/job_description.txt', 'r') as file:
    job_description = file.read()

with open('./data/input/skills_list.txt', 'r') as file:
    skills_list = file.read()

with open('./data/input/resume.docx', 'rb') as file:
    resume_text = file.read()

tailored_resume = tailor_resume(job_description, skills_list, resume_text)
output_path = './data/output/Chris Phillips Resume.docx'
# save_resume_to_docx(tailored_resume, output_path)

print(f"Tailored resume saved to {output_path}")
