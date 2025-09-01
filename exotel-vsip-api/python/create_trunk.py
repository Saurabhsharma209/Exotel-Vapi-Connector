#!/usr/bin/env python3

from _client import post
import os

# Create trunk with environment variables
trunk_data = {
    'trunk_name': os.getenv('TRUNK_NAME', 'my_ai_trunk'),
    'nso_code': os.getenv('NSO_CODE', 'ANY-ANY'),
    'domain_name': f"{os.environ['EXO_ACCOUNT_SID']}.pstn.exotel.com"
}

print("Creating trunk...")
result = post('/trunks', trunk_data)
print("Trunk created successfully!") 