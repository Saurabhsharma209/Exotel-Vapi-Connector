#!/usr/bin/env bash

# Source environment variables
if [ -f "../.env" ]; then
    source ../.env
elif [ -f ".env" ]; then
    source .env
fi

# Check required environment variables
if [ -z "$EXO_AUTH_KEY" ] || [ -z "$EXO_AUTH_TOKEN" ] || [ -z "$EXO_SUBSCRIBIX_DOMAIN" ] || [ -z "$EXO_ACCOUNT_SID" ]; then
    echo "Error: Missing required environment variables. Please check your .env file."
    exit 1
fi

if [ -z "$TRUNK_SID" ]; then 
    echo "Error: TRUNK_SID is required. Set it in your .env file after creating a trunk."
    exit 1
fi

if [ -z "$EXOPHONE" ]; then 
    echo "Warning: EXOPHONE is not set. Skipping trunk alias configuration."
    exit 0
fi

curl --location --request POST "https://${EXO_AUTH_KEY}:${EXO_AUTH_TOKEN}@${EXO_SUBSCRIBIX_DOMAIN}/v2/accounts/${EXO_ACCOUNT_SID}/trunks/${TRUNK_SID}/settings" \
  --header 'Content-Type: application/json' \
  --data-raw "{
  \"settings\": [ { \"name\": \"trunk_external_alias\", \"value\": \"${EXOPHONE}\" } ]
}" 