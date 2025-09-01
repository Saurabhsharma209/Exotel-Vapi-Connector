/**
 * Logger utility using Winston
 * Provides structured logging with multiple transports and formats
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { config } from '../../config/config.js';

// Ensure log directory exists
if (config.logging.file.enabled) {
  const logDir = config.logging.file.path;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let output = `${timestamp} ${level.toUpperCase()}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Filter out common Winston fields
      const filteredMeta = { ...meta };
      delete filteredMeta.timestamp;
      delete filteredMeta.level;
      delete filteredMeta.message;
      delete filteredMeta.splat;
      
      if (Object.keys(filteredMeta).length > 0) {
        output += ` ${JSON.stringify(filteredMeta)}`;
      }
    }
    
    return output;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport
if (config.logging.console.enabled) {
  transports.push(
    new winston.transports.Console({
      format: config.logging.console.colorize 
        ? winston.format.combine(winston.format.colorize(), consoleFormat)
        : consoleFormat,
      level: config.logging.level
    })
  );
}

// File transports
if (config.logging.file.enabled) {
  // Main log file with rotation
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.logging.file.path, config.logging.file.filename),
      datePattern: config.logging.file.datePattern,
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: fileFormat,
      level: config.logging.level,
      auditFile: path.join(config.logging.file.path, '.audit.json')
    })
  );
}

// Error file transport
if (config.logging.error.enabled) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.logging.file.path, config.logging.error.filename),
      datePattern: config.logging.file.datePattern,
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: fileFormat,
      level: 'error',
      auditFile: path.join(config.logging.file.path, '.audit-error.json')
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: {
    service: 'vapi-fqdn-resolver',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env
  },
  transports,
  exitOnError: false
});

// Add request logging middleware helper
logger.requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Capture response details
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const contentLength = Buffer.byteLength(data || '', 'utf8');
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: `${contentLength}B`,
      requestId: req.id
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

// Add performance timing helper
logger.time = (label) => {
  const startTime = process.hrtime.bigint();
  
  return {
    end: (message = '', metadata = {}) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      logger.info(message || `Timer: ${label}`, {
        ...metadata,
        timer: label,
        duration: `${duration.toFixed(2)}ms`
      });
      
      return duration;
    }
  };
};

// Add database query logging helper
logger.query = (sql, params = [], duration = 0) => {
  const queryLogger = logger.child({ component: 'database' });
  
  queryLogger.debug('Database Query', {
    sql: sql.replace(/\s+/g, ' ').trim(),
    params: params,
    duration: `${duration}ms`
  });
};

// Add API call logging helper
logger.apiCall = (method, url, responseCode, duration, metadata = {}) => {
  const apiLogger = logger.child({ component: 'api' });
  
  const level = responseCode >= 400 ? 'warn' : 'info';
  
  apiLogger[level]('API Call', {
    method,
    url,
    responseCode,
    duration: `${duration}ms`,
    ...metadata
  });
};

// Add security event logging
logger.security = (event, details = {}) => {
  const securityLogger = logger.child({ component: 'security' });
  
  securityLogger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Add business logic logging
logger.business = (event, details = {}) => {
  const businessLogger = logger.child({ component: 'business' });
  
  businessLogger.info('Business Event', {
    event,
    ...details
  });
};

// Add domain resolution logging
logger.resolution = (domain, result, duration, metadata = {}) => {
  const resolutionLogger = logger.child({ component: 'resolver' });
  
  const level = result ? 'info' : 'warn';
  const message = result ? 'Domain Resolved' : 'Domain Resolution Failed';
  
  resolutionLogger[level](message, {
    domain,
    result: result ? 'success' : 'failed',
    assistantId: result?.assistantId,
    resolvedVia: result?.resolvedVia,
    duration: `${duration}ms`,
    ...metadata
  });
};

// Add DNS query logging
logger.dns = (query, response, duration) => {
  const dnsLogger = logger.child({ component: 'dns' });
  
  dnsLogger.info('DNS Query', {
    query: {
      name: query.name,
      type: query.type,
      class: query.class
    },
    response: {
      answers: response.answers?.length || 0,
      authority: response.authority?.length || 0,
      additional: response.additional?.length || 0,
      rcode: response.rcode
    },
    duration: `${duration}ms`
  });
};

// Add webhook logging
logger.webhook = (event, payload, response, duration) => {
  const webhookLogger = logger.child({ component: 'webhook' });
  
  const level = response.success ? 'info' : 'warn';
  
  webhookLogger[level]('Webhook Event', {
    event,
    payloadSize: JSON.stringify(payload).length,
    responseCode: response.statusCode,
    success: response.success,
    duration: `${duration}ms`,
    url: response.url
  });
};

// Add analytics logging
logger.analytics = (metric, value, metadata = {}) => {
  const analyticsLogger = logger.child({ component: 'analytics' });
  
  analyticsLogger.info('Analytics Metric', {
    metric,
    value,
    ...metadata
  });
};

// Error handling for logger itself
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Add log level helpers
logger.isDebugEnabled = () => logger.isLevelEnabled('debug');
logger.isInfoEnabled = () => logger.isLevelEnabled('info');
logger.isWarnEnabled = () => logger.isLevelEnabled('warn');
logger.isErrorEnabled = () => logger.isLevelEnabled('error');

// Add context helpers
logger.withContext = (context) => {
  return logger.child(context);
};

logger.withRequestId = (requestId) => {
  return logger.child({ requestId });
};

logger.withUser = (userId, userInfo = {}) => {
  return logger.child({
    userId,
    ...userInfo
  });
};

// Add sampling for high-volume logs
logger.sample = (probability = 0.1) => {
  if (Math.random() > probability) {
    // Return a no-op logger for sampled out logs
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (...args) => logger.error(...args), // Always log errors
      log: () => {}
    };
  }
  return logger;
};

// Export logger and utilities
export { logger };
export default logger; 