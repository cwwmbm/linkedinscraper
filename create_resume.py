import os
from dotenv import load_dotenv
from openai import OpenAI
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT


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

def save_resume_to_docx(resume_text, output_path):
    doc = Document()

    # Set margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Pt(36)   # 0.5 inches
        section.bottom_margin = Pt(36)  # 0.5 inches
        section.left_margin = Pt(36)  # 0.5 inches
        section.right_margin = Pt(36)  # 0.5 inches

    # Set default font and size
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(10)
    paragraph_format = style.paragraph_format
    paragraph_format.space_after = Pt(0)
    paragraph_format.line_spacing = Pt(12)

    # Add header with name and title
    def add_header(doc, name, title):
        header = doc.sections[0].header
        header_paragraph = header.paragraphs[0]
        header_paragraph.text = name
        header_paragraph.style.font.size = Pt(14)
        header_paragraph.bold = True

        doc.add_paragraph(title).style.font.size = Pt(12)
        doc.add_paragraph('678-409-8713 | phillipsachris@gmail.com | https://cphillips.dev\nhttps://www.linkedin.com/in/chris-a-phillips | https://github.com/chris-a-phillips')

    add_header(doc, 'Chris Phillips', 'Software Engineer')

    # Add Summary section
    def add_summary(doc):
        doc.add_heading('Summary', level=1)
        summary_text = (
            "Results-driven Software Engineer with over three years of experience in developing scalable and "
            "efficient web applications. Adept at solving complex problems and delivering high-quality software "
            "solutions. Proven track record of working collaboratively in Agile and fast-paced environments to "
            "drive innovation and achieve project goals."
        )
        doc.add_paragraph(summary_text)

    add_summary(doc)

    # Add Technical Skills section
    def add_technical_skills(doc):
        doc.add_heading('Technical Skills', level=1)
        skills_text = (
            "Languages: JavaScript, Python, TypeScript, Java, SQL, Bash, HTML/CSS\n"
            "Frameworks/Runtimes: Node, React, Next.js, Express, Mongoose, Luigi, Django\n"
            "Dev Tools: Git, AWS, Docker, Postman, Jenkins\n"
            "Databases: MySQL, MongoDB, PostgreSQL\n"
            "Tools: Git, Docker, GitHub Actions, Jenkins, Jira, Confluence, Kubernetes, Terraform, Datadog"
        )
        doc.add_paragraph(skills_text)

    add_technical_skills(doc)

    # Add Experience section
    def add_experience(doc, experience_text):
        doc.add_heading('Experience', level=1)
        lines = experience_text.split('\n')
        for line in lines:
            if '|' in line:
                job_title, date_range = line.split('|')
                p = doc.add_paragraph()
                p.add_run(job_title.strip()).bold = True
                p.add_run('\t' + date_range.strip()).italic = True
            else:
                doc.add_paragraph(line)

    add_experience(doc, resume_text)

    # Add Education section
    def add_education(doc):
        doc.add_heading('Education', level=1)
        doc.add_paragraph('General Assembly | Remote').add_run('\tOctober 2020 - December 2020').italic = True
        doc.add_paragraph('Software Engineering Immersive')
        doc.add_paragraph('University of North Carolina at Greensboro | Greensboro, North Carolina').add_run('\tAugust 2013 - May 2016').italic = True
        doc.add_paragraph('Psychology')

    add_education(doc)

    # Save the document
    doc.save(output_path)

# Example usage
with open('./data/input/job_description.txt', 'r') as file:
    job_description = file.read()

with open('./data/input/skills_list.txt', 'r') as file:
    skills_list = file.read()

with open('./data/input/resume.docx', 'rb') as file:
    resume_text = file.read()

tailored_resume = tailor_resume(job_description, skills_list, resume_text)
output_path = './data/output/Chris Phillips Resume.docx'
save_resume_to_docx(tailored_resume, output_path)

print(f"Tailored resume saved to {output_path}")
