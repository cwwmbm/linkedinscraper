import os
from supabase import create_client, Client

# url: str = os.environ.get("https://uxebszdlaulsdsldaszl.supabase.co")
# key: str = os.environ.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZWJzemRsYXVsc2RzbGRhc3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIzOTAyMjUsImV4cCI6MjAwNzk2NjIyNX0.XYiISODFkqNXnNT1mJkfD1ZUG0XxuD4CMHonwNHBBxQ")

url = "https://uxebszdlaulsdsldaszl.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZWJzemRsYXVsc2RzbGRhc3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIzOTAyMjUsImV4cCI6MjAwNzk2NjIyNX0.XYiISODFkqNXnNT1mJkfD1ZUG0XxuD4CMHonwNHBBxQ"    
supabase: Client = create_client(url, key)


data = supabase.auth.sign_in_with_password({"email": "andreypopovqa+1@gmail.com", "password": "Timcpfg1"})

# res = supabase.auth.get_session()


response = supabase.table('tweets').select("*").execute()

print(response.data)


res = supabase.auth.sign_out()