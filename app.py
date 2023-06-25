from flask import Flask, render_template, jsonify
import pandas as pd
import sqlite3

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route('/')
def home():
    jobs = read_jobs_from_db()
    return render_template('jobs.html', jobs=jobs)

@app.route('/job/<int:job_id>')
def job(job_id):
    jobs = read_jobs_from_db()
    return render_template('./templates/job_description.html', job=jobs[job_id])

@app.route('/job_details/<int:job_id>')
def job_details(job_id):
    conn = sqlite3.connect('./data/my_database.db')
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
    conn = sqlite3.connect('./data/my_database.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE jobs SET hidden = 1 WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as hidden"}), 200


@app.route('/mark_applied/<int:job_id>', methods=['POST'])
def mark_applied(job_id):
    print("Applied clicked!")
    conn = sqlite3.connect('./data/my_database.db')
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
    conn = sqlite3.connect('./data/my_database.db')
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
    conn = sqlite3.connect('./data/my_database.db')
    cursor = conn.cursor()
    query = "UPDATE jobs SET rejected = 1 WHERE id = ?"
    print(f'Executing query: {query} with job_id: {job_id}')
    cursor.execute(query, (job_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Job marked as rejected"}), 200

def read_jobs_from_db():
    conn = sqlite3.connect('./data/my_database.db')
    query = "SELECT * FROM jobs WHERE hidden = 0"
    df = pd.read_sql_query(query, conn)
    df = df.sort_values(by='date', ascending=False)
    df.reset_index(drop=True, inplace=True)
    return df.to_dict('records')


if __name__ == "__main__":
    app.run(debug=True)
