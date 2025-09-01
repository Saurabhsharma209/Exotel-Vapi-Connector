#!/usr/bin/env python3

from _client import post
import os
import sys

# Check required environment variables
trunk_sid = os.environ.get('TRUNK_SID')
exophone = os.environ.get('EXOPHONE')

if not trunk_sid:
    print("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
    sys.exit(1)

if not exophone:
    print("Warning: EXOPHONE is not set. Skipping trunk alias configuration.")
    sys.exit(0)

# Set trunk alias
print(f"Setting trunk alias {exophone} for trunk {trunk_sid}...")
result = post(f"/trunks/{trunk_sid}/settings", {
    'settings': [{'name': 'trunk_external_alias', 'value': exophone}]
})
print("Trunk alias set successfully!") 