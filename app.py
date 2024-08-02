from flask import Flask, render_template, jsonify
import pandas as pd
import sqlite3
import json
import openai
from pdfminer.high_level import extract_text
from flask_cors import CORS

def load_config(file_name):
    # Load the config file
    with open(file_name) as f:
        return json.load(f)

config = load_config('config.json')
app = Flask(__name__)
CORS(app)
app.config['TEMPLATES_AUTO_RELOAD'] = True

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
    jobs = read_jobs_from_db()
    return render_template('./templates/job_description.html', job=jobs[job_id])

@app.route('/get_all_jobs')
def get_all_jobs():
    conn = sqlite3.connect(config["db_path"])
    query = "SELECT * FROM jobs"
    df = pd.read_sql_query(query, conn)
    df = df.sort_values(by='id', ascending=False)
    df.reset_index(drop=True, inplace=True)
    jobs = df.to_dict('records')
    return jsonify(jobs)

@app.route('/job_details/<int:job_id>')
def job_details(job_id):
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    job_tuple = cursor.fetchone()
    conn.close()
    if job_tuple is not None:
        # Get the column names from the cursor description
        column_names = [column[0] for column in cursor.description]
        # Create a dictionary mapping column names to row values
        job = dict(zip(column_names, job_tuple))
        return jsonify(job)
    else:
        return jsonify({"error": "Job not found"}), 404

@app.route('/hide_job/<int:job_id>', methods=['POST'])
def hide_job(job_id):
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    cursor.execute("UPDATE jobs SET hidden = 1 WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as hidden"}), 200


@app.route('/mark_applied/<int:job_id>', methods=['POST'])
def mark_applied(job_id):
    print("Applied clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    query = "UPDATE jobs SET applied = 1 WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id}')  # Log the query
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as applied"}), 200

@app.route('/mark_interview/<int:job_id>', methods=['POST'])
def mark_interview(job_id):
    print("Interview clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    query = "UPDATE jobs SET interview = 1 WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as interview"}), 200

@app.route('/mark_rejected/<int:job_id>', methods=['POST'])
def mark_rejected(job_id):
    print("Rejected clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    query = "UPDATE jobs SET rejected = 1 WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as rejected"}), 200

@app.route('/get_cover_letter/<int:job_id>')
def get_cover_letter(job_id):
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    cursor.execute("SELECT cover_letter FROM jobs WHERE id = ?", (job_id,))
    cover_letter = cursor.fetchone()
    conn.close()
    if cover_letter is not None:
        return jsonify({"cover_letter": cover_letter[0]})
    else:
        return jsonify({"error": "Cover letter not found"}), 404

@app.route('/get_resume/<int:job_id>', methods=['POST'])
def get_resume(job_id):
    print("Resume clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    cursor.execute("SELECT job_description, title, company FROM jobs WHERE id = ?", (job_id,))
    job_tuple = cursor.fetchone()
    if job_tuple is not None:
        # Get the column names from the cursor description
        column_names = [column[0] for column in cursor.description]
        # Create a dictionary mapping column names to row values
        job = dict(zip(column_names, job_tuple))
    resume = read_pdf(config["resume_path"])

    # Check if OpenAI API key is empty
    if not config["OpenAI_API_KEY"]:
        print("Error: OpenAI API key is empty.")
        return jsonify({"error": "OpenAI API key is empty."}), 400

    openai.api_key = config["OpenAI_API_KEY"]
    consideration = ""
    user_prompt = ("You are a career coach with a client that is applying for a job as a " 
                   + job['title'] + " at " + job['company'] 
                   + ". They have a resume that you need to review and suggest how to tailor it for the job. "
                   "Approach this task in the following steps: \n 1. Highlight three to five most important responsibilities for this role based on the job description. "
                   "\n2. Based on these most important responsibilities from the job description, please tailor the resume for this role. Do not make information up. "
                   "Respond with the final resume only. \n\n Here is the job description: " 
                   + job['job_description'] + "\n\n Here is the resume: " + resume)
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

    query = "UPDATE jobs SET resume = ? WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id} and resume: {response}')
    cursor.execute(query, (response, job_id))
    conn.commit()
    conn.close()
    return jsonify({"resume": response}), 200

@app.route('/get_CoverLetter/<int:job_id>', methods=['POST'])
def get_CoverLetter(job_id):
    print("CoverLetter clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()

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

    cursor.execute("SELECT job_description, title, company FROM jobs WHERE id = ?", (job_id,))
    job_tuple = cursor.fetchone()
    if job_tuple is not None:
        column_names = [column[0] for column in cursor.description]
        job = dict(zip(column_names, job_tuple))
    
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
    user_prompt = ("You are a career coach with over 15 years of experience helping job seekers land their dream jobs in tech. You are helping a candidate to write a cover letter for the below role. Approach this task in three steps. Step 1. Identify main challenges someone in this position would face day to day. Step 2. Write an attention grabbing hook for your cover letter that highlights your experience and qualifications in a way that shows you empathize and can successfully take on challenges of the role. Consider incorporating specific examples of how you tackled these challenges in your past work, and explore creative ways to express your enthusiasm for the opportunity. Put emphasis on how the candidate can contribute to company as opposed to just listing accomplishments. Keep your hook within 100 words or less. Step 3. Finish writing the cover letter based on the resume and keep it within 250 words. Respond with final cover letter only. \n job description: " + job['job_description'] + "\n company: " + job['company'] + "\n title: " + job['title'] + "\n resume: " + resume)
    if consideration:
        user_prompt += "\nConsider incorporating that " + consideration

    response = get_chat_gpt(user_prompt)
    if response is None:
        return jsonify({"error": "Failed to get a response from OpenAI."}), 500

    user_prompt2 = ("You are young but experienced career coach helping job seekers land their dream jobs in tech. I need your help crafting a cover letter. Here is a job description: " + job['job_description'] + "\nhere is my resume: " + resume + "\nHere's the cover letter I got so far: " + response + "\nI need you to help me improve it. Let's approach this in following steps. \nStep 1. Please set the formality scale as follows: 1 is conversational English, my initial Cover letter draft is 10. Step 2. Identify three to five ways this cover letter can be improved, and elaborate on each way with at least one thoughtful sentence. Step 4. Suggest an improved cover letter based on these suggestions with the Formality Score set to 7. Avoid subjective qualifiers such as drastic, transformational, etc. Keep the final cover letter within 250 words. Please respond with the final cover letter only.")
    if user_prompt2:
        response = get_chat_gpt(user_prompt2)
        if response is None:
            return jsonify({"error": "Failed to get a response from OpenAI."}), 500

    query = "UPDATE jobs SET cover_letter = ? WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id} and cover letter: {response}')
    cursor.execute(query, (response, job_id))
    conn.commit()
    conn.close()
    return jsonify({"cover_letter": response}), 200

def read_jobs_from_db():
    conn = sqlite3.connect(config["db_path"])
    query = "SELECT * FROM jobs WHERE hidden = 0"
    df = pd.read_sql_query(query, conn)
    df = df.sort_values(by='id', ascending=False)
    # df.reset_index(drop=True, inplace=True)
    return df.to_dict('records')

def verify_db_schema():
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()

    # Get the table information
    cursor.execute("PRAGMA table_info(jobs)")
    table_info = cursor.fetchall()

    # Check if the "cover_letter" column exists
    if "cover_letter" not in [column[1] for column in table_info]:
        # If it doesn't exist, add it
        cursor.execute("ALTER TABLE jobs ADD COLUMN cover_letter TEXT")
        print("Added cover_letter column to jobs table")

    if "resume" not in [column[1] for column in table_info]:
        # If it doesn't exist, add it
        cursor.execute("ALTER TABLE jobs ADD COLUMN resume TEXT")
        print("Added resume column to jobs table")

    conn.close()

if __name__ == "__main__":
    verify_db_schema()  # Verify the DB schema before running the app
    app.run(debug=True, port=5001)
