# HA Request Line AI Assistant - Example Messages

These examples use the actual configuration from your .env file:
- Twilio Phone Number: +18642632521
- Assistant SID: aia_asst_019626c1-87fb-737e-99ac-1d39292d3339
- Domain: localhost:3000

## Example 1: Housing Assistance Request (English)
```bash
curl -X POST http://localhost:3000/channels/messaging/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "I need help finding affordable housing in Columbia",
    "From": "+18642632521",
    "To": "+18642632521"
  }'
```

## Example 2: Healthcare Information Request (Spanish)
```bash
curl -X POST http://localhost:3000/channels/messaging/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "Necesito información sobre clínicas de salud gratuitas",
    "From": "+18642632521",
    "To": "+18642632521"
  }'
```

## Example 3: Education Program Inquiry (English)
```bash
curl -X POST http://localhost:3000/channels/messaging/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "Where can I find ESL classes near me?",
    "From": "+18642632521",
    "To": "+18642632521"
  }'
```

## Example 4: Emergency Housing Request (Spanish)
```bash
curl -X POST http://localhost:3000/channels/messaging/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "Necesito ayuda urgente con vivienda, estoy sin hogar",
    "From": "+18642632521",
    "To": "+18642632521"
  }'
```

## Example 5: General Assistance Request (English)
```bash
curl -X POST http://localhost:3000/channels/messaging/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "What services do you offer for immigrants?",
    "From": "+18642632521",
    "To": "+18642632521"
  }'
```

## Example 6: Complex Request (English)
```bash
curl -X POST http://localhost:3000/channels/messaging/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "Body": "I need help with housing, healthcare, and learning English. Can you connect me with someone who can help with all of these?",
    "From": "+18642632521",
    "To": "+18642632521"
  }'
```

## Notes
- These examples use your local development server (localhost:3000)
- The From and To numbers are set to your Twilio phone number for testing
- The messages cover different scenarios:
  - Housing assistance
  - Healthcare information
  - Education programs
  - Emergency situations
  - General inquiries
  - Complex multi-issue requests
- Messages are in both English and Spanish to test bilingual support
- You can modify the message content to test different intents and responses 