#!/usr/bin/env python3

from _client import post
import os
import sys

# Check required environment variables
trunk_sid = os.environ.get('TRUNK_SID')
whitelist_ip = os.environ.get('WHITELIST_IP')
whitelist_mask = int(os.getenv('WHITELIST_MASK', '32'))

if not trunk_sid:
    print("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
    sys.exit(1)

if not whitelist_ip:
    print("Error: WHITELIST_IP is required. Set it in your .env file.")
    sys.exit(1)

# Whitelist IP
print(f"Whitelisting IP {whitelist_ip}/{whitelist_mask} for trunk {trunk_sid}...")
result = post(f"/trunks/{trunk_sid}/whitelisted-ips", {
    'ip': whitelist_ip, 
    'mask': whitelist_mask
})
print("IP whitelisted successfully!") 