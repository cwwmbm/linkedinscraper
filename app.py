from flask import Flask, render_template, jsonify
import pandas as pd
import sqlite3
import json
import requests
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
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

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

def call_openrouter_api(prompt, operation_type="job_analysis", model=None):
    """Helper function to call OpenRouter API with operation-specific configurations"""
    
    # Define the configuration keys for each operation type
    operation_configs = {
        "job_analysis": {
            "api_key": "job_analysis_api_key",
            "model": "job_analysis_model"
        },
        "cover_letter": {
            "api_key": "cover_letter_api_key",
            "model": "cover_letter_model"
        },
        "resume": {
            "api_key": "resume_api_key",
            "model": "resume_model"
        }
    }
    
    # Validate operation type
    if operation_type not in operation_configs:
        raise ValueError(f"Invalid operation_type: {operation_type}. Must be one of: {list(operation_configs.keys())}")
    
    # Get the configuration for this operation
    op_config = operation_configs[operation_type]
    api_key = config.get(op_config["api_key"])
    default_model = config.get(op_config["model"])
    
    # Validate API key
    if not api_key:
        raise ValueError(f"API key for {operation_type} is empty or missing: {op_config['api_key']}")
    
    # Use provided model or default for this operation
    if model is None:
        model = default_model
        
    if not model:
        raise ValueError(f"Model for {operation_type} is empty or missing: {op_config['model']}")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions",
                               headers=headers, json=data)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error calling OpenRouter API for {operation_type}: {e}")
        return None

# db = load_config('config.json')['db_path']
# try:
#     api_key = load_config('config.json')['OpenRouter_API_KEY']
#     print("API key found")
# except:
#     print("No OpenRouter API key found. Please add one to config.json")

# try:
#     model = load_config('config.json')['OpenRouter_Model']
#     print("Model found")
# except:
#     print("No OpenRouter Model found or it's incorrectly specified in the config. Please add one to config.json")

@app.route('/')
def home():
    # Serve the Svelte app (this will be updated when we build the app)
    return "Svelte app will be served here. For now, use the Svelte dev server on port 5173."

@app.route('/job/<int:job_id>')
def job(job_id):
    jobs = read_jobs_from_db()
    return render_template('./templates/job_description.html', job=jobs[job_id])

@app.route('/api/get_all_jobs')
def get_all_jobs():
    conn = sqlite3.connect(config["db_path"])
    query = "SELECT * FROM jobs WHERE hidden = 0"
    df = pd.read_sql_query(query, conn)
    df = df.sort_values(by='id', ascending=False)
    df.reset_index(drop=True, inplace=True)
    jobs = df.to_dict('records')
    conn.close()
    return jsonify(jobs)

@app.route('/api/get_all_jobs_including_hidden')
def get_all_jobs_including_hidden():
    conn = sqlite3.connect(config["db_path"])
    query = "SELECT * FROM jobs"
    df = pd.read_sql_query(query, conn)
    df = df.sort_values(by='id', ascending=False)
    df.reset_index(drop=True, inplace=True)
    jobs = df.to_dict('records')
    conn.close()
    return jsonify(jobs)

@app.route('/api/job_details/<int:job_id>')
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

@app.route('/api/hide_job/<int:job_id>', methods=['POST'])
def hide_job(job_id):
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    cursor.execute("UPDATE jobs SET hidden = 1 WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as hidden"}), 200

@app.route('/api/unhide_job/<int:job_id>', methods=['POST'])
def unhide_job(job_id):
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    cursor.execute("UPDATE jobs SET hidden = 0 WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as visible"}), 200


@app.route('/api/mark_applied/<int:job_id>', methods=['POST'])
def mark_applied(job_id):
    print("Applied clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    
    # Get current status
    cursor.execute("SELECT applied FROM jobs WHERE id = ?", (job_id,))
    current_status = cursor.fetchone()[0]
    new_status = 1 - current_status  # Toggle: 0->1, 1->0
    
    # Update with toggle and clear other statuses if setting to 1
    if new_status == 1:
        query = "UPDATE jobs SET applied = 1, interview = 0, rejected = 0, blocked = 0 WHERE id = ?"
    else:
        query = "UPDATE jobs SET applied = 0 WHERE id = ?"
    
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job status updated", "new_status": new_status}), 200

@app.route('/api/mark_interview/<int:job_id>', methods=['POST'])
def mark_interview(job_id):
    print("Interview clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    
    # Get current status
    cursor.execute("SELECT interview FROM jobs WHERE id = ?", (job_id,))
    current_status = cursor.fetchone()[0]
    new_status = 1 - current_status  # Toggle: 0->1, 1->0
    
    # Update with toggle and clear other statuses if setting to 1
    if new_status == 1:
        query = "UPDATE jobs SET interview = 1, applied = 0, rejected = 0, blocked = 0 WHERE id = ?"
    else:
        query = "UPDATE jobs SET interview = 0 WHERE id = ?"
    
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job status updated", "new_status": new_status}), 200

@app.route('/api/mark_rejected/<int:job_id>', methods=['POST'])
def mark_rejected(job_id):
    print("Rejected clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    
    # Get current status
    cursor.execute("SELECT rejected FROM jobs WHERE id = ?", (job_id,))
    current_status = cursor.fetchone()[0]
    new_status = 1 - current_status  # Toggle: 0->1, 1->0
    
    # Update with toggle and clear other statuses if setting to 1
    if new_status == 1:
        query = "UPDATE jobs SET rejected = 1, applied = 0, interview = 0, blocked = 0 WHERE id = ?"
    else:
        query = "UPDATE jobs SET rejected = 0 WHERE id = ?"
    
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job status updated", "new_status": new_status}), 200

@app.route('/api/mark_blocked/<int:job_id>', methods=['POST'])
def mark_blocked(job_id):
    print("Blocked clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    
    # Get current status
    cursor.execute("SELECT blocked FROM jobs WHERE id = ?", (job_id,))
    current_status = cursor.fetchone()[0]
    new_status = 1 - current_status  # Toggle: 0->1, 1->0
    
    # Update with toggle and clear other statuses if setting to 1
    if new_status == 1:
        query = "UPDATE jobs SET blocked = 1, applied = 0, interview = 0, rejected = 0 WHERE id = ?"
    else:
        query = "UPDATE jobs SET blocked = 0 WHERE id = ?"
    
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job status updated", "new_status": new_status}), 200

@app.route('/api/get_cover_letter/<int:job_id>')
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

@app.route('/api/get_resume/<int:job_id>', methods=['POST'])
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
        response = call_openrouter_api(user_prompt, operation_type="resume")
        if response is None:
            return jsonify({"error": "Failed to get response from OpenRouter API"}), 500
    except Exception as e:
        print(f"Error connecting to OpenRouter: {e}")
        return jsonify({"error": f"Error connecting to OpenRouter: {e}"}), 500

    query = "UPDATE jobs SET resume = ? WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id} and resume: {response}')
    cursor.execute(query, (response, job_id))
    conn.commit()
    conn.close()
    return jsonify({"resume": response}), 200

@app.route('/api/get_CoverLetter/<int:job_id>', methods=['POST'])
def get_CoverLetter(job_id):
    print("CoverLetter clicked!")
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()

    def get_chat_gpt(prompt):
        return call_openrouter_api(prompt, operation_type="cover_letter")

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

@app.route('/api/analyze_job/<int:job_id>', methods=['POST'])
def analyze_job(job_id):
    """Analyze a job description using predefined questions from config"""
    print(f"Analyzing job {job_id}")
    
    try:
        conn = sqlite3.connect(config["db_path"])
        cursor = conn.cursor()
        
        # Fetch job details
        cursor.execute("SELECT job_description, title, company FROM jobs WHERE id = ?", (job_id,))
        job_tuple = cursor.fetchone()
        
        if job_tuple is None:
            conn.close()
            return jsonify({"error": "Job not found"}), 404
            
        column_names = [column[0] for column in cursor.description]
        job = dict(zip(column_names, job_tuple))
        
        # Get analysis questions from config
        analysis_questions = config.get("analysis_questions", [])
        if not analysis_questions:
            conn.close()
            return jsonify({"error": "No analysis questions defined in config"}), 400
        
        # Analyze each question
        analysis_results = {}
        job_description = job['job_description']
        
        for question_config in analysis_questions:
            # Handle both old string format and new object format for backward compatibility
            if isinstance(question_config, str):
                # Old format - use the question string as both question and key
                question_text = question_config
                question_title = question_config
            else:
                # New format - use the question and title from the object
                question_text = question_config.get("question", "")
                question_title = question_config.get("title", question_text)
            
            if not question_text:
                continue
                
            prompt = f"""Based on the following job description, please answer this question in markdown: {question_text}

Job Description:
{job_description}

Please provide a concise and relevant answer based only on the information provided in the job description."""
            
            try:
                answer = call_openrouter_api(prompt, operation_type="job_analysis")
                if answer:
                    analysis_results[question_title] = answer
                else:
                    analysis_results[question_title] = "Unable to analyze"
            except Exception as e:
                print(f"Error analyzing question '{question_title}': {e}")
                analysis_results[question_title] = "Error during analysis"
        
        # Store results in metadata column
        metadata_json = json.dumps(analysis_results, indent=2)
        cursor.execute("UPDATE jobs SET metadata = ? WHERE id = ?", (metadata_json, job_id))
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Job analysis completed", "analysis": analysis_results}), 200
        
    except Exception as e:
        print(f"Error analyzing job {job_id}: {e}")
        return jsonify({"error": f"Error analyzing job: {e}"}), 500
@app.route('/api/config', methods=['GET'])
def get_config():
    """Get specific configuration data for the frontend"""
    try:
        # Only return the analysis_questions for security
        return jsonify({
            "analysis_questions": config.get("analysis_questions", [])
        }), 200
    except Exception as e:
        print(f"Error getting config: {e}")
        return jsonify({"error": f"Error getting config: {e}"}), 500

@app.route('/api/get_notes/<int:job_id>')
def get_notes(job_id):
    """Get notes for a specific job"""
    try:
        conn = sqlite3.connect(config["db_path"])
        cursor = conn.cursor()
        cursor.execute("SELECT notes FROM jobs WHERE id = ?", (job_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result is not None:
            return jsonify({"notes": result[0] or ""}), 200
        else:
            return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        print(f"Error getting notes for job {job_id}: {e}")
        return jsonify({"error": f"Error getting notes: {e}"}), 500

@app.route('/api/update_notes/<int:job_id>', methods=['PUT'])
def update_notes(job_id):
    """Update notes for a specific job"""
    try:
        from flask import request
        data = request.get_json()
        
        if not data or 'notes' not in data:
            return jsonify({"error": "Notes content is required"}), 400
            
        notes = data['notes']
        
        conn = sqlite3.connect(config["db_path"])
        cursor = conn.cursor()
        
        # Check if job exists
        cursor.execute("SELECT id FROM jobs WHERE id = ?", (job_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Job not found"}), 404
        
        # Update notes
        cursor.execute("UPDATE jobs SET notes = ? WHERE id = ?", (notes, job_id))
        conn.commit()
        conn.close()
        
        return jsonify({"success": "Notes updated successfully", "notes": notes}), 200
        
    except Exception as e:
        print(f"Error updating notes for job {job_id}: {e}")
        return jsonify({"error": f"Error updating notes: {e}"}), 500

@app.route('/api/get_job_stats')
def get_job_stats():
    conn = sqlite3.connect(config["db_path"])
    cursor = conn.cursor()
    
    # Get total jobs
    cursor.execute("SELECT COUNT(*) FROM jobs")
    total_jobs = cursor.fetchone()[0]
    
    # Get not hidden jobs
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE hidden = 0")
    not_hidden = cursor.fetchone()[0]
    
    # Get applied jobs
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE applied = 1")
    applied = cursor.fetchone()[0]
    
    # Get interview jobs
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE interview = 1")
    interview = cursor.fetchone()[0]
    
    # Get rejected jobs
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE rejected = 1")
    rejected = cursor.fetchone()[0]
    
    # Get blocked jobs
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE blocked = 1")
    blocked = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        "total": total_jobs,
        "not_hidden": not_hidden,
        "applied": applied,
        "interview": interview,
        "rejected": rejected,
        "blocked": blocked
    })

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

    if "metadata" not in [column[1] for column in table_info]:
        # If it doesn't exist, add it
        cursor.execute("ALTER TABLE jobs ADD COLUMN metadata TEXT")
        print("Added metadata column to jobs table")

    if "notes" not in [column[1] for column in table_info]:
        # If it doesn't exist, add it
        cursor.execute("ALTER TABLE jobs ADD COLUMN notes TEXT")
        print("Added notes column to jobs table")

    if "blocked" not in [column[1] for column in table_info]:
        # If it doesn't exist, add it
        cursor.execute("ALTER TABLE jobs ADD COLUMN blocked INTEGER DEFAULT 0")
        print("Added blocked column to jobs table")

    conn.close()

if __name__ == "__main__":
    verify_db_schema()  # Verify the DB schema before running the app
    print(f"Starting Flask app on all interfaces (0.0.0.0:5001)")
    print(f"Local access: http://127.0.0.1:5001")
    print(f"Tailscale access: http://100.98.111.114:5001")
    app.run(debug=True, port=5001, host='0.0.0.0', use_reloader=True, reloader_type='stat')
