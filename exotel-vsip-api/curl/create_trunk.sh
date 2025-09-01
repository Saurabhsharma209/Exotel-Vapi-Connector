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

curl --location --request POST "https://${EXO_AUTH_KEY}:${EXO_AUTH_TOKEN}@${EXO_SUBSCRIBIX_DOMAIN}/v2/accounts/${EXO_ACCOUNT_SID}/trunks" \
  --header 'Content-Type: application/json' \
  --data-raw "{
  \"trunk_name\": \"${TRUNK_NAME:-my_ai_trunk}\",
  \"nso_code\": \"${NSO_CODE:-ANY-ANY}\",
  \"domain_name\": \"${EXO_ACCOUNT_SID}.pstn.exotel.com\"
}" 