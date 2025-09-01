#!/usr/bin/env node

/**
 * Vapi-Exotel Bridge CLI Tool
 * Command-line interface for testing and managing the bridge
 */

import { VapiExotelBridge } from './bridge/VapiExotelBridge.js';
import { VapiExotelSerializerServer } from './server.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple CLI argument parser
const args = process.argv.slice(2);
const command = args[0];

// Helper functions
function showHelp() {
  console.log('📋 Vapi-Exotel Bridge CLI');
  console.log('=========================');
  console.log('');
  console.log('Commands:');
  console.log('  start-server              Start the bridge server');
  console.log('  test                      Run all tests');
  console.log('  health                    Check server health');
  console.log('  list-bridges              List active bridges');
  console.log('  check-config              Validate configuration');
  console.log('  example                   Show API usage examples');
  console.log('  help                      Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  node src/cli.js start-server');
  console.log('  node src/cli.js test');
  console.log('  node src/cli.js health');
}

function showExamples() {
  console.log('📚 Example API Usage');
  console.log('===================');
  console.log('');
  console.log('1. Create a phone call bridge:');
  console.log('   curl -X POST http://localhost:3000/bridge/create-phone-call \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{');
  console.log('       "assistantId": "your_vapi_assistant_id",');
  console.log('       "phoneNumber": "+1234567890",');
  console.log('       "customerNumber": "+0987654321",');
  console.log('       "exotelConfig": {');
  console.log('         "url": "wss://your-exotel-endpoint.com/stream",');
  console.log('         "customParameters": {');
  console.log('           "campaign": "customer_support"');
  console.log('         }');
  console.log('       }');
  console.log('     }\'');
  console.log('');
  console.log('2. Monitor call status:');
  console.log('   curl http://localhost:3000/bridge/{callId}/status');
  console.log('');
  console.log('3. End call:');
  console.log('   curl -X POST http://localhost:3000/bridge/{callId}/end');
}

async function checkConfig() {
  console.log('⚙️  Configuration Check');
  console.log('=======================');
  
  const requiredEnvVars = [
    'VAPI_API_KEY',
    'EXOTEL_API_KEY', 
    'EXOTEL_SID'
  ];
  
  let allConfigured = true;
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (!value || value.includes('your_')) {
      console.log(`❌ ${envVar}: Not configured`);
      allConfigured = false;
    } else {
      const maskedValue = value.substring(0, 8) + '...';
      console.log(`✅ ${envVar}: ${maskedValue}`);
    }
  });
  
  const optionalEnvVars = ['PORT', 'HOST', 'MAX_CONCURRENT_CALLS'];
  console.log('\nOptional configuration:');
  optionalEnvVars.forEach(envVar => {
    const value = process.env[envVar] || 'default';
    console.log(`   ${envVar}: ${value}`);
  });
  
  if (allConfigured) {
    console.log('\n✅ All required configuration is set');
  } else {
    console.log('\n⚠️  Some configuration is missing. Edit your .env file.');
  }
}

async function startServer() {
  try {
    console.log('🚀 Starting Vapi-Exotel Bridge Server...');
    
    const server = new VapiExotelSerializerServer({
      port: parseInt(process.env.PORT) || 3000,
      host: process.env.HOST || '0.0.0.0'
    });
    
    await server.start();
    
    console.log(`✅ Server running on ${server.options.host}:${server.options.port}`);
    console.log(`🌐 WebSocket endpoint: ws://${server.options.host}:${server.options.port}`);
    console.log('📊 Health check: http://localhost:3000/health');
    console.log('\nPress Ctrl+C to stop the server');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping server...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

async function runTests() {
  try {
    console.log('🧪 Running Bridge Tests...\n');
    const { runTests } = await import('../test/test-bridge.js');
    await runTests();
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
    process.exit(1);
  }
}

async function checkHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    const health = await response.json();
    
    console.log('🏥 Server Health Check');
    console.log('=====================');
    console.log(`Status: ${health.status}`);
    console.log(`Timestamp: ${health.timestamp}`);
    console.log(`Active bridges: ${health.activeBridges}`);
    console.log('Statistics:', health.stats);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('💡 Make sure the server is running: npm start');
    process.exit(1);
  }
}

async function listBridges() {
  try {
    const response = await fetch('http://localhost:3000/bridges');
    const data = await response.json();
    
    console.log('📋 Active Bridges');
    console.log('==================');
    console.log(`Total bridges: ${data.activeBridges}`);
    
    if (data.bridges.length === 0) {
      console.log('No active bridges');
    } else {
      console.log('\nActive bridges:');
      data.bridges.forEach((bridge, index) => {
        console.log(`\n${index + 1}. Call ID: ${bridge.callId}`);
        console.log(`   Status: ${bridge.status.bridgeActive ? '🟢 Active' : '🔴 Inactive'}`);
        console.log(`   Vapi: ${bridge.status.vapiConnected ? '✅ Connected' : '❌ Disconnected'}`);
        console.log(`   Exotel: ${bridge.status.exotelConnected ? '✅ Connected' : '❌ Disconnected'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to list bridges:', error.message);
    process.exit(1);
  }
}

// Command router
async function main() {
  switch (command) {
    case 'start-server':
      await startServer();
      break;
      
    case 'test':
      await runTests();
      break;
      
    case 'health':
      await checkHealth();
      break;
      
    case 'list-bridges':
      await listBridges();
      break;
      
    case 'check-config':
      await checkConfig();
      break;
      
    case 'example':
      showExamples();
      break;
      
    case 'help':
    case undefined:
      showHelp();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('❌ CLI error:', error.message);
  process.exit(1);
}); 