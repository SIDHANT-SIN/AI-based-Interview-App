import os
import requests
from dotenv import load_dotenv

load_dotenv()

# JDoodle uses specific strings for languages and compiler versions
LANGUAGE_MAPPING = {
    "python": {"language": "python3", "versionIndex": "3"},
    "java":   {"language": "java", "versionIndex": "3"},
    "c":      {"language": "c", "versionIndex": "4"}
}

def execute_code(source_code: str, language: str, stdin: str = ""):
    """
    Sends code to JDoodle's free Compiler API and returns the stdout or error.
    """
    print(f"⚙️ Executing {language} code via JDoodle Sandbox...")

    client_id = os.getenv("JDOODLE_CLIENT_ID")
    client_secret = os.getenv("JDOODLE_CLIENT_SECRET")

    if not client_id or not client_secret:
        return {"status": "error", "output": "⚠️ Missing JDoodle credentials in .env file."}

    url = "https://api.jdoodle.com/v1/execute"

    # Get the correct JDoodle language config, default to Python 3
    lang_config = LANGUAGE_MAPPING.get(language.lower(), LANGUAGE_MAPPING["python"])

    payload = {
        "clientId": client_id,
        "clientSecret": client_secret,
        "script": source_code,
        "language": lang_config["language"],
        "versionIndex": lang_config["versionIndex"],
        "stdin": stdin
    }

    try:
        response = requests.post(url, json=payload)
        result = response.json()
        print(f"JDoodle Response: {result}")
        # JDoodle returns a 200 HTTP status even if the user's code has a syntax error.
        # It puts the syntax error directly into the 'output' field.
        if response.status_code == 200:
            output = result.get("output", "No output returned.")
            
            # JDoodle sometimes returns 'Time Limit Exceeded' in the memory field
            if result.get("memory") == None and "Time Limit" in output:
                return {"status": "error", "output": "Execution timed out (Infinite Loop?)."}
                
            return {"status": "success", "output": output.strip()}
        else:
            # This catches actual API issues (like invalid keys or out of credits)
            error_msg = result.get("error", "Unknown API Error")
            return {"status": "error", "output": f"JDoodle API Error: {error_msg}"}

    except Exception as e:
        print(f"⚠️ Execution Engine Error: {e}")
        return {"status": "error", "output": "Failed to connect to JDoodle servers."}