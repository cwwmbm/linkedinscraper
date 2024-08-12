import os
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
SENDER_EMAIL = os.getenv('SENDER_EMAIL')
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD')
RECIPIENT_EMAIL = os.getenv('RECIPIENT_EMAIL')

def send_email(jobs_list):
    if len(jobs_list) == 0:
        print("No jobs found to send email for.")
        return
    from_email = SENDER_EMAIL
    password = SENDER_PASSWORD
    to_email = RECIPIENT_EMAIL
    subject = create_subject()
    body = create_body_text(jobs_list)

    # Set up the MIME
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject

    # Attach the body with the msg instance
    msg.attach(MIMEText(body, 'plain'))

    # Create an SMTP session
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()  # Start TLS for security

    # Login to the server
    server.login(from_email, password)

    # Convert the message to a string and send it
    server.sendmail(from_email, to_email, msg.as_string())
    print("Email sent successfully!")

    # Close the connection
    server.quit()

# Example usage
# send_email("Test Subject", "This is a test email", RECIPIENT_EMAIL)


def create_subject():
    now = datetime.now()  # Get the current date and time
    timestamp = now.strftime("%a, %b %d, %Y %H:%M")
    return f"Job Bot Run - {timestamp}"


def create_body_text(jobs: list) -> str:
    body_text = ""
    for i, job in enumerate(jobs):
        i += 1
        body_text += f"""
        Job {i}: {job['title']}
        Company: {job['company']}
        Job Description: {job['job_description']}
        Confidence Score: {job['confidence_score']}
        Analysis: {job['analysis']}
        Job URL: {job['job_url']}
        """
    return body_text

# TODO: add body text to email for list of jobs
# TODO: add attachment to email for log file of run
