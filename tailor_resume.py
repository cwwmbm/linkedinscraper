import os
from dotenv import load_dotenv
from openai import OpenAI

from data.input.constants import SUMMARY, TECHNICAL_SKILLS, EXPERIENCE

# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
# Set the OpenAI API key
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))


def tailor_resume(summary, technical_skills, experience, skills_list, job_description):
    # Prompt template
    prompt_template = """
    Adjust the information I provided from my resume to perfectly match the given job description by selecting the best four skills for each role from the provided skills list. Ensure the formatting remains consistent and the final document stays within one page. Provide it in json format. Use as many words for the ATS as possible. Do whatever you can to make it look like I'm the best candidate for the job.

    Here is the information I currently have in my resume:
    ### Summary:
    {summary}

    ### Technical Skills:
    {technical_skills}

    ### Work Experience:
    {experience}

    I want you to adjust that information to match the following job description:

    Here is my full skills list:
    ### Skills List:
    {skills_list}

    Here is the job description I want you to adjust my resume to:
    ### Job Description:
    {job_description}

    Here are a few rules to follow:
    - don't be super literal or specific in the summary
    - job skills max characters per bullet point is 110
    - summary max lines is 5 and max characters per line is 105
    - technical skills max characters is 121
    - you can change the experience points (within reason) to make them more relevant to the job
    """

    # Create strings from the dictionary items for technical skills and experience
    technical_skills_str = "\n".join([f"{key} {value}" for key, value in technical_skills.items()])
    experience_str = "\n".join([
        f"{job['company']} {job['dates']}\n" + "\n".join([f"- {point}" for point in job['points']])
        for job in experience
    ])

    # Fill in the prompt with job description and skills list
    prompt = prompt_template.format(
        summary=summary,
        technical_skills=technical_skills_str,
        experience=experience_str,
        skills_list=skills_list,
        job_description=job_description
    )

    # Send the request to ChatGPT
    response = client.chat.completions.create(model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": prompt},
    ])    # Extract the tailored resume content
    tailored_resume_content = response.choices[0].message.content
    print(response.choices[0].message.content)
    print(type(response.choices[0].message.content))

    return tailored_resume_content



# Example usage
with open('./data/input/job_description.txt', 'r') as file:
    job_description = file.read()

with open('./data/input/skills_list.txt', 'r') as file:
    skills_list = file.read()

tailored_resume = tailor_resume(SUMMARY, TECHNICAL_SKILLS, EXPERIENCE, job_description, skills_list)
output_path = './data/output/Chris Phillips Resume.docx'

print(f"Tailored resume saved to {output_path}")
