#!/usr/bin/env python3

from _client import post
import os
import sys

# Check required environment variables
trunk_sid = os.environ.get('TRUNK_SID')
did_number = os.environ.get('DID_NUMBER')

if not trunk_sid:
    print("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
    sys.exit(1)

if not did_number:
    print("Error: DID_NUMBER is required. Set it in your .env file.")
    sys.exit(1)

# Map DID to trunk
print(f"Mapping DID {did_number} to trunk {trunk_sid}...")
result = post(f"/trunks/{trunk_sid}/phone-numbers", {'phone_number': did_number})
print("DID mapped successfully!") 