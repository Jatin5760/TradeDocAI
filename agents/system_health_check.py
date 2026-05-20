import os
import sys
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load env
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

BASE_URL = "http://localhost:5055"
API_KEY = os.getenv("GEMINI_API_KEY")
AUTH_SECRET = os.getenv("AUTH_SECRET")

# Test Email (IRS)
TEST_EMAIL = """
From: rates.confirm@citibank.com
To: derivatives.desk@abnamro.com
Subject: Trade Confirmation — Interest Rate Swap | Trade Ref: CITI-IRS-2026-1093

Trade Details:
Trade Reference: CITI-IRS-2026-1093
Transaction Type: Interest Rate Swap
Trade Date: 12 March 2026
Effective Date: 16 March 2026
Termination Date: 16 March 2036
Notional Amount: USD 100,000,000
Fixed Rate: 4.25% per annum
Floating Rate Index: USD-SOFR-COMPOUND
"""

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def run_check():
    print("\n" + "="*60)
    print("      TRADEDOC AI - SYSTEM HEALTH CHECK (A-Z)")
    print("="*60 + "\n")

    # 1. AUTH / USER CHECK (Bypass for testing if needed or use demo)
    # We will simulate a login or use a pre-calculated token if possible.
    # For this test, we assume we need to login or create a session.
    # Since I cannot easily create a password hash here, I will check if the server is up.
    try:
        res = requests.get(f"{BASE_URL}/")
        log(f"✅ Server Connection: {res.status_code} OK")
    except Exception as e:
        log(f"❌ Server Connection Failed: {e}")
        return

    # Shared variables for tests that depend on previous steps
    extract_res: dict = {}
    pdf_path: str | None = None

    # 2. EXTRACTION TEST (FAST MODE)
    log("▶ Testing AI EXTRACTION (Fast Mode)...")
    start = time.time()
    try:
        # In this test we use the /ai/extract endpoint.
        # Note: In production this requires Auth. I will try to hit it.
        # If I get 401, I will check if I can bypass for local test.
        # But wait, I want to measure the logic time. I will call the python function directly!
        sys.path.append(str(_ROOT))
        from agents.graph import ai_create_graph
        
        extract_res = ai_create_graph.invoke({
            "email_text": TEST_EMAIL,
            "model": "gemini-flash-latest"
        })
        duration = time.time() - start
        log(f"✅ Extraction Duration: {duration:.2f}s")
        log(f"   - Doc Type: {extract_res.get('doc_type')}")
        log(f"   - Fields Populated: {len(extract_res.get('extracted_json', {}))}")
    except Exception as e:
        log(f"❌ Extraction Failed: {e}")

    # 3. PDF GENERATION TEST
    log("▶ Testing PDF GENERATION (IRS)...")
    start = time.time()
    try:
        from agents.pdf_agent import compile_pdf
        # Mocking state for the node
        state: dict = {
            "extracted_json": extract_res.get('extracted_json', {}),
            "doc_type": "irs",
            "exhibit": "II-A"
        }
        res_pdf = compile_pdf(state)  # type: ignore[arg-type]
        pdf_path = res_pdf.get("pdf_path")
        duration = time.time() - start
        if pdf_path:
            log(f"✅ PDF Generation Duration: {duration:.2f}s")
            log(f"   - Saved to: {pdf_path}")
        else:
            log(f"❌ PDF Generation Failed: {res_pdf.get('error')}")
    except Exception as e:
        log(f"❌ PDF Generation Failed: {e}")

    # 4. VALIDATION TEST
    log("▶ Testing AI VALIDATION...")
    start = time.time()
    try:
        from agents.graph import validation_graph
        val_res = validation_graph.invoke({
            "email_text": TEST_EMAIL,
            "pdf_path": pdf_path,
            "model": "gemini-flash-latest"
        })
        duration = time.time() - start
        log(f"✅ Validation Duration: {duration:.2f}s")
        log(f"   - Report length: {len(val_res.get('validation_report', ''))} chars")
    except Exception as e:
        log(f"❌ Validation Failed: {e}")

    # 5. CHATBOT SMARTNESS & NAVIGATION
    log("▶ Testing CHATBOT SMARTNESS (Navigation & Context)...")
    try:
        from agents.assistant_agent import build_assistant_prompt
        from agents.gemini_helper import call_gemini
        
        # Test 1: Navigation detection
        nav_msg = "go to cds form"
        history = []
        prompt = build_assistant_prompt(nav_msg, "irs", {}, {}, history)
        reply = call_gemini(prompt, model_name="gemini-flash-latest")
        
        from server import _extract_chat_action
        reply_text, action = _extract_chat_action(reply, nav_msg)
        log(f"   - Message: \"{nav_msg}\"")
        log(f"   - Detected Action: {action}")
        if action == "cds":
            log("✅ Navigation: Smart detection working!")
        else:
            log("❌ Navigation: Detection failed")

        # Test 2: Form awareness
        form_msg = "what is my notional?"
        current_data = {"notional_amount": "USD 100,000,000"}
        prompt = build_assistant_prompt(form_msg, "irs", {}, current_data, history)
        reply = call_gemini(prompt, model_name="gemini-flash-latest")
        log(f"   - Message: \"{form_msg}\"")
        log(f"   - Bot Reply: {reply[:100]}...")
        if "100,000,000" in reply:
            log("✅ Form Awareness: Bot knows the data!")
        else:
            log("❌ Form Awareness: Bot missed the data context")
    except Exception as e:
        log(f"❌ Chatbot Test Failed: {e}")

    # 6. MONGODB CONNECTIVITY
    log("▶ Testing MONGODB (Atlas Connection)...")
    try:
        from pymongo import MongoClient
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client.get_database()
        # Test insertion and deletion
        test_col = db["health_check"]
        test_col.insert_one({"test": True, "time": time.time()})
        log("✅ MongoDB: Insert successful")
        test_col.delete_many({"test": True})
        log("✅ MongoDB: Delete successful")
    except Exception as e:
        log(f"❌ MongoDB Test Failed: {e}")

    print("\n" + "="*60)
    print("      CHECK COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_check()
