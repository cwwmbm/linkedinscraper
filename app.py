from flask import Flask, render_template, jsonify
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
import json
import os
import openai
from pdfminer.high_level import extract_text
from flask_cors import CORS
from sqlalchemy.orm import DeclarativeBase
from flask_migrate import Migrate

class Base(DeclarativeBase):
  pass

db = SQLAlchemy(model_class=Base)

def load_config(file_name):
    # Load the config file
    with open(file_name) as f:
        return json.load(f)

config = load_config('config.json')
app = Flask(__name__)
CORS(app)
app.config['TEMPLATES_AUTO_RELOAD'] = True
db_path = os.path.abspath(config["db_path"])
app.config ['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

db.init_app(app)
migrate = Migrate(app, db)

from models import Job

def read_pdf(file_path):
    try:
        text = extract_text(file_path)
        return text
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return None
    except Exception as e:
        print(f"An error occurred while reading the PDF: {e}")
        return None

# db = load_config('config.json')['db_path']
# try:
#     api_key = load_config('config.json')['OpenAI_API_KEY']
#     print("API key found")
# except:
#     print("No OpenAI API key found. Please add one to config.json")

# try:
#     gpt_model = load_config('config.json')['OpenAI_Model']
#     print("Model found")
# except:
#     print("No OpenAI Model found or it's incorrectly specified in the config. Please add one to config.json")

@app.route('/')
def home():
    jobs = read_jobs_from_db()
    return render_template('jobs.html', jobs=jobs)

@app.route('/job/<int:job_id>')
def job(job_id):
    job = db.get_or_404(Job, job_id)
    return render_template('./templates/job_description.html', job=job)

@app.route('/get_all_jobs')
def get_all_jobs():
    query = db.select(Job).order_by(Job.date.desc())
    jobs = db.session.execute(query).scalars()
    return jsonify(jobs)

@app.route('/job_details/<int:job_id>')
def job_details(job_id):
    job = db.session.get(Job, job_id)
    if job is not None:
        return jsonify(job.as_dict())
    else:
        return jsonify({"error": "Job not found"}), 404

@app.route('/hide_job/<int:job_id>', methods=['POST'])
def hide_job(job_id):
    job = db.session.get(Job, job_id)
    job.hidden = 1
    db.session.commit()
    return jsonify({"success": "Job marked as hidden"}), 200


@app.route('/mark_applied/<int:job_id>', methods=['POST'])
def mark_applied(job_id):
    print("Applied clicked!")
    job = db.session.get(Job, job_id)
    job.applied = 1
    print(f'Executing query: mark applied for job_id: {job_id}')  # Log the query
    db.session.commit()
    return jsonify({"success": "Job marked as applied"}), 200

@app.route('/mark_interview/<int:job_id>', methods=['POST'])
def mark_interview(job_id):
    print("Interview clicked!")
    job = db.session.get(Job, job_id)
    job.interview = 1
    print(f'Executing query: mark interviewing-ed for job_id: {job_id}')
    db.session.commit()
    return jsonify({"success": "Job marked as interview"}), 200

@app.route('/mark_rejected/<int:job_id>', methods=['POST'])
def mark_rejected(job_id):
    print("Rejected clicked!")
    job = db.session.get(Job, job_id)
    job.rejected = 1
    print(f'Executing query: mark rejected for job_id: {job_id}')
    db.session.commit()
    return jsonify({"success": "Job marked as rejected"}), 200

@app.route('/get_cover_letter/<int:job_id>')
def get_cover_letter(job_id):
    job = db.session.get(Job, job_id)
    cover_letter = job.cover_letter if job else None
    if cover_letter is not None:
        return jsonify({"cover_letter": cover_letter})
    else:
        return jsonify({"error": "Cover letter not found"}), 404

@app.route('/get_resume/<int:job_id>', methods=['POST'])
def get_resume(job_id):
    print("Resume clicked!")
    job = db.session.get(Job, job_id)

    resume = read_pdf(config["resume_path"])

    # Check if OpenAI API key is empty
    if not config["OpenAI_API_KEY"]:
        print("Error: OpenAI API key is empty.")
        return jsonify({"error": "OpenAI API key is empty."}), 400

    openai.api_key = config["OpenAI_API_KEY"]
    consideration = ""
    user_prompt = ("You are a career coach with a client that is applying for a job as a " 
                   + job.title + " at " + job.company
                   + ". They have a resume that you need to review and suggest how to tailor it for the job. "
                   "Approach this task in the following steps: \n 1. Highlight three to five most important responsibilities for this role based on the job description. "
                   "\n2. Based on these most important responsibilities from the job description, please tailor the resume for this role. Do not make information up. "
                   "Respond with the final resume only. \n\n Here is the job description: " 
                   + job.job_description + "\n\n Here is the resume: " + resume)
    if consideration:
        user_prompt += "\nConsider incorporating that " + consideration

    try:
        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": user_prompt},
            ],
        )
        response = completion.choices[0].message.content
    except Exception as e:
        print(f"Error connecting to OpenAI: {e}")
        return jsonify({"error": f"Error connecting to OpenAI: {e}"}), 500

    job.resume = response
    print(f'Executing query: to add resume for job_id: {job_id} and resume: {response}')
    db.session.commit()
    return jsonify({"resume": response}), 200

@app.route('/get_CoverLetter/<int:job_id>', methods=['POST'])
def get_CoverLetter(job_id):
    print("CoverLetter clicked!")
    job = db.session.get(Job, job_id)

    def get_chat_gpt(prompt):
        try:
            completion = openai.ChatCompletion.create(
                model=config["OpenAI_Model"],
                messages=[
                    {"role": "user", "content": prompt},
                ],
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error connecting to OpenAI: {e}")
            return None

    resume = read_pdf(config["resume_path"])

    # Check if resume is None
    if resume is None:
        print("Error: Resume not found or couldn't be read.")
        return jsonify({"error": "Resume not found or couldn't be read."}), 400

    # Check if OpenAI API key is empty
    if not config["OpenAI_API_KEY"]:
        print("Error: OpenAI API key is empty.")
        return jsonify({"error": "OpenAI API key is empty."}), 400

    openai.api_key = config["OpenAI_API_KEY"]
    consideration = ""
    user_prompt = ("You are a career coach with over 15 years of experience helping job seekers land their dream jobs in tech. You are helping a candidate to write a cover letter for the below role. Approach this task in three steps. Step 1. Identify main challenges someone in this position would face day to day. Step 2. Write an attention grabbing hook for your cover letter that highlights your experience and qualifications in a way that shows you empathize and can successfully take on challenges of the role. Consider incorporating specific examples of how you tackled these challenges in your past work, and explore creative ways to express your enthusiasm for the opportunity. Put emphasis on how the candidate can contribute to company as opposed to just listing accomplishments. Keep your hook within 100 words or less. Step 3. Finish writing the cover letter based on the resume and keep it within 250 words. Respond with final cover letter only. \n job description: "
                   + job.job_description + "\n company: " + job.company + "\n title: " + job.title + "\n resume: " + resume)
    if consideration:
        user_prompt += "\nConsider incorporating that " + consideration

    response = get_chat_gpt(user_prompt)
    if response is None:
        return jsonify({"error": "Failed to get a response from OpenAI."}), 500

    user_prompt2 = ("You are young but experienced career coach helping job seekers land their dream jobs in tech. I need your help crafting a cover letter. Here is a job description: "
                    + job.job_description + "\nhere is my resume: " + resume + "\nHere's the cover letter I got so far: " + response
                    + "\nI need you to help me improve it. Let's approach this in following steps. "
                    "\nStep 1. Please set the formality scale as follows: 1 is conversational English, my initial Cover letter draft is 10. "
                    "Step 2. Identify three to five ways this cover letter can be improved, and elaborate on each way with at least one thoughtful sentence. "
                    "Step 4. Suggest an improved cover letter based on these suggestions with the Formality Score set to 7. Avoid subjective qualifiers such as drastic, transformational, etc. Keep the final cover letter within 250 words. Please respond with the final cover letter only.")
    if user_prompt2:
        response = get_chat_gpt(user_prompt2)
        if response is None:
            return jsonify({"error": "Failed to get a response from OpenAI."}), 500

    job.cover_letter = response
    print(f'Executing query: to add a cover letter for job_id: {job_id} and cover letter: {response}')
    db.session.commit()

    return jsonify({"cover_letter": response}), 200

def read_jobs_from_db():
    query = db.select(Job).filter_by(hidden=0)
    jobs = db.session.execute(query).scalars()
    return jobs

if __name__ == "__main__":
    db.create_all()
    app.run(debug=True, port=5001)
