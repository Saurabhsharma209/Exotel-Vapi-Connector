# 🚀 Exotel vSIP PSTN Connectivity – Sample Repository

[![Language Support](https://img.shields.io/badge/languages-5-blue.svg)](.) 
[![API Coverage](https://img.shields.io/badge/API%20coverage-100%25-green.svg)](.)
[![Testing](https://img.shields.io/badge/tests-35%2B%20scenarios-brightgreen.svg)](.)
[![Documentation](https://img.shields.io/badge/docs-comprehensive-orange.svg)](.)

**Production-ready reference implementation** for Exotel vSIP APIs in multiple programming languages (cURL, Python, PHP, Go, Java) with comprehensive error handling and testing framework.

## ✨ Features

- 🔧 **Complete API Coverage**: All 5 core vSIP operations
- 🌍 **Multi-Language Support**: cURL, Python, PHP, Go, Java
- 🧪 **Comprehensive Testing**: 35+ test scenarios, all error codes covered
- 📚 **Complete Documentation**: 900+ lines of error reference and guides
- 🔒 **Production-Ready**: Robust error handling, validation, logging
- 🚀 **Zero Dependencies**: Core implementations use standard libraries only

---

## 🎯 API Operations Supported

| Operation | Description | Endpoint |
|-----------|-------------|----------|
| **Trunk Creation** | Create new SIP trunk | `POST /trunks` |
| **DID Mapping** | Map phone number to trunk | `POST /trunks/{sid}/phone-numbers` |
| **IP Whitelisting** | Whitelist IP addresses | `POST /trunks/{sid}/whitelisted-ips` |
| **Destination URIs** | Configure SIP destinations (UDP/TCP/TLS) | `POST /trunks/{sid}/destination-uris` |
| **Trunk Settings** | Set trunk configuration | `POST /trunks/{sid}/settings` |

---

## 🚀 Quick Start

### 1. **Clone & Configure**
```bash
git clone https://github.com/your-username/exotel-vsip-trunk-api.git
cd exotel-vsip-trunk-api

# Copy environment template and add your credentials
cp .env.example .env
# Edit .env with your Exotel API credentials
```

### 2. **Test with cURL** (Fastest)
```bash
cd curl/
./create_trunk.sh
```

### 3. **Test with Python** (Recommended)
```bash
cd python/
python3 create_trunk.py

# Or run comprehensive test suite
python3 tests/test_all_apis.py
```

### 4. **Production Integration**
```bash
# Install Python testing dependencies (optional)
pip3 install -r tests/requirements.txt

# Run all tests to validate your setup
python3 tests/test_all_apis.py --verbose
```

---

## 📁 Repository Structure

```
├── curl/                   # 🟢 Bash/cURL examples (production-ready)
├── python/                 # 🟢 Python examples (production-ready)  
├── php/                    # 🟡 PHP examples (ready, not tested live)
├── go/                     # 🟡 Go examples (ready, not tested live)
├── java/                   # 🟡 Java examples (ready, not tested live)
├── tests/                  # 🧪 Comprehensive testing framework
│   ├── test_all_apis.py   # Main test suite (35+ scenarios)
│   ├── mock_server.py     # Local development server
│   ├── load_test.py       # Performance testing
│   └── requirements.txt   # Python dependencies
├── docs/                   # 📚 Documentation
│   ├── DEBUGGING.md       # Debugging guide
│   ├── ERROR_REPORTS.md   # Error analysis
│   ├── TESTING_SETUP.md   # Testing framework setup
│   └── TESTING_SUMMARY.md # Testing overview
├── logs/                   # 📝 Test results and logs (gitignored)
├── .env.example           # 🔧 Environment template
├── .gitignore             # 🔒 Security-focused gitignore
├── TRUNK_ERRORS_README.md # 🚨 Complete error reference (668 lines)
├── COMPREHENSIVE_TESTING_SUMMARY.md # 📊 Testing summary
└── README.md              # 📖 This file
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` and configure with your Exotel credentials:

### **Required Configuration**
| Variable | Description | Where to Find | Example |
|----------|-------------|---------------|---------|
| `EXO_AUTH_KEY` | Your Exotel API Key | [API Settings](https://my.in.exotel.com/apisettings/site#api-credentials) | `your_api_key_here` |
| `EXO_AUTH_TOKEN` | Your Exotel Auth Token | [API Settings](https://my.in.exotel.com/apisettings/site#api-credentials) | `your_auth_token_here` |
| `EXO_SUBSCRIBIX_DOMAIN` | Exotel API Domain | [API Settings](https://my.in.exotel.com/apisettings/site#api-credentials) | `api.in.exotel.com` |
| `EXO_ACCOUNT_SID` | Your Account SID | [API Settings](https://my.in.exotel.com/apisettings/site#api-credentials) | `your_account_sid_here` |

### **Optional Testing Configuration**
| Variable | Description | Where to Find | Default |
|----------|-------------|---------------|---------|
| `TRUNK_NAME` | Trunk Name (≤16 chars) | Choose any unique name | `my_test_trunk` |
| `DID_NUMBER` | DID in E.164 format | [Virtual Numbers](https://my.in.exotel.com/numbers) | `+1234567890` |
| `WHITELIST_IP` | IP to whitelist | Your SIP server's public IP | `192.168.1.100` |
| `TRUNK_DEST_IP` | Your SIP server IP | Your SIP server's IP address | `your_sip_server_ip` |
| `EXOPHONE` | Virtual number for alias | [Virtual Numbers](https://my.in.exotel.com/numbers) | `+1234567890` |

**🔒 Security**: Never commit your `.env` file. It's included in `.gitignore`.

---

## 🧪 Testing Framework

### **📬 Postman Collection (Recommended for Quick Testing)**
```bash
# Import files from postman/ directory:
# - Exotel_vSIP_API_Collection.json
# - Exotel_vSIP_Environment.json

# Features:
# ✅ All 5 API operations ready to use
# 🔐 Automatic authentication
# 🔄 TRUNK_SID auto-population
# ✅ Response validation tests
# 📚 Rich documentation
```
👉 **See [postman/POSTMAN_GUIDE.md](postman/POSTMAN_GUIDE.md) for complete Postman setup**

### **Comprehensive Python Test Suite**
```bash
# Run all API tests (35+ scenarios)
python3 tests/test_all_apis.py

# Run specific operation
python3 tests/test_all_apis.py --test create
python3 tests/test_all_apis.py --test map

# Verbose mode with detailed logging
python3 tests/test_all_apis.py --verbose
```

### **Mock Server for Development**
```bash
# Start local mock server
python3 tests/mock_server.py

# Test against mock server (different terminal)
export EXO_SUBSCRIBIX_DOMAIN=localhost:8000
python3 tests/test_all_apis.py
```

### **Load Testing**
```bash
# Performance and rate limit testing
python3 tests/load_test.py
```

### **Multi-Language Testing**
```bash
# Test all language implementations
./tests/test_runner.sh
```

---

## 🌍 Language Implementation Status

| Language | Status | Location | Dependencies | Notes |
|----------|--------|----------|--------------|-------|
| **cURL/Bash** | ✅ Production Ready | `curl/` | None | Tested with real API |
| **Python** | ✅ Production Ready | `python/` | None (stdlib only) | Tested with real API |
| **PHP** | 🟡 Ready | `php/` | cURL extension | Not tested live |
| **Go** | 🟡 Ready | `go/` | Go 1.16+ | Not tested live |
| **Java** | 🟡 Ready | `java/` | Java 11+ | Not tested live |

---

## 📚 Complete Documentation

### **Error Handling & Reference**
- **[`TRUNK_ERRORS_README.md`](TRUNK_ERRORS_README.md)** - 🚨 **Complete error reference** (668 lines)
  - All 17+ error codes with examples and solutions
  - Troubleshooting guide with step-by-step debugging
  - Best practices for error handling and validation
  - Production-ready error handling code examples

### **Testing & Validation**
- **[`COMPREHENSIVE_TESTING_SUMMARY.md`](COMPREHENSIVE_TESTING_SUMMARY.md)** - 📊 Complete testing summary
- **[`docs/TESTING_SETUP.md`](docs/TESTING_SETUP.md)** - Testing framework setup guide
- **[`docs/DEBUGGING.md`](docs/DEBUGGING.md)** - Debugging and troubleshooting guide

### **Error Analysis**
- **[`docs/ERROR_REPORTS.md`](docs/ERROR_REPORTS.md)** - Detailed error analysis and resolution strategies

---

## ⚡ Quick Examples

### **Create Trunk (Python)**
```python
import os
from _client import post

result = post("/trunks", {
    "trunk_name": os.getenv("TRUNK_NAME", "my_trunk"),
    "nso_code": "ANY-ANY", 
    "domain_name": f"{os.getenv('EXO_ACCOUNT_SID')}.pstn.exotel.com"
})
print(f"✅ Trunk created: {result['trunk_sid']}")
```

### **Map DID (cURL)**
```bash
curl -X POST "https://${EXO_AUTH_KEY}:${EXO_AUTH_TOKEN}@${EXO_SUBSCRIBIX_DOMAIN}/v2/accounts/${EXO_ACCOUNT_SID}/trunks/${TRUNK_SID}/phone-numbers" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"'${DID_NUMBER}'"}'
```

### **Comprehensive Error Handling (Python)**
```python
def handle_exotel_error(response_data):
    error_code = response_data.get('response', {}).get('error_data', {}).get('code')
    
    if error_code == 1010:
        return "Authentication failed - check credentials"
    elif error_code == 1002:
        return f"Validation error: {response_data['response']['error_data']['description']}"
    elif error_code == 1008:
        return "Resource already exists - use different name"
    # ... see TRUNK_ERRORS_README.md for complete error handling
```

---

## 🚨 Error Handling

### **Common Error Codes**
| Code | Description | Solution |
|------|-------------|----------|
| **1010** | Authorization failed | Check API credentials in `.env` |
| **1002** | Invalid parameter | Validate input format (see error reference) |
| **1008** | Duplicate resource | Use unique names/IDs |
| **1001** | Missing parameter | Include all required fields |
| **1007** | Invalid JSON | Check request body syntax |
| **1011** | Wrong content type | Use `application/json` |

**📖 Complete Reference**: See [`TRUNK_ERRORS_README.md`](TRUNK_ERRORS_README.md) for all 17+ error scenarios with examples and solutions.

---

## 🔧 System Requirements

### **Minimum Requirements**
- **cURL**: Available on most systems
- **Python**: 3.6+ (no external dependencies for core functionality)
- **PHP**: 7.0+ with cURL extension  
- **Go**: 1.16+
- **Java**: 11+

### **Optional Testing Dependencies**
```bash
pip3 install -r tests/requirements.txt
```

---

## 🔐 Security Best Practices

1. **🔒 Credentials**: Store in `.env` file, never commit to git
2. **🔄 Rotation**: Regularly rotate API keys
3. **📊 Monitoring**: Monitor API usage in Exotel dashboard
4. **🌐 HTTPS**: Always use HTTPS for API calls
5. **🛡️ Validation**: Validate all inputs before API calls

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Testing Contributions**
- All new features must include tests
- Run full test suite: `python3 tests/test_all_apis.py`
- Update documentation for new error scenarios

---

## 📄 License

This project is licensed under the terms specified in the [`LICENSE`](LICENSE) file.

---

## 📞 Support & Resources

### **🔧 Exotel Configuration**
- **🔑 API Credentials**: [Get your API Keys & Account SID](https://my.in.exotel.com/apisettings/site#api-credentials)
- **📱 Virtual Numbers**: [Manage your DIDs/Exophones](https://my.in.exotel.com/numbers)
- **🔄 Call Flows**: [Create flows with Connect Applet](https://my.in.exotel.com/apps#installed-apps)

### **📚 Documentation & Support**
- **🚨 Error Reference**: [`TRUNK_ERRORS_README.md`](TRUNK_ERRORS_README.md)
- **🐛 Issues**: [Create GitHub Issue](../../issues)
- **📧 Exotel Support**: Contact via your Exotel dashboard
- **📖 API Documentation**: [Exotel Developer Portal](https://developer.exotel.com/)
- **🧪 Testing Guide**: [`docs/TESTING_SETUP.md`](docs/TESTING_SETUP.md)

---

## 🏆 Project Status

| Metric | Status |
|--------|--------|
| **API Coverage** | ✅ 100% (5/5 operations) |
| **Error Scenarios** | ✅ 35+ tested |
| **Error Codes** | ✅ 17+ documented |
| **Documentation** | ✅ 900+ lines |
| **Production Ready** | ✅ Yes |
| **Live Testing** | ✅ Validated with real Exotel account |

---

**🚀 Ready for production integration with comprehensive error handling and multi-language support!** 