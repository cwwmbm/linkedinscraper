import json
import regex

def extract_json(text):
    """
    Extract JSON from a text string, supporting both markdown JSON code blocks 
    and direct JSON structures.
    
    Args:
        text (str): The input text containing JSON
    
    Returns:
        dict or list: Parsed JSON object, or None if parsing fails
    """
    # Try extracting from markdown JSON code block
    try:
        if '```json' in text:
            json_str = text.split('```json')[1].split('```')[0].strip()
            return json.loads(json_str)
    except (IndexError, json.JSONDecodeError):
        pass
    
    # Try to extract JSON from the entire text
    try:
        # Use regex to find the first valid JSON structure
        # This handles nested JSON structures
        json_match = regex.search(r'\{(?:[^{}]|(?R))*\}', text, regex.VERBOSE)
        if json_match:
            return json.loads(json_match.group(0))
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Try parsing the entire text as JSON
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        print("Error: Could not extract valid JSON from the text")
        return None