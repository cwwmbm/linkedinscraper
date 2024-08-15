import os
import json
import logging
import re
from dotenv import load_dotenv
from openai import OpenAI

from data.input.constants import (
    CONTACT,
    SUMMARY,
    TECHNICAL_SKILLS,
    EXPERIENCE,
    EDUCATION,
)
from utils.create_resume import create_gpt_resume

# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
# Set the OpenAI API key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def tailor_resume(summary, technical_skills, experience, skills_list, job_description):
    # Prompt template for initial setup
    initial_prompt_template = """
    I am providing you json objects of summary, technical skills, and experience to perfectly match the given job description. I am also providing a list of skills that you can use as reference for the other things I've done in the roles I've had. I want you to return the information in the same exact formats that I've given you, just adjust the content.

    Here is the information I currently have in my resume:
    ### Summary:
    {summary}

    ### Technical Skills:
    {technical_skills}

    ### Work Experience:
    {experience}

    Here is my full skills list:
    ### Skills List:
    {skills_list}

    Here is the job description I want you to adjust my resume to:
    ### Job Description:
    {job_description}
    """

    # Convert dictionaries and lists to JSON strings
    summary_json = json.dumps(summary, indent=4)
    technical_skills_json = json.dumps(technical_skills, indent=4)
    experience_json = json.dumps(experience, indent=4)
    skills_list_json = json.dumps(skills_list, indent=4)
    job_description_json = json.dumps(job_description, indent=4)

    # Fill in the initial prompt
    initial_prompt = initial_prompt_template.format(
        summary=summary_json,
        technical_skills=technical_skills_json,
        experience=experience_json,
        skills_list=skills_list_json,
        job_description=job_description_json,
    )

    # Send the initial prompt to ChatGPT
    logging.info("Sending initial prompt to chatgpt")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": initial_prompt},
        ],
    )

    # Extract the initial tailored resume content
    tailored_resume = response.choices[0].message.content

    # Question 1: Ask for initial adjustments based on specific criteria
    question1_prompt = f"""
    Based on the initial tailored resume content, please make adjustments to emphasize my experience in whatever characteristics are crucial for the job description. Please improve the tailored resume to include more relevant keywords and experiences from the job description to increase its relevance for an ATS. When creating a summary for me don't be super literal or specific

    Here is the tailored resume content:
    {tailored_resume}

    Also tell me what you changed and why you changed it
    """
    logging.info("Sending second prompt to chatgpt to make adjustments")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": question1_prompt},
        ],
    )
    logging.info("Adjustments made by chatgpt")
    logging.info(tailored_resume)
    tailored_resume = response.choices[0].message.content

    # # Question 2: Ask for improvements to make it more relevant to the job description
    # question2_prompt = f"""
    # Please improve the tailored resume to include more relevant keywords and experiences from the job description to increase its relevance for an ATS. When creating a summary for me don't be super literal or specific

    # Here is the tailored resume content:
    # {tailored_resume}
    # """
    # logging.info("Sending third prompt to chatgpt to increase relevance with keywords for ATS")
    # response = client.chat.completions.create(
    #     model="gpt-4",
    #     messages=[
    #         {"role": "system", "content": "You are a helpful assistant."},
    #         {"role": "user", "content": question2_prompt},
    #     ]
    # )
    # tailored_resume = response.choices[0].message.content

    # Question 3: Ask to ensure data has met specific rules for character limits etc.
    question3_prompt = f"""
    Now I want you to adjust the output so that it meets these specific formatting rules for generation of the resume

    Here are a few rules to follow:
    - job skills max characters per bullet point is 110
    - summary max lines is 5 and max characters per line is 105
    - technical skills max characters is 121
    - keep the work experience dates the exact same, whitespace and all
    - you can change the experience points and skills (within reason) to make them more relevant to the job
    - make sure it has proper grammar, capitalization, etc.

    Here is the tailored resume content:
    {tailored_resume}
    """
    logging.info("Sending third prompt to chatgpt to set specific rules for output")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": question3_prompt},
        ],
    )
    tailored_resume = response.choices[0].message.content

    # Question 4: Ask for final optimization to make the correct json format to use in create_resume() function
    final_prompt_template = """
    Finally I want you to take the contents that you've given me and I want you to make sure that they are returned in this exact format that we started with:

    ### Summary:
    {summary}

    ### Technical Skills:
    {technical_skills}

    ### Work Experience:
    {experience}
    """

    # Convert dictionaries and lists to JSON strings
    summary_json = json.dumps(summary, indent=4)
    technical_skills_json = json.dumps(technical_skills, indent=4)
    experience_json = json.dumps(experience, indent=4)
    skills_list_json = json.dumps(skills_list, indent=4)
    job_description_json = json.dumps(job_description, indent=4)

    # Fill in the final prompt
    final_prompt = final_prompt_template.format(
        summary=summary_json,
        technical_skills=technical_skills_json,
        experience=experience_json,
        skills_list=skills_list_json,
        job_description=job_description_json,
    )

    # Send the final prompt to ChatGPT
    logging.info("Sending final prompt to chatgpt to enforce formatting structure")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": final_prompt},
        ],
    )

    # Extract the final tailored resume content
    tailored_resume = response.choices[0].message.content

    # Return the final tailored resume
    logging.info("Returning final chatgpt response data")
    return tailored_resume


# Load job description
with open("./data/input/job_description.txt", "r") as file:
    job_description = file.read()

# Load skills list
with open("./data/input/skills_list.txt", "r") as file:
    skills_list = file.read()

raw_gpt_response = tailor_resume(
    SUMMARY, TECHNICAL_SKILLS, EXPERIENCE, job_description, skills_list
)


def parse_response(raw_gpt_response):
    print("Raw GPT Response")
    print(raw_gpt_response)
    # Extract summary
    # logging.info("Returning final chatgpt response data")
    summary_start = raw_gpt_response.find("### Summary:") + len("### Summary:") + 1
    summary_end = raw_gpt_response.find("### Technical Skills:")
    summary = raw_gpt_response[summary_start:summary_end].strip().strip('"')

    # Extract technical skills
    skills_start = raw_gpt_response.find("### Technical Skills:") + len(
        "### Technical Skills:"
    )
    skills_end = raw_gpt_response.find("### Work Experience:")
    skills_str = raw_gpt_response[skills_start:skills_end].strip()
    skills = json.loads(skills_str)

    # Extract work experience
    experience_start = raw_gpt_response.find("### Work Experience:") + len(
        "### Work Experience:"
    )
    experience_str = raw_gpt_response[experience_start:].strip()
    experience = json.loads(experience_str)

    # Display the results
    print("*" * 100)
    print("Summary:")
    print(type(summary))
    print(summary)
    print("-" * 100)
    print("\nTechnical Skills:")
    print(type(skills))
    print(json.dumps(skills, indent=4))
    print("-" * 100)
    print("\nWork Experience:")
    print(type(experience))
    print(json.dumps(experience, indent=4))
    logging.info("Parsing raw gpt response")
    return {
        "summary": summary,
        "skills": skills,
        "experience": experience,
    }


# parse_response(raw_gpt_response)
json_data = parse_response(raw_gpt_response)
output_path = "./data/output/Chris Phillips Resume.docx"

logging.info(f"Outputting final file to {output_path}")
final_resume = create_gpt_resume(
    CONTACT,
    json_data["summary"],
    json_data["skills"],
    json_data["experience"],
    EDUCATION,
    output_path,
)


print(f"Tailored resume saved to {output_path}")
