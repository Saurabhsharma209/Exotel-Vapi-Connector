import os
import json
import urllib.request
import urllib.parse
import sys
import base64
import ssl

# Build base URL from environment variables
def get_base_url():
    domain = os.environ.get('EXO_SUBSCRIBIX_DOMAIN')
    account_sid = os.environ.get('EXO_ACCOUNT_SID')
    
    if not domain or not account_sid:
        print("Error: Missing required environment variables (EXO_SUBSCRIBIX_DOMAIN, EXO_ACCOUNT_SID)")
        sys.exit(1)
    
    base_url = f"https://{domain}/v1/Accounts/{account_sid}"
    print(f"DEBUG: Base URL: {base_url}")
    return base_url

def get_auth_header():
    """Create Basic Authentication header"""
    auth_key = os.environ.get('EXO_AUTH_KEY')
    auth_token = os.environ.get('EXO_AUTH_TOKEN')
    
    if not auth_key or not auth_token:
        print("Error: Missing required environment variables (EXO_AUTH_KEY, EXO_AUTH_TOKEN)")
        sys.exit(1)
    
    # Create basic auth header
    credentials = f"{auth_key}:{auth_token}"
    encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
    return f"Basic {encoded_credentials}"

BASE = get_base_url()

def post(path, payload):
    """Make a POST request to the Exotel API"""
    try:
        data = json.dumps(payload).encode('utf-8')
        auth_header = get_auth_header()
        
        req = urllib.request.Request(
            BASE + path, 
            data=data, 
            headers={
                'Content-Type': 'application/json',
                'Authorization': auth_header
            }, 
            method='POST'
        )
        
        print(f"DEBUG: Making request to: {BASE + path}")
        print(f"DEBUG: Payload: {json.dumps(payload, indent=2)}")
        
        # Create SSL context that bypasses certificate verification
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ssl_context) as resp:
            body = resp.read().decode('utf-8')
            print(f"Response: {body}")
            return json.loads(body)
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        print(e.read().decode('utf-8'))
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1) 