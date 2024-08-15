import os
import requests
import json
import sqlite3
import sys
import logging
from sqlite3 import Error
from bs4 import BeautifulSoup
import time as tm
from itertools import groupby
from datetime import datetime, timedelta, time
import pandas as pd
import colorlog
from urllib.parse import quote
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException

from utils.jobs.analyze_job import analyze_job
from utils.email.send_email import send_email
from apscheduler.schedulers.blocking import BlockingScheduler


def load_config(file_name):
    # Load the config file
    with open(file_name) as f:
        return json.load(f)


def setup_logger():
    # Create the logs directory if it doesn't exist
    log_directory = "logs"
    if not os.path.exists(log_directory):
        os.makedirs(log_directory)

    # Set up the logger
    logger = logging.getLogger("SchedulerLogger")
    logger.setLevel(logging.INFO)

    # Create a file handler that logs messages to the logs directory with a timestamped filename
    now = datetime.now()  # Get the current date and time
    timestamp = now.strftime("%a, %b %d, %Y %H:%M")
    log_filename = os.path.join(log_directory, f"{timestamp}.log")
    file_handler = logging.FileHandler(log_filename)
    file_handler.setLevel(logging.INFO)

    # Create a logging format
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(formatter)

    # Add the handler to the logger
    logger.addHandler(file_handler)

    return logger


def get_with_retry(url, config, retries=3, delay=1):
    # Get the URL with retries and delay
    for i in range(retries):
        try:
            if len(config["proxies"]) > 0:
                r = requests.get(
                    url, headers=config["headers"], proxies=config["proxies"], timeout=5
                )
            else:
                r = requests.get(url, headers=config["headers"], timeout=5)
            return BeautifulSoup(r.content, "html.parser")
        except requests.exceptions.Timeout:
            logger.info(f"Timeout occurred for URL: {url}, retrying in {delay}s...")
            tm.sleep(delay)
        except Exception as e:
            logger.error(
                f"An error occurred while retrieving the URL: {url}, error: {e}"
            )
    return None


def transform(soup):
    # Parsing the job card info (title, company, location, date, job_url) from the beautiful soup object
    joblist = []
    try:
        divs = soup.find_all("div", class_="base-search-card__info")
    except:
        logger.info("Empty page, no jobs found")
        return joblist
    for item in divs:
        title = item.find("h3").text.strip()
        company = item.find("a", class_="hidden-nested-link")
        location = item.find("span", class_="job-search-card__location")
        parent_div = item.parent
        entity_urn = parent_div["data-entity-urn"]
        job_posting_id = entity_urn.split(":")[-1]
        job_url = "https://www.linkedin.com/jobs/view/" + job_posting_id + "/"

        date_tag_new = item.find("time", class_="job-search-card__listdate--new")
        date_tag = item.find("time", class_="job-search-card__listdate")
        date = (
            date_tag["datetime"]
            if date_tag
            else date_tag_new["datetime"] if date_tag_new else ""
        )
        job_description = ""
        job = {
            "title": title,
            "company": company.text.strip().replace("\n", " ") if company else "",
            "location": location.text.strip() if location else "",
            "date": date,
            "job_url": job_url,
            "job_description": job_description,
            "applied": 0,
            "hidden": 0,
            "interview": 0,
            "rejected": 0,
            "confidence_score": 0,
            "analysis": "",
        }
        joblist.append(job)
    return joblist


def transform_job(soup):
    div = soup.find("div", class_="description__text description__text--rich")
    if div:
        # Remove unwanted elements
        for element in div.find_all(["span", "a"]):
            element.decompose()

        # Replace bullet points
        for ul in div.find_all("ul"):
            for li in ul.find_all("li"):
                li.insert(0, "-")

        text = div.get_text(separator="\n").strip()
        text = text.replace("\n\n", "")
        text = text.replace("::marker", "-")
        text = text.replace("-\n", "- ")
        text = text.replace("Show less", "").replace("Show more", "")
        return text
    else:
        return "Could not find Job Description"


def safe_detect(text):
    try:
        return detect(text)
    except LangDetectException:
        return "en"


def remove_irrelevant_jobs(joblist, config):
    # Filter out jobs based on description, title, and language. Set up in config.json.
    new_joblist = [
        job
        for job in joblist
        if not any(
            word.lower() in job["job_description"].lower()
            for word in config["desc_words"]
        )
    ]
    new_joblist = (
        [
            job
            for job in new_joblist
            if not any(
                word.lower() in job["title"].lower() for word in config["title_exclude"]
            )
        ]
        if len(config["title_exclude"]) > 0
        else new_joblist
    )
    new_joblist = (
        [
            job
            for job in new_joblist
            if any(
                word.lower() in job["title"].lower() for word in config["title_include"]
            )
        ]
        if len(config["title_include"]) > 0
        else new_joblist
    )
    new_joblist = (
        [
            job
            for job in new_joblist
            if safe_detect(job["job_description"]) in config["languages"]
        ]
        if len(config["languages"]) > 0
        else new_joblist
    )
    new_joblist = (
        [
            job
            for job in new_joblist
            if not any(
                word.lower() in job["company"].lower()
                for word in config["company_exclude"]
            )
        ]
        if len(config["company_exclude"]) > 0
        else new_joblist
    )

    return new_joblist


def remove_duplicates(joblist, config):
    # Remove duplicate jobs in the joblist. Duplicate is defined as having the same title and company.
    joblist.sort(key=lambda x: (x["title"], x["company"]))
    joblist = [
        next(g) for k, g in groupby(joblist, key=lambda x: (x["title"], x["company"]))
    ]
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
        logger.error(
            f"Error: The date for job {date_string} - is not in the correct format."
        )
        return None


def create_connection(config):
    # Create a database connection to a SQLite database
    conn = None
    path = config["db_path"]
    try:
        conn = sqlite3.connect(path)  # creates a SQL database in the 'data' directory
        # logger.info(sqlite3.version)
    except Error as e:
        logger.error(e)

    return conn


def create_table(conn, df, table_name):
    """'
    # Create a new table with the data from the dataframe
    df.to_sql(table_name, conn, if_exists='replace', index=False)
    print (f"Created the {table_name} table and added {len(df)} records")
    """
    # Create a new table with the data from the DataFrame
    # Prepare data types mapping from pandas to SQLite
    type_mapping = {
        "int64": "INTEGER",
        "float64": "REAL",
        "datetime64[ns]": "TIMESTAMP",
        "object": "TEXT",
        "bool": "INTEGER",
    }

    # Prepare a string with column names and their types
    columns_with_types = ", ".join(
        f'"{column}" {type_mapping[str(df.dtypes[column])]}' for column in df.columns
    )

    # Prepare SQL query to create a new table
    create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            {columns_with_types}
        );
    """

    # Execute SQL query
    cursor = conn.cursor()
    cursor.execute(create_table_sql)

    # Commit the transaction
    conn.commit()

    # Insert DataFrame records one by one
    insert_sql = f"""
        INSERT INTO "{table_name}" ({', '.join(f'"{column}"' for column in df.columns)})
        VALUES ({', '.join(['?' for _ in df.columns])})
    """
    for record in df.to_dict(orient="records"):
        cursor.execute(insert_sql, list(record.values()))

    # Commit the transaction
    conn.commit()

    logger.info(f"Created the {table_name} table and added {len(df)} records")


def update_table(conn, df, table_name):
    # Update the existing table with new records.
    df_existing = pd.read_sql(f"select * from {table_name}", conn)

    # Create a dataframe with unique records in df that are not in df_existing
    df_new_records = pd.concat([df, df_existing, df_existing]).drop_duplicates(
        ["title", "company", "date"], keep=False
    )

    # If there are new records, append them to the existing table
    if len(df_new_records) > 0:
        df_new_records.to_sql(table_name, conn, if_exists="append", index=False)
        logger.info(
            f"Added {len(df_new_records)} new records to the {table_name} table"
        )
    else:
        logger.info(f"No new records to add to the {table_name} table")


def table_exists(conn, table_name):
    # Check if the table already exists in the database
    cur = conn.cursor()
    cur.execute(
        f"SELECT count(name) FROM sqlite_master WHERE type='table' AND name='{table_name}'"
    )
    if cur.fetchone()[0] == 1:
        return True
    return False


def job_exists(df, job):
    # Check if the job already exists in the dataframe
    if df.empty:
        return False
    # return ((df['title'] == job['title']) & (df['company'] == job['company']) & (df['date'] == job['date'])).any()
    # The job exists if there's already a job in the database that has the same URL
    return (df["job_url"] == job["job_url"]).any() | (
        (
            (df["title"] == job["title"])
            & (df["company"] == job["company"])
            & (df["date"] == job["date"])
        ).any()
    )


def get_jobcards(config):
    # Function to get the job cards from the search results page
    all_jobs = []
    for k in range(0, config["rounds"]):
        for query in config["search_queries"]:
            keywords = quote(query["keywords"])  # URL encode the keywords
            location = quote(query["location"])  # URL encode the location
            for i in range(0, config["pages_to_scrape"]):
                url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={keywords}&location={location}&f_TPR=&f_SB2={config['salary']}&f_WT={query['f_WT']}&geoId=&f_TPR={config['timespan']}&start={25*i}"
                soup = get_with_retry(url, config)
                jobs = transform(soup)
                all_jobs = all_jobs + jobs
                logger.info(f"Finished scraping page: {url}")
    logger.info(f"Total job cards scraped: {len(all_jobs)}")
    all_jobs = remove_duplicates(all_jobs, config)
    logger.info(f"Total job cards after removing duplicates: {len(all_jobs)}")
    all_jobs = remove_irrelevant_jobs(all_jobs, config)
    logger.info(f"Total job cards after removing irrelevant jobs: {len(all_jobs)}")

    return all_jobs


def find_new_jobs(all_jobs, conn, config):
    # From all_jobs, find the jobs that are not already in the database. Function checks both the jobs and filtered_jobs tables.
    jobs_tablename = config["jobs_tablename"]
    filtered_jobs_tablename = config["filtered_jobs_tablename"]
    jobs_db = pd.DataFrame()
    filtered_jobs_db = pd.DataFrame()
    if conn is not None:
        if table_exists(conn, jobs_tablename):
            query = f"SELECT * FROM {jobs_tablename}"
            jobs_db = pd.read_sql_query(query, conn)
        if table_exists(conn, filtered_jobs_tablename):
            query = f"SELECT * FROM {filtered_jobs_tablename}"
            filtered_jobs_db = pd.read_sql_query(query, conn)

    new_joblist = [
        job
        for job in all_jobs
        if not job_exists(jobs_db, job) and not job_exists(filtered_jobs_db, job)
    ]
    return new_joblist


def main(config_file):
    start_time = tm.perf_counter()
    job_list = []

    config = load_config(config_file)
    jobs_tablename = config[
        "jobs_tablename"
    ]  # name of the table to store the "approved" jobs
    filtered_jobs_tablename = config[
        "filtered_jobs_tablename"
    ]  # name of the table to store the jobs that have been filtered out based on description keywords (so that in future they are not scraped again)
    # Scrape search results page and get job cards. This step might take a while based on the number of pages and search queries.
    all_jobs = get_jobcards(config)
    conn = create_connection(config)
    # filtering out jobs that are already in the database
    all_jobs = find_new_jobs(all_jobs, conn, config)
    logger.info(
        f"Total new jobs found after comparing to the database: {len(all_jobs)}"
    )

    if len(all_jobs) > 0:

        for job in all_jobs:
            job_date = convert_date_format(job["date"])
            job_date = datetime.combine(job_date, time())
            # if job is older than a week, skip it
            if job_date < datetime.now() - timedelta(days=config["days_to_scrape"]):
                continue
            logger.info(
                f"Found new job: {job['title']} at {job['company']} {job['job_url']}"
            )
            desc_soup = get_with_retry(job["job_url"], config)
            job["job_description"] = transform_job(desc_soup)
            language = safe_detect(job["job_description"])
            if language not in config["languages"]:
                logger.info(f"Job description language not supported: {language}")
                # continue
            job_list.append(job)

        # Final check - removing jobs based on job description keywords words from the config file
        jobs_to_add = remove_irrelevant_jobs(job_list, config)
        logger.info(f"Total jobs to add: {len(all_jobs)}")
        # Create a list for jobs removed based on job description keywords - they will be added to the filtered_jobs table
        filtered_list = [job for job in job_list if job not in jobs_to_add]
        df = pd.DataFrame(jobs_to_add)
        df_filtered = pd.DataFrame(filtered_list)
        df["date_loaded"] = datetime.now()
        df_filtered["date_loaded"] = datetime.now()
        df["date_loaded"] = df["date_loaded"].astype(str)
        df_filtered["date_loaded"] = df_filtered["date_loaded"].astype(str)

        # jobs_to_email = []
        # for job in jobs_to_add:
        #     if job['job_description'] != 'Could not find Job Description':
        #         gpt_response = analyze_job(job)
        #         if gpt_response[0] >= 85:
        #             job['confidence_score'] = gpt_response[0]
        #             job['analysis'] = gpt_response[1]
        #             jobs_to_email.append(job)
        #             logger.info('Added job to email list 👍')
        #
        # send_email(jobs_to_email)

        if conn is not None:
            # Update or Create the database table for the job list
            if table_exists(conn, jobs_tablename):
                update_table(conn, df, jobs_tablename)
            else:
                create_table(conn, df, jobs_tablename)

            # Update or Create the database table for the filtered out jobs
            if table_exists(conn, filtered_jobs_tablename):
                update_table(conn, df_filtered, filtered_jobs_tablename)
            else:
                create_table(conn, df_filtered, filtered_jobs_tablename)
        else:
            logger.info("Error! cannot create the database connection.")

        df.to_csv("linkedin_jobs.csv", index=False, encoding="utf-8")
        df_filtered.to_csv("linkedin_jobs_filtered.csv", index=False, encoding="utf-8")

    else:
        logger.info("No jobs found")

    end_time = tm.perf_counter()
    logger.info(f"Scraping finished in {end_time - start_time:.2f} seconds")


def scheduled_task(config_file):
    logger.info(f"Starting scheduled task with config file: {config_file}")
    main(config_file)
    logger.info("Scheduled task completed.")


def load_schedule_config(schedule_file):
    with open(schedule_file, "r") as f:
        return json.load(f)


if __name__ == "__main__":
    # Set up the logger
    logger = setup_logger()

    # Default configuration file
    config_file = "config.json"
    schedule_file = None  # Start with no schedule file

    # Check if different config or schedule files were passed as arguments
    if len(sys.argv) == 2:
        schedule_file = sys.argv[1]
    elif len(sys.argv) == 3:
        config_file = sys.argv[1]
        schedule_file = sys.argv[2]

    logger.info(f"Using config file: {config_file}")

    if schedule_file:
        logger.info(f"Using schedule file: {schedule_file}")
        # Load the schedule configuration
        schedule_config = load_schedule_config(schedule_file)

        # Set up the scheduler
        scheduler = BlockingScheduler()

        if schedule_config["type"] == "cron":
            for schedule in schedule_config["schedules"]:
                logger.info(
                    f"Scheduling task on {schedule['day_of_week']} at {schedule['hour']}:{schedule['minute']}"
                )
                scheduler.add_job(
                    scheduled_task,
                    "cron",
                    day_of_week=schedule.get("day_of_week", "*"),
                    hour=schedule.get("hour", 0),
                    minute=schedule.get("minute", 0),
                    args=[config_file],
                )

        # Start the scheduler
        try:
            logger.info("Scheduler started...")
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Scheduler stopped.")
            scheduler.shutdown()
    else:
        # Run the main function immediately if no schedule file is provided
        logger.info("Running the main function without scheduling...")
        main(config_file)
