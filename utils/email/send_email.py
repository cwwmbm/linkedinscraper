import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()  # Loads the .env file into your environment
SENDER_EMAIL = os.getenv('SENDER_EMAIL')
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD')
RECIPIENT_EMAIL = os.getenv('RECIPIENT_EMAIL')

def send_email(subject, body, to_email):
    from_email = SENDER_EMAIL
    password = SENDER_PASSWORD

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
send_email("Test Subject", "This is a test email", RECIPIENT_EMAIL)


# TODO: add timestamp to email subject
# TODO: add body text to email for list of jobs
# TODO: add attachment to email for log file of run
# TODO: add list of jobs to email
