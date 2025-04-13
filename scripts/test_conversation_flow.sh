#!/bin/bash

# Configuration
HOST="http://localhost:3000"
FROM="+18642632521"
TO="+18642632521"

# Function to make curl request and display response
make_request() {
    local body="$1"
    echo "Sending: $body"
    echo "Response:"
    curl -X POST "$HOST/channels/messaging/incoming" \
        -H "Content-Type: application/json" \
        -d "{
            \"Body\": \"$body\",
            \"From\": \"$FROM\",
            \"To\": \"$TO\"
        }"
    echo -e "\n----------------------------------------\n"
}

# Test 1: Start conversation in Spanish
echo "Test 1: Starting conversation in Spanish"
make_request "Necesito ayuda con vivienda"

# Test 2: Provide location
echo "Test 2: Providing location"
make_request "29605"

# Test 3: Specify need
echo "Test 3: Specifying need"
make_request "Vivienda asequible"

# Test 4: Start new conversation in English
echo "Test 4: Starting new conversation in English"
make_request "I need help with education"

# Test 5: Provide location
echo "Test 5: Providing location"
make_request "29601"

# Test 6: Specify need
echo "Test 6: Specifying need"
make_request "ESL classes" 