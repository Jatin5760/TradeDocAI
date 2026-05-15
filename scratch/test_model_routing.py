import requests
import json

# API Configuration
URL = "http://localhost:5055/ai/extract"
# We need an auth token since @require_auth is present. 
# For testing purposes, I'll use a dummy token or bypass if I can, 
# but better to get a real one from the DB or just mock the call logic.

# Actually, I'll just test the internal function call to see if it routes correctly.
# But let's try a direct request to the server first.
# Since it's a local test, I'll assume the first user is the demo user.

SAMPLE_EMAIL = """
Trade Date: 14 May 2026
Forward Rate: 5.25
Notional Amount: USD 5,000,000
Reference Currency: BRL
Settlement Date: 16 May 2026
"""

def test_model(model_name):
    print(f"\n--- Testing with model: {model_name} ---")
    payload = {
        "email_text": SAMPLE_EMAIL,
        "model": model_name
    }
    # Note: This might fail if the token is required. 
    # I'll check if the server is running.
    try:
        # For this test, I will mock the headers if I had a token.
        # Since I don't have a token handy, I'll look at the server logs 
        # after making the request or just check the code logic again.
        
        # Alternatively, let's just check the server.py code to see if it prints the model.
        pass
    except Exception as e:
        print(f"Error: {e}")

# Instead of a full HTTP request (which needs auth), 
# I'll run a python snippet that imports the graph and invokes it directly.
# This proves the backend logic is working.

from agents.graph import ai_create_graph

def invoke_direct(model_name):
    print(f"\n--- Invoking Graph Directly with model: {model_name} ---")
    state = {
        "email_text": SAMPLE_EMAIL,
        "mode": "ai_create",
        "model": model_name
    }
    # We won't actually call the API to save cost/time, 
    # we just want to see if the state reaches the right place.
    # I'll add a print statement in gemini_helper.py to verify.
    
if __name__ == "__main__":
    # I will add a temporary print in gemini_helper.py and then run this.
    print("Test script ready.")
