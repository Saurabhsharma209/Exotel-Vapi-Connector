#!/usr/bin/env python3
"""
Example Usage: Vapi-Exotel Integration
=====================================
Simple example showing how to configure Vapi FQDN with Exotel trunk.
"""

import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from vapi_exotel_integration import VapiExotelIntegrator

def main():
    """Example integration setup"""
    
    print('🎯 VAPI-EXOTEL INTEGRATION EXAMPLE')
    print('=' * 50)
    
    # Example configuration
    vapi_fqdn = "mybot@sip.vapi.ai"
    phone_number = "+1234567890"
    
    print(f'Setting up integration for:')
    print(f'  FQDN: {vapi_fqdn}')
    print(f'  Phone: {phone_number}')
    print()
    
    try:
        # Initialize integrator
        integrator = VapiExotelIntegrator()
        
        # Run integration
        result = integrator.configure_vapi_integration(vapi_fqdn, phone_number)
        
        if result['success']:
            print('✅ SUCCESS!')
            print(f'   Converted FQDN: {result["converted_fqdn"]}')
            print(f'   Trunk: {result["trunk_sid"]}')
            print()
            print('🧪 Test your integration:')
            print(f'   1. Call {phone_number}')
            print(f'   2. Expect Vapi assistant to answer')
            print(f'   3. Check call logs for NORMAL_CLEARING status')
        else:
            print('❌ FAILED!')
            print(f'   Error: {result.get("error")}')
            
    except Exception as e:
        print(f'❌ ERROR: {e}')

if __name__ == '__main__':
    main() 