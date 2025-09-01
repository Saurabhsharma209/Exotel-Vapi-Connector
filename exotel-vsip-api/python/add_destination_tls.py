#!/usr/bin/env python3

from _client import post
import os
import sys

# Check required environment variables
trunk_sid = os.environ.get('TRUNK_SID')
dest_ip = os.environ.get('TRUNK_DEST_IP')
dest_port = os.environ.get('TRUNK_DEST_PORT')

if not trunk_sid:
    print("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
    sys.exit(1)

if not dest_ip or not dest_port:
    print("Error: TRUNK_DEST_IP and TRUNK_DEST_PORT are required. Set them in your .env file.")
    sys.exit(1)

# Add TLS destination
dest = f"{dest_ip}:{dest_port};transport=tls"
print(f"Adding TLS destination {dest} to trunk {trunk_sid}...")
result = post(f"/trunks/{trunk_sid}/destination-uris", {
    'destinations': [{'destination': dest}]
})
print("TLS destination added successfully!") 