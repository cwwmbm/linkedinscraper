from linkedin_crawler.agent import company_info_agent, job_evaluation_agent
import pandas as pd
import sqlite3
from uuid import uuid4


# 1. Load Data from sqlite to pandas

conn = sqlite3.connect('data/my_database.db')
df = pd.read_sql_query('SELECT * FROM jobs', conn)



for i, job in df.iterrows():
    # get company name from dataframe
    # 2.1 For each job get company info
    
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
        'candidate_skills': job['skills'],
        'candidate_preferences': job['preferences'],
        'job_desc': job['description']
    }
    
    company_info = company_info_agent.invoke(company_info_state, config)
    address = company_info['address']
    phone_number = company_info['phone_number']
    main_products = company_info['main_products']
    
    
    job_evaluation = job_evaluation_agent.invoke(job_evaluation_state, config)
    match_percentage = job_evaluation['match_percentage']
    overall_assessment = job_evaluation['overall_assessment']
    recommended_next_steps = job_evaluation['recommended_next_steps']
    matched_skills = job_evaluation['matched_skills']
    skill_gaps = job_evaluation['skill_gaps']
    
    # 3. Update the dataframe with the results
    df.loc[i, 'address'] = address
    df.loc[i, 'phone_number'] = phone_number
    df.loc[i,'main_products'] = ', '.join(main_products)
    df.loc[i,'match_percentage'] = match_percentage
    df.loc[i,'overall_assessment'] = overall_assessment
    df.loc[i,'recommended_next_steps'] = ', '.join(recommended_next_steps)
    df.loc[i,'matched_skills'] = str(matched_skills)
    df.loc[i,'skill_gaps'] = str(skill_gaps)


# 4. Update df to sqlite
df.to_sql('jobs', conn, if_exists='replace', index=False)
conn.close()

# 5. Update the google sheet with the results


