
# %%
from linkedin_crawler.agent import company_info_agent, job_evaluation_agent
import pandas as pd
import sqlite3
from uuid import uuid4
from linkedin_crawler.utils.user_info import candidate_skills, candidate_preferences
from langgraph.errors import GraphRecursionError
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv
import os

load_dotenv()


# 1. Load Data from sqlite to pandas

conn = sqlite3.connect('data/my_database.db')
df = pd.read_sql_query("SELECT * FROM jobs WHERE DATE(date_loaded) = DATE('now')", conn)

# %%
for i, job in df.iterrows():
    # get company name from dataframe
    # 2.1 For each job get company info
    print("***" * 25)
    print("Processing Company: ", job['job_url'])
    
    # TODO: Change agents to async functions
    config = {"recursion_limit": 10, "configurable": {"thread_id": uuid4()}}

    company_info_state = {
        'messages': [],
        'company': job['company'],
    }

    
    # 2.2 For each job evaluate it
    job_evaluation_state = {
        'messages': [],
        'company': job['company'],
        'candidate_skills': candidate_preferences,
        'candidate_preferences': candidate_skills,
        'job_desc': job['job_description']
    }
    address = None
    phone_number = None
    main_products = None
    try:
        company_info = company_info_agent.invoke(company_info_state, config)
        address = company_info.get('address')
        phone_number = company_info.get('phone_number')
        main_products = company_info.get('main_products')
        
        # 3. Update the dataframe with the results
        
        df.loc[i, 'address'] = address
        df.loc[i, 'phone_number'] = phone_number
        df.loc[i,'main_products'] = main_products
        
    except GraphRecursionError as e:
        print("Recursion error: " + str(e))

    except Exception as e:
        print('Error occurred during company info: ', str(e)  )
        
    finally:
        df.loc[i, 'address'] = str(address)
        df.loc[i, 'phone_number'] = str(phone_number)
        df.loc[i,'main_products'] = str(main_products)
    
    match_percentage = None
    overall_assessment = None
    recommended_next_steps = None
    matched_skills = None
    skill_gaps = None
    
    try:
        job_evaluation = job_evaluation_agent.invoke(job_evaluation_state, config)
        match_percentage = job_evaluation.get('match_percentage')
        overall_assessment = job_evaluation.get('overall_assessment')
        recommended_next_steps = job_evaluation.get('recommended_next_steps')
        matched_skills = job_evaluation.get('matched_skills')
        skill_gaps = job_evaluation.get('skill_gaps')
    
        # 3. Update the dataframe with the results

    except Exception as e:
        print('Error occurred during job evaluation: ', str(e)  )
    finally:
        
        df.loc[i,'match_percentage'] = str(match_percentage)
        df.loc[i,'overall_assessment'] = str(overall_assessment)
        df.loc[i,'recommended_next_steps'] = str(recommended_next_steps)
        df.loc[i,'matched_skills'] = str(matched_skills)
        df.loc[i,'skill_gaps'] = str(skill_gaps)


# %%
df
# %%
# 4. Update df to sqlite
df.to_sql('jobs', conn, if_exists='replace', index=False)
conn.close()

# %%
# 5. Update the google sheet with the results

# 5.1 filter out columns 

filter_out_columns = ['job_description']
df = df.drop(columns=filter_out_columns)

def update_google_sheet(df):
    # Set up credentials
    scope = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ]
    
    # Path to your service account credentials JSON file
    creds = ServiceAccountCredentials.from_json_keyfile_name(os.environ['GOOGLE_APPLICATION_CREDENTIALS'], scope)
    
    # Authorize the client
    client = gspread.authorize(creds)
    
    # Open the Google Sheet
    # You can open by spreadsheet URL or by spreadsheet name
    # Method 1: Open by URL
    # spreadsheet = client.open_by_url('YOUR_SPREADSHEET_URL')
    
    # Method 2: Open by name
    spreadsheet = client.open('linkedin_jobs')
    
    # Select a specific worksheet
    worksheet = spreadsheet.worksheet('test.csv')  # or spreadsheet.get_worksheet(0)
      
    # Convert DataFrame to list of lists for appending
    data_to_append = df.values.tolist()
    
    # Append the entire DataFrame as rows to the sheet
    # I had to set table_range to 'A1', so that the next rows start from the first column. (probably bug from gspread)
    worksheet.append_rows(data_to_append, table_range='A1')

    print("Sheet updated successfully!")

update_google_sheet(df)
    
