import requests
import json
import sys
from bs4 import BeautifulSoup
import time as tm
from itertools import groupby
from datetime import datetime, timedelta, time
import pandas as pd
from urllib.parse import quote
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException
from models import Job, FilteredJob
from app import db


def load_config(file_name):
    # Load the config file
    with open(file_name) as f:
        return json.load(f)

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

        job = Job()
        job.title = title
        job.company = company.text.strip().replace('\n', ' ') if company else '',
        job.location = location.text.strip() if location else '',
        job.date = date
        job.job_url = job_url,
        job.job_description = '',

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

def safe_detect(text):
    try:
        return detect(text)
    except LangDetectException:
        return 'en'

def remove_irrelevant_jobs(joblist, config):
    #Filter out jobs based on description, title, and language. Set up in config.json.
    new_joblist = [job for job in joblist if not any(word.lower() in job.job_description.lower() for word in config['desc_words'])]   
    new_joblist = [job for job in new_joblist if not any(word.lower() in job.title.lower() for word in config['title_exclude'])] if len(config['title_exclude']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if any(word.lower() in job.title.lower() for word in config['title_include'])] if len(config['title_include']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if safe_detect(job.job_description) in config['languages']] if len(config['languages']) > 0 else new_joblist
    new_joblist = [job for job in new_joblist if not any(word.lower() in job.company.lower() for word in config['company_exclude'])] if len(config['company_exclude']) > 0 else new_joblist

    return new_joblist

def remove_duplicates(joblist):
    # Remove duplicate jobs in the joblist. Duplicate is defined as having the same title and company.
    joblist.sort(key=lambda x: (x.title, x.company))
    joblist = [next(g) for _, g in groupby(joblist, key=lambda x: (x.title, x.company))]
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

def update_table(rows, model):
    # Update the existing table with new records.
    query = db.select(model)
    db_rows = db.session.execute(query).scalars()

    # Create a dataframe with unique records in df that are not in df_existing
    new_rows = []
    for row in rows:
        if not job_exists(db_rows, row):
            new_rows.insert(row)

    # If there are new records, append them to the existing table
    if len(new_rows) > 0:
        db.session.add(new_rows)
        db.session.commit()
        print (f"Added {len(new_rows)} new records to the {model.__tablename__} table")
    else:
        print (f"No new records to add to the {model.__tablename__} table")

def job_exists(job_list, job):
    # Check if the job already exists in the dataframe
    #The job exists if there's already a job in the database that has the same URL
    return any(job.job_url == j.job_url | job.title == j.title & job.company == j.company & job.date == j.date for j in job_list)

def get_jobcards(config):
    #Function to get the job cards from the search results page
    all_jobs = []
    for _ in range(0, config['rounds']):
        for query in config['search_queries']:
            keywords = quote(query['keywords']) # URL encode the keywords
            location = quote(query['location']) # URL encode the location
            for i in range (0, config['pages_to_scrape']):
                url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={keywords}&location={location}&f_TPR=&f_WT={query['f_WT']}&geoId=&f_TPR={config['timespan']}&start={25*i}"
                soup = get_with_retry(url, config)
                jobs = transform(soup)
                all_jobs = all_jobs + jobs
                print("Finished scraping page: ", url)
    print ("Total job cards scraped: ", len(all_jobs))
    all_jobs = remove_duplicates(all_jobs)
    print ("Total job cards after removing duplicates: ", len(all_jobs))
    all_jobs = remove_irrelevant_jobs(all_jobs, config)
    print ("Total job cards after removing irrelevant jobs: ", len(all_jobs))
    return all_jobs

def find_new_jobs(all_jobs):
    # From all_jobs, find the jobs that are not already in the database. Function checks both the jobs and filtered_jobs tables.
    query = db.select(Job)
    jobs_db = db.session.execute(query).scalars()
    query = db.select(FilteredJob)
    filtered_jobs_db = db.session.execute(query).scalars()

    new_joblist = [job for job in all_jobs if not job_exists(jobs_db, job) and not job_exists(filtered_jobs_db, job)]
    return new_joblist

def main(config_file):
    start_time = tm.perf_counter()
    job_list = []

    config = load_config(config_file)
    db.create_all()

    #Scrape search results page and get job cards. This step might take a while based on the number of pages and search queries.
    all_jobs = get_jobcards(config)

    #filtering out jobs that are already in the database
    all_jobs = find_new_jobs(all_jobs)
    print ("Total new jobs found after comparing to the database: ", len(all_jobs))

    if len(all_jobs) > 0:

        for job in all_jobs:
            job_date = convert_date_format(job.date)
            job_date = datetime.combine(job_date, time())
            #if job is older than a week, skip it
            if job_date < datetime.now() - timedelta(days=config['days_to_scrape']):
                continue
            print('Found new job: ', job.title, 'at ', job.company, job.job_url)
            desc_soup = get_with_retry(job.job_url, config)
            job.job_description = transform_job(desc_soup)
            language = safe_detect(job.job_description)
            if language not in config['languages']:
                print('Job description language not supported: ', language)
                #continue
            job_list.append(job)
        #Final check - removing jobs based on job description keywords words from the config file
        jobs_to_add = remove_irrelevant_jobs(job_list, config)
        print ("Total jobs to add: ", len(jobs_to_add))

        for job in jobs_to_add:
            job.date_loaded = str(datetime.now())
        update_table(jobs_to_add, Job)
        
        filtered_list = [
            FilteredJob(title=job.title, company=job.company, date=job.date, job_url=job.job_url)
            for job in job_list if job not in jobs_to_add]
        update_table(filtered_list, FilteredJob)
        
        df = pd.DataFrame([job.as_dict() for job in jobs_to_add])
        df.to_csv('linkedin_jobs.csv', index=False, encoding='utf-8')
        df_filtered = pd.DataFrame([job.as_dict() for job in filtered_list])
        df_filtered.to_csv('linkedin_jobs_filtered.csv', index=False, encoding='utf-8')
    else:
        print("No jobs found")
    
    end_time = tm.perf_counter()
    print(f"Scraping finished in {end_time - start_time:.2f} seconds")


if __name__ == "__main__":
    config_file = 'config.json'  # default config file
    if len(sys.argv) == 2:
        config_file = sys.argv[1]
        
    main(config_file)