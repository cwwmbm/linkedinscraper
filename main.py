import requests
import json
import sqlite3
import sys
from sqlite3 import Error
from bs4 import BeautifulSoup
import time as tm
from itertools import groupby
from datetime import datetime, timedelta, time
import pandas as pd
from urllib.parse import quote
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException
import csv
from pathlib import Path
import os
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor

def load_config(file_name):
    with open(file_name) as f:
        config = json.load(f)
    # Check for required paths
    if 'db_path' not in config or not config['db_path']:
        print("Error: 'db_path' is missing in the config file.")
        sys.exit(1)
    if 'custom_csv_path' not in config or not config['custom_csv_path']:
        print("Error: 'custom_csv_path' is missing in the config file.")
        sys.exit(1)
    return config

def ensure_file_and_dir(path, header=None):
    """Ensure the directory exists and the file exists (with header if provided)."""
    path = Path(path)
    if not path.parent.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() and header:
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(header)

def get_with_retry(url, config, retries=3, delay=1):
    for i in range(retries):
        try:
            if len(config.get('proxies', [])) > 0:
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
        job_url = f'https://www.linkedin.com/jobs/view/{job_posting_id}/'
        date_tag_new = item.find('time', class_ = 'job-search-card__listdate--new')
        date_tag = item.find('time', class_='job-search-card__listdate')
        date = date_tag['datetime'] if date_tag else date_tag_new['datetime'] if date_tag_new else ''
        job = {
            'title': title,
            'company': company.text.strip().replace('\n', ' ') if company else '',
            'location': location.text.strip() if location else '',
            'date': date,
            'job_url': job_url,
            'job_description': '',
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
        for element in div.find_all(['span', 'a']):
            element.decompose()
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

def safe_detect(text):
    try:
        return detect(text)
    except LangDetectException:
        return 'en'

def remove_irrelevant_jobs(joblist, config):
    new_joblist = [job for job in joblist if not any(word.lower() in job['job_description'].lower() for word in config['desc_words'])]   
    if config.get('title_exclude'):
        new_joblist = [job for job in new_joblist if not any(word.lower() in job['title'].lower() for word in config['title_exclude'])]
    if config.get('title_include'):
        new_joblist = [job for job in new_joblist if any(word.lower() in job['title'].lower() for word in config['title_include'])]
    if config.get('languages'):
        new_joblist = [job for job in new_joblist if safe_detect(job['job_description']) in config['languages']]
    if config.get('company_exclude'):
        new_joblist = [job for job in new_joblist if not any(word.lower() in job['company'].lower() for word in config['company_exclude'])]
    return new_joblist

def remove_duplicates(joblist, config):
    joblist.sort(key=lambda x: (x['title'], x['company']))
    return [next(g) for k, g in groupby(joblist, key=lambda x: (x['title'], x['company']))]

def convert_date_format(date_string):
    date_format = "%Y-%m-%d"
    try:
        return datetime.strptime(date_string, date_format).date()
    except ValueError:
        print(f"Error: The date for job {date_string} - is not in the correct format.")
        return None

def create_connection(config):
    db_path = Path(config['db_path'])
    if not db_path.parent.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = None
    try:
        conn = sqlite3.connect(str(db_path))
    except Error as e:
        print(e)
    return conn

def create_table(conn, df, table_name):
    type_mapping = {
        'int64': 'INTEGER',
        'float64': 'REAL',
        'datetime64[ns]': 'TIMESTAMP',
        'object': 'TEXT',
        'bool': 'INTEGER'
    }
    columns_with_types = ', '.join(
        f'"{column}" {type_mapping[str(df.dtypes[column])]}'
        for column in df.columns
    )
    create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            {columns_with_types}
        );
    """
    cursor = conn.cursor()
    cursor.execute(create_table_sql)
    conn.commit()
    insert_sql = f"""
        INSERT INTO "{table_name}" ({', '.join(f'"{column}"' for column in df.columns)})
        VALUES ({', '.join(['?' for _ in df.columns])})
    """
    for record in df.to_dict(orient='records'):
        cursor.execute(insert_sql, list(record.values()))
    conn.commit()
    print(f"Created the {table_name} table and added {len(df)} records")

def update_table(conn, df, table_name):
    df_existing = pd.read_sql(f'select * from {table_name}', conn)
    df_new_records = pd.concat([df, df_existing, df_existing]).drop_duplicates(['title', 'company', 'date'], keep=False)
    if len(df_new_records) > 0:
        df_new_records.to_sql(table_name, conn, if_exists='append', index=False)
        print(f"Added {len(df_new_records)} new records to the {table_name} table")
    else:
        print(f"No new records to add to the {table_name} table")

def table_exists(conn, table_name):
    cur = conn.cursor()
    cur.execute(f"SELECT count(name) FROM sqlite_master WHERE type='table' AND name='{table_name}'")
    return cur.fetchone()[0] == 1

def job_exists(df, job):
    if df.empty:
        return False
    return ((df['job_url'] == job['job_url']).any() | 
            (((df['title'] == job['title']) & (df['company'] == job['company']) & (df['date'] == job['date'])).any()))

def fetch_search_page(args):
    query, i, config = args
    keywords = quote(query['keywords'])
    location = quote(query['location'])
    url = (f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?"
           f"keywords={keywords}&location={location}&f_TPR=&f_WT={query['f_WT']}&geoId="
           f"&f_TPR={config['timespan']}&start={25*i}")
    soup = get_with_retry(url, config)
    return transform(soup)

def get_jobcards(config):
    all_jobs = []
    tasks = []
    for query in config['search_queries']:
        for i in range(config['pages_to_scrape']):
            tasks.append((query, i, config))
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(fetch_search_page, tasks)
    for jobs in results:
        all_jobs.extend(jobs)
    print("Finished scraping all job cards")
    all_jobs = remove_duplicates(all_jobs, config)
    print("Total job cards after removing duplicates: ", len(all_jobs))
    all_jobs = remove_irrelevant_jobs(all_jobs, config)
    print("Total job cards after removing irrelevant jobs: ", len(all_jobs))
    return all_jobs

def find_new_jobs(all_jobs, conn, config):
    jobs_tablename = config['jobs_tablename']
    filtered_jobs_tablename = config['filtered_jobs_tablename']
    jobs_db = pd.DataFrame()
    filtered_jobs_db = pd.DataFrame()
    if conn is not None:
        if table_exists(conn, jobs_tablename):
            jobs_db = pd.read_sql_query(f"SELECT * FROM {jobs_tablename}", conn)
        if table_exists(conn, filtered_jobs_tablename):
            filtered_jobs_db = pd.read_sql_query(f"SELECT * FROM {filtered_jobs_tablename}", conn)
    return [job for job in all_jobs if not job_exists(jobs_db, job) and not job_exists(filtered_jobs_db, job)]

def export_jobs_to_custom_csv(df, config):
    """Append jobs to custom CSV in the format: date, job title, company name, job link"""
    if df.empty:
        return
    csv_path = Path(config['custom_csv_path'])
    ensure_file_and_dir(csv_path, header=['date', 'job title', 'company name', 'job link'])
    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Only write header if file was just created (handled by ensure_file_and_dir)
        for _, row in df.iterrows():
            writer.writerow([row['date'], row['title'], row['company'], row['job_url']])
    print(f"Custom CSV appended at {csv_path}")

def fetch_and_transform(job, config):
    job_date = convert_date_format(job['date'])
    if not job_date:
        return None
    job_date = datetime.combine(job_date, time())
    if job_date < datetime.now() - timedelta(days=config['days_to_scrape']):
        return None
    desc_soup = get_with_retry(job['job_url'], config)
    job['job_description'] = transform_job(desc_soup) if desc_soup else ''
    language = safe_detect(job['job_description'])
    if language not in config['languages']:
        print('Job description language not supported:', language)
        return None
    print('Found new job:', job['title'], 'at', job['company'], job['job_url'])
    return job

def ensure_column_exists(conn, table_name, column_name, column_type="TEXT"):
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [info[1] for info in cursor.fetchall()]
    if column_name not in columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        conn.commit()

def main(config_file):
    start_time = tm.perf_counter()
    job_list = []

    config = load_config(config_file)

    # Ensure DB and CSV files/directories exist
    ensure_file_and_dir(config['db_path'])
    ensure_file_and_dir(config['custom_csv_path'], header=['date', 'job title', 'company name', 'job link'])

    jobs_tablename = config['jobs_tablename']
    filtered_jobs_tablename = config['filtered_jobs_tablename']

    all_jobs = get_jobcards(config)
    conn = create_connection(config)
    all_jobs = find_new_jobs(all_jobs, conn, config)
    print("Total new jobs found after comparing to the database: ", len(all_jobs))

    # --- Parallel processing for fetching job descriptions ---
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(lambda job: fetch_and_transform(job, config), all_jobs))
    job_list = [job for job in results if job is not None]

    if job_list:
        jobs_to_add = remove_irrelevant_jobs(job_list, config)
        print("Total jobs to add:", len(jobs_to_add))
        filtered_list = [job for job in job_list if job not in jobs_to_add]
        df = pd.DataFrame(jobs_to_add)
        df_filtered = pd.DataFrame(filtered_list)
        df['date_loaded'] = datetime.now().isoformat()
        df_filtered['date_loaded'] = datetime.now().isoformat()

        if conn is not None:
            if table_exists(conn, jobs_tablename):
                ensure_column_exists(conn, jobs_tablename, "date_loaded", "TEXT")
                update_table(conn, df, jobs_tablename)
            else:
                create_table(conn, df, jobs_tablename)
            if table_exists(conn, filtered_jobs_tablename):
                ensure_column_exists(conn, filtered_jobs_tablename, "date_loaded", "TEXT")
                update_table(conn, df_filtered, filtered_jobs_tablename)
            else:
                create_table(conn, df_filtered, filtered_jobs_tablename)
        else:
            print("Error! cannot create the database connection.")

        export_jobs_to_custom_csv(df, config)
        df.to_csv('linkedin_jobs.csv', index=False, encoding='utf-8')
        df_filtered.to_csv('linkedin_jobs_filtered.csv', index=False, encoding='utf-8')
    else:
        print("No jobs found")

    end_time = tm.perf_counter()
    print(f"Scraping finished in {end_time - start_time:.2f} seconds")

if __name__ == "__main__":
    config_file = 'config.json'
    if len(sys.argv) == 2:
        config_file = sys.argv[1]
    main(config_file)