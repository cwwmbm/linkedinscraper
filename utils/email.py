
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(subject, body, to_email):
    from_email = "your_email@gmail.com"
    password = "your_email_password"  # Or your app-specific password

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

    # Close the connection
    server.quit()

# Example usage
send_email("Test Subject", "This is a test email", "recipient_email@example.com")

