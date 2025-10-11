import requests
import json
import sqlite3
import sys
import argparse
import shutil
from sqlite3 import Error
from bs4 import BeautifulSoup
import time as tm
from itertools import groupby
from datetime import datetime, timedelta, time
import pandas as pd
from urllib.parse import quote
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException


def load_config(file_name):
    # Load the config file
    with open(file_name) as f:
        return json.load(f)


def verify_db_schema(conn):
    """Verify and update database schema to ensure all required columns exist"""
    cursor = conn.cursor()

    # Get the table information for jobs table
    cursor.execute("PRAGMA table_info(jobs)")
    table_info = cursor.fetchall()
    existing_columns = [column[1] for column in table_info]

    # List of required columns
    required_columns = [
        ('cover_letter', 'TEXT'),
        ('resume', 'TEXT'),
        ('metadata', 'TEXT')
    ]

    # Add missing columns
    for column_name, column_type in required_columns:
        if column_name not in existing_columns:
            cursor.execute(f"ALTER TABLE jobs ADD COLUMN {column_name} {column_type}")
            print(f"Added {column_name} column to jobs table")
            conn.commit()

    # Also check filtered_jobs table if it exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='filtered_jobs'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(filtered_jobs)")
        table_info = cursor.fetchall()
        existing_columns = [column[1] for column in table_info]

        for column_name, column_type in required_columns:
            if column_name not in existing_columns:
                cursor.execute(f"ALTER TABLE filtered_jobs ADD COLUMN {column_name} {column_type}")
                print(f"Added {column_name} column to filtered_jobs table")
                conn.commit()

def get_with_retry(url, config, retries=3, delay=1):
    # Get the URL with retries and delay
    for i in range(retries):
        try:
            if len(config['proxies']) > 0:
                r = requests.get(url, headers=config['headers'], proxies=config['proxies'], timeout=5)
            else:
                r = requests.get(url, headers=config['headers'], timeout=5)
            return BeautifulSoup(r.content, 'html.parser')
        except requests.exceptions.Timeout:
            print(f"Timeout occurred for URL: {url}, retrying in {delay}s...")
            tm.sleep(delay)
        except Exception as e:
            print(f"An error occurred while retrieving the URL: {url}, error: {e}")
    return None

def transform(soup):
    # Parsing the job card info (title, company, location, date, job_url) from the beautiful soup object
    joblist = []
    try:
        divs = soup.find_all('div', class_='base-search-card__info')
    except:
        print("Empty page, no jobs found")
        return joblist
    for item in divs:
        title = item.find('h3').text.strip()
        company = item.find('a', class_='hidden-nested-link')
        location = item.find('span', class_='job-search-card__location')
        parent_div = item.parent
        entity_urn = parent_div['data-entity-urn']
        job_posting_id = entity_urn.split(':')[-1]
        job_url = 'https://www.linkedin.com/jobs/view/'+job_posting_id+'/'

        date_tag_new = item.find('time', class_ = 'job-search-card__listdate--new')
        date_tag = item.find('time', class_='job-search-card__listdate')
        date = date_tag['datetime'] if date_tag else date_tag_new['datetime'] if date_tag_new else ''
        job_description = ''
        job = {
            'title': title,
            'company': company.text.strip().replace('\n', ' ') if company else '',
            'location': location.text.strip() if location else '',
            'date': date,
            'job_url': job_url,
            'job_description': job_description,
            'applied': 0,
            'hidden': 0,
            'interview': 0,
            'rejected': 0
        }
        joblist.append(job)
    return joblist

def transform_job(soup):
    div = soup.find('div', class_='description__text description__text--rich')
    if div:
        # Remove unwanted elements
        for element in div.find_all(['span', 'a']):
            element.decompose()

        # Replace bullet points
        for ul in div.find_all('ul'):
            for li in ul.find_all('li'):
                li.insert(0, '-')

        text = div.get_text(separator='\n').strip()
        text = text.replace('\n\n', '')
        text = text.replace('::marker', '-')
        text = text.replace('-\n', '- ')
        text = text.replace('Show less', '').replace('Show more', '')
        return text
    else:
        return "Could not find Job Description"

def get_job_description_with_retry(job_url, config, max_retries=3):
    """Fetch job description with retries and increasing delays to allow DOM to populate

    Args:
        job_url: URL of the job posting
        config: Configuration dictionary
        max_retries: Maximum number of retry attempts (default: 3)

    Returns:
        str: Job description or "Could not find Job Description" if all retries fail
    """
    delays = [2, 5, 10]  # Increasing delays in seconds for each retry

    for attempt in range(max_retries):
        desc_soup = get_with_retry(job_url, config)

        if desc_soup:
            description = transform_job(desc_soup)

            if description != "Could not find Job Description":
                if attempt > 0:
                    print(f"  Successfully fetched description on attempt {attempt + 1}")
                return description

            # If not the last attempt and description not found, wait and retry
            if attempt < max_retries - 1:
                delay = delays[attempt]
                print(f"  Description not found, retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                tm.sleep(delay)
        else:
            print(f"  Failed to fetch URL on attempt {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                delay = delays[attempt]
                tm.sleep(delay)

    return "Could not find Job Description"

def safe_detect(text):
    try:
        return detect(text)
    except LangDetectException:
        return 'en'

def remove_irrelevant_jobs(joblist, config):
    #Filter out jobs based on description, title, and language. Set up in config.json.
    new_joblist = [job for job in joblist if not any(word.lower() in job['job_description'].lower() for word in config['desc_words'])]   
    new_joblist = [job for job in new_joblist if not any(word.lower() in job['title'].lower() for word in config['title_exclude'])] if len(config['title_exclude']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if any(word.lower() in job['title'].lower() for word in config['title_include'])] if len(config['title_include']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if safe_detect(job['job_description']) in config['languages']] if len(config['languages']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if not any(word.lower() in job['company'].lower() for word in config['company_exclude'])] if len(config['company_exclude']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if not any(word.lower() in job['location'].lower() for word in config['country_exclude'])] if len(config['country_exclude']) > 0 else new_joblist

    return new_joblist

def remove_duplicates(joblist, config):
    # Remove duplicate jobs in the joblist. Duplicate is defined as having the same title and company.
    joblist.sort(key=lambda x: (x['title'], x['company']))
    joblist = [next(g) for k, g in groupby(joblist, key=lambda x: (x['title'], x['company']))]
    return joblist

def convert_date_format(date_string):
    """
    Converts a date string to a date object. 
    
    Args:
        date_string (str): The date in string format.

    Returns:
        date: The converted date object, or None if conversion failed.
    """
    date_format = "%Y-%m-%d"
    try:
        job_date = datetime.strptime(date_string, date_format).date()
        return job_date
    except ValueError:
        print(f"Error: The date for job {date_string} - is not in the correct format.")
        return None

def create_connection(config):
    # Create a database connection to a SQLite database
    conn = None
    path = config['db_path']
    try:
        conn = sqlite3.connect(path) # creates a SQL database in the 'data' directory
        #print(sqlite3.version)
    except Error as e:
        print(e)

    return conn

def create_table(conn, table_name):
    """
    Create a new table with a predefined schema.
    """
    create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            company TEXT,
            location TEXT,
            date TEXT,
            job_url TEXT,
            job_description TEXT,
            applied INTEGER,
            hidden INTEGER,
            interview INTEGER,
            rejected INTEGER,
            date_loaded TEXT,
            cover_letter TEXT,
            resume TEXT,
            metadata TEXT
        );
    """
    try:
        cursor = conn.cursor()
        cursor.execute(create_table_sql)
        conn.commit()
        print(f"Created the {table_name} table.")
    except Error as e:
        print(e)

def update_table(conn, df, table_name):
    # Update the existing table with new records.
    if df.empty:
        print(f"No new records to add to the {table_name} table")
        return

    df_existing_urls = pd.read_sql(f'SELECT job_url FROM {table_name}', conn)
    existing_urls = set(df_existing_urls['job_url'])
    df_new_records = df[~df['job_url'].isin(existing_urls)]

    if not df_new_records.empty:
        # Align columns to prevent errors if df_new_records has extra columns
        with conn:
            cur = conn.cursor()
            cur.execute(f"PRAGMA table_info({table_name})")
            table_columns = [info[1] for info in cur.fetchall()]
        
        df_to_append = df_new_records[[col for col in table_columns if col in df_new_records.columns and col != 'id']]

        df_to_append.to_sql(table_name, conn, if_exists='append', index=False)
        print(f"Added {len(df_to_append)} new records to the {table_name} table")
    else:
        print(f"No new records to add to the {table_name} table")

def table_exists(conn, table_name):
    # Check if the table already exists in the database
    cur = conn.cursor()
    cur.execute(f"SELECT count(name) FROM sqlite_master WHERE type='table' AND name='{table_name}'")
    if cur.fetchone()[0]==1 :
        return True
    return False

def job_exists(df, job):
    # Check if the job already exists in the dataframe
    if df.empty:
        return False
    #return ((df['title'] == job['title']) & (df['company'] == job['company']) & (df['date'] == job['date'])).any()
    #The job exists if there's already a job in the database that has the same URL
    return ((df['job_url'] == job['job_url']).any() | (((df['title'] == job['title']) & (df['company'] == job['company']) & (df['date'] == job['date'])).any()))

def build_search_url(query, config, page_index):
    """
    Build LinkedIn search URL with dynamic parameters from query config.
    
    Args:
        query: Individual search query config object
        config: Main configuration object
        page_index: Page number for pagination (0-based)
    
    Returns:
        str: Complete LinkedIn search URL
    """
    base_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    
    # Required parameters
    params = {
        'keywords': quote(query['keywords']),
        'location': quote(query['location']),
        'start': str(25 * page_index)
    }
    
    # Add dynamic parameters from query config (skip reserved keys)
    reserved_keys = {'keywords', 'location'}
    for key, value in query.items():
        if key not in reserved_keys:
            params[key] = str(value)
    
    # Add global timespan
    params['f_TPR'] = config['timespan']
    
    # Build URL
    param_string = '&'.join([f"{k}={v}" for k, v in params.items()])
    return f"{base_url}?{param_string}"

def get_jobcards(config):
    #Function to get the job cards from the search results page
    all_jobs = []
    for k in range(0, config['rounds']):
        for query in config['search_queries']:
            for i in range (0, config['pages_to_scrape']):
                url = build_search_url(query, config, i)
                soup = get_with_retry(url, config)
                jobs = transform(soup)
                all_jobs = all_jobs + jobs
                print("Finished scraping page: ", url)
    print ("Total job cards scraped: ", len(all_jobs))
    all_jobs = remove_duplicates(all_jobs, config)
    print ("Total job cards after removing duplicates: ", len(all_jobs))
    all_jobs = remove_irrelevant_jobs(all_jobs, config)
    print ("Total job cards after removing irrelevant jobs: ", len(all_jobs))
    return all_jobs

def find_new_jobs(all_jobs, conn, config):
    # From all_jobs, find the jobs that are not already in the database. Function checks both the jobs and filtered_jobs tables.
    jobs_tablename = config['jobs_tablename']
    filtered_jobs_tablename = config['filtered_jobs_tablename']
    jobs_db = pd.DataFrame()
    filtered_jobs_db = pd.DataFrame()    
    if conn is not None:
        if table_exists(conn, jobs_tablename):
            query = f"SELECT * FROM {jobs_tablename}"
            jobs_db = pd.read_sql_query(query, conn)
        if table_exists(conn, filtered_jobs_tablename):
            query = f"SELECT * FROM {filtered_jobs_tablename}"
            filtered_jobs_db = pd.read_sql_query(query, conn)

    new_joblist = [job for job in all_jobs if not job_exists(jobs_db, job) and not job_exists(filtered_jobs_db, job)]
    return new_joblist

def call_openrouter_api(prompt, operation_type="job_analysis", model=None, config=None):
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

def has_job_analysis(conn, job_id):
    """Check if a job has analysis data (non-null and non-empty metadata)"""
    cursor = conn.cursor()
    cursor.execute("SELECT metadata FROM jobs WHERE id = ?", (job_id,))
    result = cursor.fetchone()
    
    if result is None or result[0] is None or result[0].strip() == "":
        return False
    
    # Try to parse the JSON to make sure it's valid analysis data
    try:
        metadata = json.loads(result[0])
        return isinstance(metadata, dict) and len(metadata) > 0
    except (json.JSONDecodeError, TypeError):
        return False

def analyze_job_description(job_id, job_description, job_title, config):
    """Analyze a job description using predefined questions from config"""
    print(f"Analyzing job {job_id}")

    try:
        # Get analysis questions from config
        analysis_questions = config.get("analysis_questions", [])
        if not analysis_questions:
            print("No analysis questions defined in config")
            return None

        # Analyze each question
        analysis_results = {}

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

            prompt = f"""Based on the following job posting, please answer this question in markdown: {question_text}

Job Title: {job_title}

Job Description:
{job_description}

Please provide a concise and relevant answer based only on the information provided in the job title and description."""

            try:
                answer = call_openrouter_api(prompt, operation_type="job_analysis", config=config)
                if answer:
                    analysis_results[question_title] = answer
                else:
                    analysis_results[question_title] = "Unable to analyze"
            except Exception as e:
                print(f"Error analyzing question '{question_title}': {e}")
                analysis_results[question_title] = "Error during analysis"

        return analysis_results

    except Exception as e:
        print(f"Error analyzing job {job_id}: {e}")
        return None

def check_and_analyze_all_jobs(conn, config, mode='not-analyzed'):
    """Check all jobs in the database and perform analysis

    Args:
        conn: Database connection
        config: Configuration dictionary
        mode: Analysis mode
            - 'not-analyzed': Only jobs without analysis (default)
            - 'not-hidden': All jobs that are not hidden (hidden=0)
            - 'all': All jobs regardless of status
    """
    print(f"Checking jobs for analysis (mode: {mode})...")

    try:
        cursor = conn.cursor()

        # Build SQL query based on mode
        if mode == 'not-analyzed':
            query = """
                SELECT id, job_description, title, company
                FROM jobs
                WHERE metadata IS NULL OR metadata = '' OR metadata = 'null'
            """
        elif mode == 'not-hidden':
            query = """
                SELECT id, job_description, title, company
                FROM jobs
                WHERE hidden = 0
            """
        elif mode == 'all':
            query = """
                SELECT id, job_description, title, company
                FROM jobs
            """
        else:
            print(f"Invalid mode: {mode}. Using 'not-analyzed' mode.")
            query = """
                SELECT id, job_description, title, company
                FROM jobs
                WHERE metadata IS NULL OR metadata = '' OR metadata = 'null'
            """

        cursor.execute(query)
        jobs_to_analyze = cursor.fetchall()

        if not jobs_to_analyze:
            print("No jobs found matching the criteria.")
            return

        print(f"Found {len(jobs_to_analyze)} jobs to analyze. Starting analysis...")

        for job_row in jobs_to_analyze:
            job_id, job_description, title, company = job_row

            if not job_description or job_description.strip() == "":
                print(f"Skipping job {job_id} ({title} at {company}) - no job description")
                continue

            print(f"Analyzing job {job_id}: {title} at {company}")

            # Perform the analysis
            analysis_results = analyze_job_description(job_id, job_description, title, config)

            if analysis_results:
                # Store results in metadata column
                metadata_json = json.dumps(analysis_results, indent=2)
                cursor.execute("UPDATE jobs SET metadata = ? WHERE id = ?", (metadata_json, job_id))
                conn.commit()
                print(f"Analysis completed for job {job_id}")
            else:
                print(f"Failed to analyze job {job_id}")

            # Add a small delay to avoid overwhelming the API
            tm.sleep(1)

        print("Job analysis check completed.")

    except Exception as e:
        print(f"Error during job analysis check: {e}")

def backup_database(config):
    """Create a backup of the database file"""
    db_path = config['db_path']

    if not db_path:
        print("Error: No database path specified in config")
        return False

    try:
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{db_path}.backup_{timestamp}"

        # Copy the database file
        shutil.copy2(db_path, backup_path)
        print(f"Database backed up successfully to: {backup_path}")
        return True
    except FileNotFoundError:
        print(f"Error: Database file not found at {db_path}")
        return False
    except Exception as e:
        print(f"Error backing up database: {e}")
        return False

def scrape_jobs(config, conn):
    """Scrape jobs from LinkedIn and save to database"""
    print("\n" + "="*50)
    print("Starting job scraping...")
    start_time = tm.perf_counter()

    jobs_tablename = config['jobs_tablename']
    filtered_jobs_tablename = config['filtered_jobs_tablename']

    # Scrape search results page and get job cards
    all_jobs = get_jobcards(config)

    # Filtering out jobs that are already in the database
    all_jobs = find_new_jobs(all_jobs, conn, config)
    print("Total new jobs found after comparing to the database:", len(all_jobs))

    if len(all_jobs) > 0:
        job_list = []

        for job in all_jobs:
            job_date = convert_date_format(job['date'])
            job_date = datetime.combine(job_date, time())
            # If job is older than a week, skip it
            if job_date < datetime.now() - timedelta(days=config['days_to_scrape']):
                continue
            print('Found new job:', job['title'], 'at', job['company'], job['job_url'])
            job['job_description'] = get_job_description_with_retry(job['job_url'], config)
            language = safe_detect(job['job_description'])
            if language not in config['languages']:
                print('Job description language not supported:', language)
            job_list.append(job)

        # Final check - removing jobs based on job description keywords
        jobs_to_add = remove_irrelevant_jobs(job_list, config)
        print("Total jobs to add:", len(jobs_to_add))

        # Create a list for jobs removed based on job description keywords
        filtered_list = [job for job in job_list if job not in jobs_to_add]
        df = pd.DataFrame(jobs_to_add)
        df_filtered = pd.DataFrame(filtered_list)
        df['date_loaded'] = datetime.now()
        df_filtered['date_loaded'] = datetime.now()
        df['date_loaded'] = df['date_loaded'].astype(str)
        df_filtered['date_loaded'] = df_filtered['date_loaded'].astype(str)

        if conn is not None:
            # Update or Create the database table for the job list
            if table_exists(conn, jobs_tablename):
                update_table(conn, df, jobs_tablename)
            else:
                create_table(conn, jobs_tablename)
                update_table(conn, df, jobs_tablename)

            # Update or Create the database table for the filtered out jobs
            if table_exists(conn, filtered_jobs_tablename):
                update_table(conn, df_filtered, filtered_jobs_tablename)
            else:
                create_table(conn, filtered_jobs_tablename)
                update_table(conn, df_filtered, filtered_jobs_tablename)
        else:
            print("Error! cannot create the database connection.")

        end_time = tm.perf_counter()
        print(f"Scraping finished in {end_time - start_time:.2f} seconds")
        return df, df_filtered
    else:
        print("No new jobs found")
        end_time = tm.perf_counter()
        print(f"Scraping finished in {end_time - start_time:.2f} seconds")
        return pd.DataFrame(), pd.DataFrame()

def analyze_jobs(config, conn, mode='not-analyzed'):
    """Run AI analysis on jobs

    Args:
        config: Configuration dictionary
        conn: Database connection
        mode: Analysis mode
            - 'not-analyzed': Only jobs without analysis (default)
            - 'not-hidden': All jobs that are not hidden
            - 'all': All jobs regardless of status
    """
    print("\n" + "="*50)
    print("Starting job analysis...")
    check_and_analyze_all_jobs(conn, config, mode)

def export_to_csv(config, conn):
    """Export jobs from database to CSV files"""
    print("\n" + "="*50)
    print("Exporting jobs to CSV...")

    jobs_tablename = config['jobs_tablename']
    filtered_jobs_tablename = config['filtered_jobs_tablename']

    try:
        if table_exists(conn, jobs_tablename):
            df = pd.read_sql(f'SELECT * FROM {jobs_tablename}', conn)
            df.to_csv('linkedin_jobs.csv', index=False, encoding='utf-8')
            print(f"Exported {len(df)} jobs to linkedin_jobs.csv")
        else:
            print(f"Table {jobs_tablename} does not exist")

        if table_exists(conn, filtered_jobs_tablename):
            df_filtered = pd.read_sql(f'SELECT * FROM {filtered_jobs_tablename}', conn)
            df_filtered.to_csv('linkedin_jobs_filtered.csv', index=False, encoding='utf-8')
            print(f"Exported {len(df_filtered)} filtered jobs to linkedin_jobs_filtered.csv")
        else:
            print(f"Table {filtered_jobs_tablename} does not exist")
    except Exception as e:
        print(f"Error exporting to CSV: {e}")

def job_passes_filters(job, config):
    """Check if a job passes all the filters from config

    Args:
        job: Dictionary with job data (must have keys: title, company, location, job_description)
        config: Configuration dictionary with filter settings

    Returns:
        bool: True if job passes all filters, False otherwise
    """
    # Check title_exclude
    if config.get('title_exclude') and len(config['title_exclude']) > 0:
        if any(word.lower() in job['title'].lower() for word in config['title_exclude']):
            return False

    # Check title_include (if specified, at least one must match)
    if config.get('title_include') and len(config['title_include']) > 0:
        if not any(word.lower() in job['title'].lower() for word in config['title_include']):
            return False

    # Check company_exclude
    if config.get('company_exclude') and len(config['company_exclude']) > 0:
        if any(word.lower() in job['company'].lower() for word in config['company_exclude']):
            return False

    # Check country_exclude (checks location field)
    if config.get('country_exclude') and len(config['country_exclude']) > 0:
        if any(word.lower() in job['location'].lower() for word in config['country_exclude']):
            return False

    # Check desc_words (exclude based on job description)
    if config.get('desc_words') and len(config['desc_words']) > 0:
        if job.get('job_description'):
            if any(word.lower() in job['job_description'].lower() for word in config['desc_words']):
                return False

    # Check language
    if config.get('languages') and len(config['languages']) > 0:
        if job.get('job_description'):
            detected_lang = safe_detect(job['job_description'])
            if detected_lang not in config['languages']:
                return False

    return True

def refilter_jobs(config, conn):
    """Reapply filters from config to visible jobs and hide those that don't pass

    This function reads all visible jobs (hidden=0) from the database, applies the
    current filter settings from config (title_include, title_exclude, company_exclude,
    country_exclude, desc_words, languages), and sets hidden=1 for jobs that don't
    pass the filters.

    Note: This will ONLY hide jobs that fail filters. It will NOT unhide jobs
    that are already hidden, even if they now pass the filters.
    """
    print("\n" + "="*50)
    print("Refiltering jobs based on current config...")

    jobs_tablename = config['jobs_tablename']

    try:
        if not table_exists(conn, jobs_tablename):
            print(f"Table {jobs_tablename} does not exist")
            return

        cursor = conn.cursor()

        # Get only visible jobs from the database
        cursor.execute(f"""
            SELECT id, title, company, location, job_description
            FROM {jobs_tablename}
            WHERE hidden = 0
        """)

        visible_jobs = cursor.fetchall()

        if not visible_jobs:
            print("No visible jobs found in database")
            return

        print(f"Found {len(visible_jobs)} visible jobs to check against filters...")

        hidden_count = 0

        for job_row in visible_jobs:
            job_id, title, company, location, job_description = job_row

            # Create job dict for filter checking
            job_dict = {
                'title': title or '',
                'company': company or '',
                'location': location or '',
                'job_description': job_description or ''
            }

            # Check if job passes filters
            passes = job_passes_filters(job_dict, config)

            # Only hide jobs that don't pass filters
            if not passes:
                cursor.execute(
                    f"UPDATE {jobs_tablename} SET hidden = 1 WHERE id = ?",
                    (job_id,)
                )
                hidden_count += 1
                print(f"Hiding job {job_id}: {title} at {company}")

        conn.commit()

        print(f"\nRefiltering complete:")
        print(f"  - Jobs newly hidden: {hidden_count}")
        print(f"  - Jobs checked: {len(visible_jobs)}")

    except Exception as e:
        print(f"Error during refiltering: {e}")
        conn.rollback()

def rescrape_failed_jobs(config, conn):
    """Rescrape jobs whose description is 'Could not find Job Description'

    This function finds all jobs in the database where the job_description field
    is equal to 'Could not find Job Description', fetches the job description again,
    and updates the database with the new description.
    """
    print("\n" + "="*50)
    print("Rescraping jobs with failed descriptions...")

    jobs_tablename = config['jobs_tablename']

    try:
        if not table_exists(conn, jobs_tablename):
            print(f"Table {jobs_tablename} does not exist")
            return

        cursor = conn.cursor()

        # Get all jobs with failed descriptions
        cursor.execute(f"""
            SELECT id, title, company, job_url
            FROM {jobs_tablename}
            WHERE job_description = 'Could not find Job Description'
        """)

        failed_jobs = cursor.fetchall()

        if not failed_jobs:
            print("No jobs with failed descriptions found")
            return

        print(f"Found {len(failed_jobs)} jobs with failed descriptions to rescrape...")

        success_count = 0
        still_failed_count = 0

        for job_row in failed_jobs:
            job_id, title, company, job_url = job_row

            print(f"Rescraping job {job_id}: {title} at {company}")
            print(f"  URL: {job_url}")

            # Fetch the job description again with retries
            new_description = get_job_description_with_retry(job_url, config)

            # Update the database
            cursor.execute(
                f"UPDATE {jobs_tablename} SET job_description = ? WHERE id = ?",
                (new_description, job_id)
            )
            conn.commit()

            if new_description == "Could not find Job Description":
                still_failed_count += 1
                print(f"  Still could not find description for job {job_id}")
            else:
                success_count += 1
                print(f"  Successfully updated description for job {job_id}")

                # Trigger analysis for successfully rescraped job
                print(f"  Analyzing job {job_id}...")
                analysis_results = analyze_job_description(job_id, new_description, title, config)

                if analysis_results:
                    metadata_json = json.dumps(analysis_results, indent=2)
                    cursor.execute(f"UPDATE {jobs_tablename} SET metadata = ? WHERE id = ?",
                                 (metadata_json, job_id))
                    conn.commit()
                    print(f"  Analysis completed for job {job_id}")
                else:
                    print(f"  Failed to analyze job {job_id}")

            # Add a small delay to avoid overwhelming LinkedIn and API
            tm.sleep(1)

        print(f"\nRescraping complete:")
        print(f"  - Successfully updated: {success_count}")
        print(f"  - Still failed: {still_failed_count}")
        print(f"  - Total processed: {len(failed_jobs)}")

    except Exception as e:
        print(f"Error during rescraping: {e}")
        conn.rollback()

def main():
    """Main function with CLI argument parsing"""
    parser = argparse.ArgumentParser(
        description='LinkedIn Job Scraper - Modular job scraping and analysis tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --scrape                              # Scrape jobs only
  python main.py --analyze                             # Analyze jobs not yet analyzed
  python main.py --analyze --analyze-mode not-hidden   # Analyze all non-hidden jobs
  python main.py --analyze --analyze-mode all          # Analyze all jobs
  python main.py --scrape --analyze                    # Scrape and analyze
  python main.py --refilter                            # Hide visible jobs that fail filters
  python main.py --rescrape-failed                     # Rescrape jobs with failed descriptions
  python main.py --export-csv                          # Export database to CSV
  python main.py --backup-db                           # Backup the database
  python main.py --full                                # Run full pipeline (default)
  python main.py --config myconfig.json                # Use custom config file
        """
    )

    parser.add_argument('--config', type=str, default='config.json',
                        help='Path to config file (default: config.json)')
    parser.add_argument('--scrape', action='store_true',
                        help='Scrape jobs from LinkedIn and save to database')
    parser.add_argument('--analyze', action='store_true',
                        help='Run AI analysis on jobs')
    parser.add_argument('--analyze-mode', type=str,
                        choices=['not-analyzed', 'not-hidden', 'all'],
                        default='not-analyzed',
                        help='Analysis mode: not-analyzed (default), not-hidden, or all')
    parser.add_argument('--refilter', action='store_true',
                        help='Reapply filters from config and update hidden status for all jobs')
    parser.add_argument('--rescrape-failed', action='store_true',
                        help='Rescrape jobs whose description is "Could not find Job Description"')
    parser.add_argument('--export-csv', action='store_true',
                        help='Export jobs from database to CSV files')
    parser.add_argument('--backup-db', action='store_true',
                        help='Create a backup of the database')
    parser.add_argument('--full', action='store_true',
                        help='Run full pipeline: scrape + analyze (default if no flags specified)')

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config(args.config)
    except FileNotFoundError:
        print(f"Error: Config file '{args.config}' not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in config file '{args.config}': {e}")
        sys.exit(1)

    # If no action flags specified, default to --full
    if not any([args.scrape, args.analyze, args.export_csv, args.backup_db, args.refilter, args.rescrape_failed, args.full]):
        args.full = True

    # Create database connection if needed
    conn = None
    if args.scrape or args.analyze or args.export_csv or args.refilter or args.rescrape_failed or args.full:
        conn = create_connection(config)
        if conn is not None:
            verify_db_schema(conn)
        else:
            print("Error! Cannot create the database connection.")
            sys.exit(1)

    # Execute requested operations
    try:
        start_time = tm.perf_counter()

        # Backup database
        if args.backup_db:
            backup_database(config)

        # Full pipeline (scrape + analyze)
        if args.full:
            print("Running full pipeline...")
            scrape_jobs(config, conn)
            analyze_jobs(config, conn, mode='not-analyzed')
        else:
            # Individual operations
            if args.scrape:
                scrape_jobs(config, conn)

            if args.analyze:
                analyze_jobs(config, conn, mode=args.analyze_mode)

            if args.refilter:
                refilter_jobs(config, conn)

            if args.rescrape_failed:
                rescrape_failed_jobs(config, conn)

            if args.export_csv:
                export_to_csv(config, conn)

        end_time = tm.perf_counter()
        print(f"\nTotal execution time: {end_time - start_time:.2f} seconds")

    finally:
        # Clean up database connection
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()