import pytest
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from util.utility import (
    create_table,
    create_bar,
    redact_sensitive_info,
)
# ─── Table and Bar Formatting ──────────────────────────────────

def test_create_table():
    data = [["Name", "Type"], ["Matrix", "Movie"], ["Stranger Things", "Series"]]
    table_output = create_table(data)
    assert isinstance(table_output, str)
    assert "Matrix" in table_output
    assert "Series" in table_output

def test_create_bar_single_char():
    bar = create_bar("*")
    assert isinstance(bar, str)
    assert "*" in bar

def test_create_bar_with_text():
    bar = create_bar("Loading")
    assert "Loading" in bar
    assert bar.startswith("\n")

# ─── Redaction ─────────────────────────────────────────────────

def test_redact_sensitive_info():
    test_input = (
        'https://discord.com/api/webhooks/123456/abcdef '
        'refresh_token": "some-token" '
        'access_token": "access-token" '
        'client-id.apps.googleusercontent.com'
    )
    redacted = redact_sensitive_info(test_input)
    assert "webhooks/[redacted]" in redacted
    assert "refresh_token" in redacted and "[redacted]" in redacted
    assert "access_token" in redacted and "[redacted]" in redacted
    assert "apps.googleusercontent.com" in redacted