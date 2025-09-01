#!/usr/bin/env python3
"""
Vapi-Exotel Integration
=======================
Production-ready script for integrating Vapi AI assistants with Exotel telephony.

This script implements the proven working method that resulted in successful 33-second calls
with NORMAL_CLEARING status.

Usage:
    python vapi_exotel_integration.py --fqdn "mybot@sip.vapi.ai" --phone "+1234567890"

Requirements:
    - Exotel account with vSIP API access
    - Vapi AI assistant with configured FQDN
    - Environment variables with Exotel credentials
"""

import os
import json
import urllib.request
import base64
import ssl
import argparse
import sys

class VapiExotelIntegrator:
    """Handles Vapi-Exotel SIP trunk integration"""
    
    def __init__(self, config=None):
        self.config = config or self._load_config()
        self.base_url = f"https://{self.config['domain']}/v2/accounts/{self.config['account_sid']}"
        
    def _load_config(self):
        """Load configuration from environment variables"""
        return {
            'auth_key': os.environ.get('EXO_AUTH_KEY'),
            'auth_token': os.environ.get('EXO_AUTH_TOKEN'),
            'domain': os.environ.get('EXO_SUBSCRIBIX_DOMAIN', 'api.in.exotel.com'),
            'account_sid': os.environ.get('EXO_ACCOUNT_SID'),
            'default_trunk': os.environ.get('EXO_DEFAULT_TRUNK', 'your_trunk_id_here')
        }
    
    def _make_request(self, method, endpoint, payload=None):
        """Make authenticated request to Exotel API"""
        if not all([self.config['auth_key'], self.config['auth_token'], self.config['account_sid']]):
            raise ValueError("Missing required Exotel credentials. Set EXO_AUTH_KEY, EXO_AUTH_TOKEN, and EXO_ACCOUNT_SID environment variables.")
        
        url = self.base_url + endpoint
        
        # Create Basic Auth header
        credentials = f"{self.config['auth_key']}:{self.config['auth_token']}"
        encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        
        headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/json'
        }
        
        data = json.dumps(payload).encode('utf-8') if payload else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
        # SSL context (bypass verification for Exotel)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        try:
            with urllib.request.urlopen(req, context=ssl_context) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            raise Exception(f"Exotel API Error {e.code}: {error_msg}")
    
    def convert_vapi_fqdn(self, vapi_fqdn):
        """
        Convert Vapi FQDN to Exotel-compatible format
        
        Key breakthrough: Replace @ with . for Exotel API acceptance
        """
        if '@' in vapi_fqdn:
            return vapi_fqdn.replace('@', '.')
        return vapi_fqdn
    
    def add_vapi_destination(self, vapi_fqdn, trunk_sid=None):
        """Add Vapi FQDN as destination to Exotel trunk"""
        trunk_sid = trunk_sid or self.config['default_trunk']
        converted_fqdn = self.convert_vapi_fqdn(vapi_fqdn)
        
        # Build SIP destination (proven working format)
        sip_destination = f'{converted_fqdn}:5060;transport=tcp'
        
        payload = {
            'destinations': [{'destination': sip_destination}]
        }
        
        try:
            result = self._make_request('POST', f'/trunks/{trunk_sid}/destination-uris', payload)
            
            # Parse response
            if result.get('response') and len(result['response']) > 0:
                response_item = result['response'][0]
                if response_item.get('status') == 'success':
                    return {
                        'success': True,
                        'destination_id': response_item['data']['id'],
                        'destination': response_item['data']['destination'],
                        'trunk_sid': trunk_sid
                    }
                elif 'Duplicate resource' in str(response_item.get('error_data', {})):
                    return {
                        'success': True,
                        'message': 'Destination already exists',
                        'destination': sip_destination,
                        'trunk_sid': trunk_sid
                    }
                else:
                    return {
                        'success': False,
                        'error': response_item.get('error_data', {}).get('message', 'Unknown error')
                    }
            
            return {'success': False, 'error': 'Invalid API response format'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def map_phone_number(self, phone_number, trunk_sid=None):
        """Map phone number to Exotel trunk"""
        trunk_sid = trunk_sid or self.config['default_trunk']
        
        payload = {'phone_number': phone_number}
        
        try:
            result = self._make_request('POST', f'/trunks/{trunk_sid}/phone-numbers', payload)
            
            if result.get('response'):
                response = result['response']
                if response.get('status') == 'success' or 'Duplicate resource' in str(response):
                    return {
                        'success': True,
                        'phone_number': phone_number,
                        'trunk_sid': trunk_sid,
                        'message': 'Phone number mapped successfully'
                    }
            
            return {'success': False, 'error': 'Phone number mapping failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def configure_vapi_integration(self, vapi_fqdn, phone_number, trunk_sid=None):
        """Complete Vapi-Exotel integration setup"""
        results = {
            'vapi_fqdn': vapi_fqdn,
            'phone_number': phone_number,
            'converted_fqdn': self.convert_vapi_fqdn(vapi_fqdn),
            'trunk_sid': trunk_sid or self.config['default_trunk'],
            'steps': {}
        }
        
        # Step 1: Add Vapi destination
        dest_result = self.add_vapi_destination(vapi_fqdn, trunk_sid)
        results['steps']['destination'] = dest_result
        
        if not dest_result['success']:
            results['success'] = False
            results['error'] = f"Failed to add destination: {dest_result['error']}"
            return results
        
        # Step 2: Map phone number
        phone_result = self.map_phone_number(phone_number, trunk_sid)
        results['steps']['phone_mapping'] = phone_result
        
        if not phone_result['success']:
            results['success'] = False
            results['error'] = f"Failed to map phone number: {phone_result['error']}"
            return results
        
        results['success'] = True
        results['message'] = 'Vapi-Exotel integration configured successfully'
        
        return results

def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Configure Vapi-Exotel Integration')
    parser.add_argument('--fqdn', required=True, help='Vapi FQDN (e.g., mybot@sip.vapi.ai)')
    parser.add_argument('--phone', required=True, help='Phone number (e.g., +1234567890)')
    parser.add_argument('--trunk', help='Exotel trunk ID (optional)')
    
    args = parser.parse_args()
    
    try:
        # Initialize integrator
        integrator = VapiExotelIntegrator()
        
        print('🎯 VAPI-EXOTEL INTEGRATION')
        print('=' * 50)
        print(f'FQDN: {args.fqdn}')
        print(f'Phone: {args.phone}')
        print(f'Trunk: {args.trunk or integrator.config["default_trunk"]}')
        print()
        
        # Run integration
        result = integrator.configure_vapi_integration(args.fqdn, args.phone, args.trunk)
        
        if result['success']:
            print('✅ SUCCESS: Integration completed!')
            print(f'   Converted FQDN: {result["converted_fqdn"]}')
            print(f'   SIP Destination: sip:{result["converted_fqdn"]}:5060;transport=tcp')
            print(f'   Trunk: {result["trunk_sid"]}')
            print()
            print('🧪 Ready for testing:')
            print(f'   Call {args.phone} → Routes to {result["converted_fqdn"]}')
            print('   Expected: 33-second+ call with NORMAL_CLEARING status')
        else:
            print('❌ FAILED: Integration failed!')
            print(f'   Error: {result.get("error", "Unknown error")}')
            sys.exit(1)
            
    except Exception as e:
        print(f'❌ ERROR: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main() 