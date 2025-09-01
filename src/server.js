#!/usr/bin/env node

/**
 * VAPI FQDN RESOLVER - Main Server
 * Domain-based routing system for Vapi voice assistants
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Import core modules
import { DNSServer } from './dns/DNSServer.js';
import { DomainRegistry } from './core/DomainRegistry.js';
import { FQDNResolver } from './core/FQDNResolver.js';
import { VapiConnector } from './core/VapiConnector.js';
import { AnalyticsEngine } from './core/AnalyticsEngine.js';
import { setupAPIRoutes } from './api/routes.js';
import { setupWebhookRoutes } from './api/webhooks.js';
import { setupDashboardRoutes } from './api/dashboard.js';
import { logger } from './utils/logger.js';
import { config } from '../config/config.js';
import { Database } from './database/Database.js';

/**
 * FQDN Resolver Server
 * Main application class that orchestrates all components
 */
export class FQDNResolverServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.dnsServer = null;
    
    // Core components
    this.database = null;
    this.domainRegistry = null;
    this.resolver = null;
    this.vapiConnector = null;
    this.analytics = null;
    
    // State
    this.isInitialized = false;
    this.activeConnections = new Map();
    this.startTime = Date.now();
    
    this.setupExitHandlers();
  }
  
  /**
   * Initialize all components
   */
  async initialize() {
    if (this.isInitialized) return;
    
    logger.info('🚀 Initializing Vapi FQDN Resolver...');
    
    try {
      // Initialize database
      this.database = new Database(config.database.url);
      await this.database.initialize();
      
      // Initialize core components
      this.domainRegistry = new DomainRegistry(this.database);
      this.resolver = new FQDNResolver(this.domainRegistry);
      this.vapiConnector = new VapiConnector(config.vapi);
      this.analytics = new AnalyticsEngine(this.database);
      
      // Initialize DNS server if enabled
      if (config.dns.enabled) {
        this.dnsServer = new DNSServer(this.resolver, config.dns);
      }
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      this.isInitialized = true;
      logger.info('✅ FQDN Resolver initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize FQDN Resolver:', error);
      throw error;
    }
  }
  
  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    // CORS
    this.app.use(cors({
      origin: config.cors.origins || ['http://localhost:3000'],
      credentials: true,
    }));
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Static files
    this.app.use('/static', express.static(path.join(process.cwd(), 'public')));
    
    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
    
    // Health check (before auth)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        domains: this.domainRegistry ? this.domainRegistry.count() : 0,
        activeConnections: this.activeConnections.size,
        memory: process.memoryUsage(),
        dns: {
          enabled: config.dns.enabled,
          port: config.dns.port
        }
      });
    });
  }
  
  /**
   * Setup API routes
   */
  setupRoutes() {
    // API routes
    setupAPIRoutes(this.app, {
      resolver: this.resolver,
      domainRegistry: this.domainRegistry,
      vapiConnector: this.vapiConnector,
      analytics: this.analytics
    });
    
    // Webhook routes
    setupWebhookRoutes(this.app, {
      resolver: this.resolver,
      analytics: this.analytics
    });
    
    // Dashboard routes
    setupDashboardRoutes(this.app, {
      resolver: this.resolver,
      domainRegistry: this.domainRegistry,
      analytics: this.analytics
    });
    
    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Vapi FQDN Resolver',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Domain-based routing system for Vapi voice assistants',
        endpoints: {
          health: '/health',
          api: '/api',
          dns: config.dns.enabled ? `localhost:${config.dns.port}` : 'disabled',
          dashboard: '/dashboard',
          webhooks: '/webhooks'
        },
        docs: 'https://github.com/yourusername/vapi-fqdn-resolver#readme'
      });
    });
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Path ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
    
    // Error handler
    this.app.use((error, req, res, next) => {
      logger.error('Express error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Setup WebSocket server for real-time updates
   */
  setupWebSocket() {
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });
    
    this.wss.on('connection', (ws, req) => {
      const connectionId = `ws_${Date.now()}_${Math.random()}`;
      this.activeConnections.set(connectionId, ws);
      
      logger.info(`WebSocket connected: ${connectionId}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId: connectionId,
        timestamp: new Date().toISOString(),
        server: {
          name: 'Vapi FQDN Resolver',
          version: process.env.npm_package_version || '1.0.0'
        }
      }));
      
      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message);
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      // Handle disconnect
      ws.on('close', () => {
        this.activeConnections.delete(connectionId);
        logger.info(`WebSocket disconnected: ${connectionId}`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for ${connectionId}:`, error);
        this.activeConnections.delete(connectionId);
      });
    });
    
    logger.info('✅ WebSocket server initialized');
  }
  
  /**
   * Handle WebSocket messages
   */
  async handleWebSocketMessage(ws, message) {
    const { type, data } = message;
    
    switch (type) {
      case 'subscribe':
        // Subscribe to domain events
        if (data.domain) {
          ws.subscribedDomain = data.domain;
          ws.send(JSON.stringify({
            type: 'subscribed',
            domain: data.domain,
            timestamp: new Date().toISOString()
          }));
        }
        break;
        
      case 'resolve':
        // Resolve domain in real-time
        if (data.domain) {
          const result = await this.resolver.resolve(data.domain);
          ws.send(JSON.stringify({
            type: 'resolution',
            domain: data.domain,
            result: result,
            timestamp: new Date().toISOString()
          }));
        }
        break;
        
      case 'stats':
        // Send statistics
        const stats = await this.analytics.getStats();
        ws.send(JSON.stringify({
          type: 'stats',
          data: stats,
          timestamp: new Date().toISOString()
        }));
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${type}`,
          timestamp: new Date().toISOString()
        }));
    }
  }
  
  /**
   * Broadcast message to all connected WebSocket clients
   */
  broadcast(message) {
    if (!this.wss) return;
    
    const data = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    });
  }
  
  /**
   * Start the server
   */
  async start() {
    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Create HTTP server
      this.server = createServer(this.app);
      
      // Setup WebSocket server
      this.setupWebSocket();
      
      // Start HTTP server
      const port = config.server.port || 3000;
      const host = config.server.host || '0.0.0.0';
      
      this.server.listen(port, host, () => {
        logger.info(`\n🌟 VAPI FQDN RESOLVER STARTED`);
        logger.info(`${'='.repeat(50)}`);
        logger.info(`🔗 HTTP Server: http://${host}:${port}`);
        logger.info(`🔌 WebSocket: ws://${host}:${port}/ws`);
        logger.info(`🔍 DNS Server: ${config.dns.enabled ? `localhost:${config.dns.port}` : 'disabled'}`);
        logger.info(`📊 Dashboard: http://${host}:${port}/dashboard`);
        logger.info(`📡 API: http://${host}:${port}/api`);
        logger.info(`${'='.repeat(50)}`);
        logger.info(`🎯 Ready for domain-based voice assistant routing!`);
      });
      
      // Start DNS server if enabled
      if (this.dnsServer) {
        await this.dnsServer.start();
        logger.info(`🔍 DNS Server listening on port ${config.dns.port}`);
      }
      
      // Start background tasks
      this.startBackgroundTasks();
      
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      throw error;
    }
  }
  
  /**
   * Start background tasks
   */
  startBackgroundTasks() {
    // Analytics aggregation (every 5 minutes)
    setInterval(async () => {
      try {
        await this.analytics.aggregate();
      } catch (error) {
        logger.error('Analytics aggregation error:', error);
      }
    }, 5 * 60 * 1000);
    
    // Cleanup expired sessions (every hour)
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        logger.error('Session cleanup error:', error);
      }
    }, 60 * 60 * 1000);
    
    logger.info('✅ Background tasks started');
  }
  
  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    // Implement session cleanup logic
    logger.debug('Running session cleanup...');
  }
  
  /**
   * Stop the server gracefully
   */
  async stop() {
    logger.info('🛑 Stopping FQDN Resolver server...');
    
    try {
      // Stop DNS server
      if (this.dnsServer) {
        await this.dnsServer.stop();
        logger.info('✅ DNS server stopped');
      }
      
      // Close WebSocket connections
      if (this.wss) {
        this.wss.clients.forEach((client) => {
          client.close();
        });
        this.wss.close();
        logger.info('✅ WebSocket server stopped');
      }
      
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('✅ HTTP server stopped');
      }
      
      // Close database
      if (this.database) {
        await this.database.close();
        logger.info('✅ Database closed');
      }
      
      logger.info('🏁 FQDN Resolver server stopped gracefully');
      
    } catch (error) {
      logger.error('❌ Error stopping server:', error);
    }
  }
  
  /**
   * Setup graceful shutdown handlers
   */
  setupExitHandlers() {
    const gracefulShutdown = (signal) => {
      logger.info(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
      this.stop().then(() => {
        process.exit(0);
      }).catch((error) => {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.stop().then(() => process.exit(1));
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new FQDNResolverServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default FQDNResolverServer; 