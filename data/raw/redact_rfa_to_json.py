import pandas as pd
import re
import json

# Define columns that need full redaction
REDACT_COLUMNS = [
    "Name",
    "Phone Number",
    "Email",
    "Requester",
    "Request Completed By:"
]

REDACTION_TOKEN = "[REDACTED]"

def scrub_notes(text):
    if pd.isna(text):
        return text

    # Redact emails
    text = re.sub(r'\b[\w\.-]+@[\w\.-]+\.\w+\b', REDACTION_TOKEN, text)

    # Redact phone numbers (formats like 1234567890, 123-456-7890, (123) 456-7890)
    text = re.sub(r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})', REDACTION_TOKEN, text)

    # Redact names (simple pattern: capitalized first + last name)
    text = re.sub(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', REDACTION_TOKEN, text)

    return text

def redact_rfa_csv_to_json(input_path, output_path):
    # Try different encodings
    encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
    df = None
    
    for encoding in encodings:
        try:
            df = pd.read_csv(input_path, encoding=encoding)
            print(f"Successfully read file with {encoding} encoding")
            break
        except UnicodeDecodeError:
            continue
    
    if df is None:
        raise ValueError("Could not read the CSV file with any of the attempted encodings")

    # Redact specific columns
    for col in REDACT_COLUMNS:
        if col in df.columns:
            df[col] = REDACTION_TOKEN

    # Scrub the Notes column
    if "Notes" in df.columns:
        df["Notes"] = df["Notes"].apply(scrub_notes)

    # Convert to JSON and write to file
    data = df.to_dict(orient="records")
    
    # Replace NaN with None (which becomes null in JSON)
    for record in data:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Redacted JSON saved to: {output_path}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Redact PII from 2024 RFA Call Log and export to JSON")
    parser.add_argument("input", help="Path to the original CSV file (e.g., rfa_calls_2024.csv)")
    parser.add_argument("--output", default="rfa_calls_redacted.json", help="Output JSON file")

    args = parser.parse_args()
    redact_rfa_csv_to_json(args.input, args.output)