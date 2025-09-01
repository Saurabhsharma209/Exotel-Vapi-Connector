/**
 * Validation utilities for FQDN resolver
 * Provides domain name validation and other input validation functions
 */

import validator from 'validator';
import { config } from '../../config/config.js';

/**
 * Validate a fully qualified domain name
 * @param {string} domain - Domain name to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid domain
 */
export function validateDomain(domain, options = {}) {
  const opts = {
    allowWildcard: config.domains.validation.allowWildcard,
    allowInternational: config.domains.validation.allowInternational,
    minLength: config.domains.validation.minLength,
    maxLength: config.domains.validation.maxLength,
    ...options
  };
  
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  
  // Check length constraints
  if (domain.length < opts.minLength || domain.length > opts.maxLength) {
    return false;
  }
  
  // Handle wildcard domains
  if (domain.includes('*')) {
    if (!opts.allowWildcard) {
      return false;
    }
    return validateWildcardDomain(domain, opts);
  }
  
  // Use validator library for basic domain validation
  if (!validator.isFQDN(domain, {
    require_tld: true,
    allow_underscores: false,
    allow_trailing_dot: false
  })) {
    return false;
  }
  
  // Additional custom validation rules
  return validateDomainRules(domain, opts);
}

/**
 * Validate wildcard domain patterns
 * @param {string} domain - Wildcard domain pattern
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid wildcard pattern
 */
export function validateWildcardDomain(domain, options = {}) {
  // Basic wildcard validation
  if (domain === '*') {
    return true; // Global wildcard
  }
  
  // Count asterisks
  const asteriskCount = (domain.match(/\*/g) || []).length;
  if (asteriskCount > 1) {
    return false; // Multiple wildcards not supported
  }
  
  // Validate wildcard position
  if (domain.startsWith('*.')) {
    // *.example.com pattern
    const baseDomain = domain.substring(2);
    return validateDomain(baseDomain, { ...options, allowWildcard: false });
  }
  
  if (domain.includes('.*.')) {
    // sub.*.example.com pattern
    const parts = domain.split('.*.');
    if (parts.length !== 2) {
      return false;
    }
    
    const [prefix, suffix] = parts;
    return validateDomainPart(prefix) && validateDomain(suffix, { ...options, allowWildcard: false });
  }
  
  return false;
}

/**
 * Validate domain against custom rules
 * @param {string} domain - Domain name
 * @param {Object} options - Validation options
 * @returns {boolean} True if passes all rules
 */
function validateDomainRules(domain, options) {
  // Check for reserved domains
  const reservedDomains = [
    'localhost',
    'example.com',
    'test',
    'invalid',
    'local'
  ];
  
  if (reservedDomains.some(reserved => domain.endsWith(reserved))) {
    return false;
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/, // IP addresses
    /^[a-f0-9]{32,}$/, // Long hex strings
    /\.(exe|bat|cmd|scr|com|pif)$/i, // Executable extensions
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(domain))) {
    return false;
  }
  
  // International domain name validation
  if (!options.allowInternational && /[^\x00-\x7F]/.test(domain)) {
    return false;
  }
  
  return true;
}

/**
 * Validate a single domain part (label)
 * @param {string} part - Domain part to validate
 * @returns {boolean} True if valid
 */
function validateDomainPart(part) {
  if (!part || part.length === 0 || part.length > 63) {
    return false;
  }
  
  // Cannot start or end with hyphen
  if (part.startsWith('-') || part.endsWith('-')) {
    return false;
  }
  
  // Must contain only alphanumeric characters and hyphens
  return /^[a-zA-Z0-9-]+$/.test(part);
}

/**
 * Validate Vapi assistant ID format
 * @param {string} assistantId - Assistant ID to validate
 * @returns {boolean} True if valid format
 */
export function validateAssistantId(assistantId) {
  if (!assistantId || typeof assistantId !== 'string') {
    return false;
  }
  
  // Vapi assistant IDs are typically UUIDs or have specific prefixes
  const patterns = [
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID format
    /^asst_[a-zA-Z0-9]+$/, // Assistant prefix format
    /^[a-zA-Z0-9_-]{10,50}$/ // General alphanumeric format
  ];
  
  return patterns.some(pattern => pattern.test(assistantId));
}

/**
 * Validate Vapi phone number ID format
 * @param {string} phoneNumberId - Phone number ID to validate
 * @returns {boolean} True if valid format
 */
export function validatePhoneNumberId(phoneNumberId) {
  if (!phoneNumberId || typeof phoneNumberId !== 'string') {
    return false;
  }
  
  // Vapi phone number IDs follow similar patterns
  const patterns = [
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID format
    /^pn_[a-zA-Z0-9]+$/, // Phone number prefix format
    /^[a-zA-Z0-9_-]{10,50}$/ // General alphanumeric format
  ];
  
  return patterns.some(pattern => pattern.test(phoneNumberId));
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  
  // Use validator library for phone number validation
  return validator.isMobilePhone(phoneNumber, 'any', { strictMode: false });
}

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  return validator.isEmail(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  return validator.isURL(url, {
    protocols: ['http', 'https', 'ws', 'wss'],
    require_protocol: true,
    allow_underscores: true
  });
}

/**
 * Validate JSON Web Token
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if valid format
 */
export function validateJWT(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  return validator.isJWT(token);
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Common API key patterns
  const patterns = [
    /^[a-f0-9]{32,}$/i, // Hex string (32+ chars)
    /^[A-Za-z0-9_-]{20,}$/, // Base64-like (20+ chars)
    /^sk-[a-zA-Z0-9]{32,}$/, // OpenAI style
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i // UUID
  ];
  
  return patterns.some(pattern => pattern.test(apiKey));
}

/**
 * Validate priority value
 * @param {*} priority - Priority value to validate
 * @returns {boolean} True if valid
 */
export function validatePriority(priority) {
  if (priority === null || priority === undefined) {
    return true; // Allow null/undefined for default
  }
  
  const num = Number(priority);
  return Number.isInteger(num) && num >= 0 && num <= 100;
}

/**
 * Validate TTL (Time To Live) value
 * @param {*} ttl - TTL value to validate
 * @returns {boolean} True if valid
 */
export function validateTTL(ttl) {
  if (ttl === null || ttl === undefined) {
    return true; // Allow null/undefined for default
  }
  
  const num = Number(ttl);
  return Number.isInteger(num) && num >= 0 && num <= 86400; // Max 24 hours
}

/**
 * Validate domain metadata object
 * @param {*} metadata - Metadata object to validate
 * @returns {boolean} True if valid
 */
export function validateMetadata(metadata) {
  if (metadata === null || metadata === undefined) {
    return true;
  }
  
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  
  // Check for reasonable size
  const jsonString = JSON.stringify(metadata);
  if (jsonString.length > 10000) { // 10KB limit
    return false;
  }
  
  return true;
}

/**
 * Sanitize domain name for safe storage/usage
 * @param {string} domain - Domain to sanitize
 * @returns {string} Sanitized domain
 */
export function sanitizeDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return '';
  }
  
  return domain
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.-*]/g, '') // Remove invalid characters
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
}

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  const opts = {
    maxLength: 1000,
    allowHtml: false,
    allowNewlines: true,
    ...options
  };
  
  let sanitized = input.trim();
  
  // Remove HTML if not allowed
  if (!opts.allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  // Remove newlines if not allowed
  if (!opts.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }
  
  // Truncate if too long
  if (sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }
  
  return sanitized;
}

/**
 * Create validation result object
 * @param {boolean} isValid - Whether validation passed
 * @param {string} message - Validation message
 * @param {Object} details - Additional details
 * @returns {Object} Validation result
 */
export function validationResult(isValid, message = '', details = {}) {
  return {
    isValid,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate domain registration request
 * @param {Object} request - Domain registration request
 * @returns {Object} Validation result
 */
export function validateDomainRegistration(request) {
  if (!request || typeof request !== 'object') {
    return validationResult(false, 'Invalid request format');
  }
  
  const { domain, assistantId, phoneNumberId, priority, metadata, enabled } = request;
  
  // Validate required fields
  if (!domain) {
    return validationResult(false, 'Domain is required');
  }
  
  if (!assistantId) {
    return validationResult(false, 'Assistant ID is required');
  }
  
  // Validate field formats
  if (!validateDomain(domain)) {
    return validationResult(false, 'Invalid domain format', { domain });
  }
  
  if (!validateAssistantId(assistantId)) {
    return validationResult(false, 'Invalid assistant ID format', { assistantId });
  }
  
  if (phoneNumberId && !validatePhoneNumberId(phoneNumberId)) {
    return validationResult(false, 'Invalid phone number ID format', { phoneNumberId });
  }
  
  if (priority !== undefined && !validatePriority(priority)) {
    return validationResult(false, 'Invalid priority value', { priority });
  }
  
  if (metadata !== undefined && !validateMetadata(metadata)) {
    return validationResult(false, 'Invalid metadata format');
  }
  
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return validationResult(false, 'Invalid enabled value', { enabled });
  }
  
  return validationResult(true, 'Validation passed');
}

export default {
  validateDomain,
  validateWildcardDomain,
  validateAssistantId,
  validatePhoneNumberId,
  validatePhoneNumber,
  validateEmail,
  validateUrl,
  validateJWT,
  validateApiKey,
  validatePriority,
  validateTTL,
  validateMetadata,
  sanitizeDomain,
  sanitizeString,
  validationResult,
  validateDomainRegistration
}; 