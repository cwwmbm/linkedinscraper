import re
import json

# Extract output fromat from the llm response

def extract_json(text):
    # Remove the markdown code block markers
    json_str = text.split('```json')[1].split('```')[0].strip()
    
    try:
        # Parse the JSON string into a Python object
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return None