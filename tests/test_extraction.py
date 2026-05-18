import pytest
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

# Add project root to sys.path
_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from agents.extractor_agent import extract_trade_data
from agents.state import DocForgeState

# Mock JSON response from Gemini
MOCK_JSON_EXTRACT = {
    "notional_amount": "USD 1,000,000",
    "fixed_rate_or_amount": "5.0",
    "floating_rate_option": "USD-SOFR"
}

@patch("agents.extractor_agent.call_gemini")
def test_extraction_logic_isolated(mock_call):
    """
    Test ONLY the extraction logic with Mocking.
    This is faster and tests the parsing code directly.
    """
    # Simulate Gemini returning a JSON string
    mock_call.return_value = json.dumps(MOCK_JSON_EXTRACT)
    
    state: DocForgeState = {
        "email_text": "Dummy email content",
        "doc_type": "irs",
        "exhibit": "II-A",
        "model": "gemini-flash-latest"
    }
    
    # Run the agent function directly
    result = extract_trade_data(state)
    
    # Assertions — use .get() for optional TypedDict keys (total=False)
    assert result.get("error") == ""
    extracted = result.get("extracted_json", {})
    assert extracted.get("notional_amount") == "USD 1,000,000"
    assert extracted.get("floating_rate_option") == "USD-SOFR"
    print("\n✅ Isolated Mock Test Passed!")

@patch("agents.extractor_agent.call_gemini")
def test_extraction_error_isolated(mock_call):
    """Test how extraction handles a bad API response."""
    mock_call.return_value = "INVALID JSON"
    
    state: DocForgeState = {
        "email_text": "Dummy",
        "doc_type": "irs",
        "model": "gemini-flash-latest"
    }
    
    result = extract_trade_data(state)
    
    # It should set an error message — use .get() for optional TypedDict keys
    error_msg = result.get("error", "")
    assert "Extraction failed" in error_msg
    print("✅ Error Logic Test Passed!")
