/**
 * FQDN Resolver - Core domain-to-assistant resolution engine
 * Handles DNS-style resolution with caching and validation
 */

import { logger } from '../utils/logger.js';
import { validateDomain } from '../utils/validation.js';

export class FQDNResolver {
  constructor(domainRegistry, options = {}) {
    this.domainRegistry = domainRegistry;
    this.options = {
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxCacheEntries: 10000,
      enableWildcard: true,
      defaultPriority: 10,
      ...options
    };
    
    // In-memory cache for fast resolution
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    
    // Resolution statistics
    this.stats = {
      totalResolves: 0,
      successfulResolves: 0,
      failedResolves: 0,
      cacheHitRate: 0,
      averageResolveTime: 0
    };
    
    // Wildcard cache for efficient wildcard matching
    this.wildcardCache = new Map();
    
    // Cleanup interval for expired cache entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Every minute
    
    logger.info('FQDN Resolver initialized', {
      cacheEnabled: this.options.cacheEnabled,
      cacheTTL: this.options.cacheTTL,
      maxCacheEntries: this.options.maxCacheEntries
    });
  }
  
  /**
   * Resolve a domain to assistant configuration
   * @param {string} domain - Domain name to resolve
   * @param {Object} context - Optional resolution context
   * @returns {Promise<Object|null>} Assistant configuration or null if not found
   */
  async resolve(domain, context = {}) {
    const startTime = Date.now();
    this.stats.totalResolves++;
    
    try {
      logger.debug(`Resolving domain: ${domain}`, { context });
      
      // Validate domain format
      if (!this.validateDomainFormat(domain)) {
        logger.warn(`Invalid domain format: ${domain}`);
        this.stats.failedResolves++;
        return null;
      }
      
      // Normalize domain
      const normalizedDomain = this.normalizeDomain(domain);
      
      // Try cache first
      if (this.options.cacheEnabled) {
        const cached = this.getCachedResolution(normalizedDomain);
        if (cached) {
          this.cacheStats.hits++;
          this.updateStats(startTime, true);
          logger.debug(`Cache hit for domain: ${normalizedDomain}`, { cached });
          return cached;
        }
        this.cacheStats.misses++;
      }
      
      // Resolve from database
      let resolution = await this.resolveFromDatabase(normalizedDomain, context);
      
      // Try wildcard resolution if direct resolution failed
      if (!resolution && this.options.enableWildcard) {
        resolution = await this.resolveWildcard(normalizedDomain, context);
      }
      
      // Cache the result (including negative cache for failures)
      if (this.options.cacheEnabled) {
        this.setCachedResolution(normalizedDomain, resolution);
      }
      
      if (resolution) {
        this.stats.successfulResolves++;
        logger.info(`Successfully resolved domain: ${normalizedDomain}`, {
          assistantId: resolution.assistantId,
          resolveTime: Date.now() - startTime
        });
      } else {
        this.stats.failedResolves++;
        logger.debug(`Failed to resolve domain: ${normalizedDomain}`);
      }
      
      this.updateStats(startTime, !!resolution);
      return resolution;
      
    } catch (error) {
      this.stats.failedResolves++;
      this.updateStats(startTime, false);
      logger.error(`Error resolving domain ${domain}:`, error);
      return null;
    }
  }
  
  /**
   * Resolve multiple domains in batch
   * @param {string[]} domains - Array of domain names
   * @param {Object} context - Optional resolution context
   * @returns {Promise<Object>} Map of domain -> resolution result
   */
  async resolveBatch(domains, context = {}) {
    logger.debug(`Batch resolving ${domains.length} domains`);
    
    const results = {};
    const startTime = Date.now();
    
    // Process domains in parallel
    const promises = domains.map(async (domain) => {
      const resolution = await this.resolve(domain, context);
      results[domain] = resolution;
    });
    
    await Promise.all(promises);
    
    logger.info(`Batch resolution completed`, {
      count: domains.length,
      successful: Object.values(results).filter(Boolean).length,
      duration: Date.now() - startTime
    });
    
    return results;
  }
  
  /**
   * Resolve from database
   * @param {string} domain - Normalized domain name
   * @param {Object} context - Resolution context
   * @returns {Promise<Object|null>} Resolution result
   */
  async resolveFromDatabase(domain, context) {
    try {
      const domainRecord = await this.domainRegistry.findByDomain(domain);
      
      if (!domainRecord || !domainRecord.enabled) {
        return null;
      }
      
      // Check context-based filtering if provided
      if (context.region && domainRecord.metadata?.regions) {
        if (!domainRecord.metadata.regions.includes(context.region)) {
          logger.debug(`Domain ${domain} not available in region ${context.region}`);
          return null;
        }
      }
      
      if (context.language && domainRecord.metadata?.languages) {
        if (!domainRecord.metadata.languages.includes(context.language)) {
          logger.debug(`Domain ${domain} not available in language ${context.language}`);
          return null;
        }
      }
      
      // Return resolved configuration
      return {
        domain: domain,
        assistantId: domainRecord.assistantId,
        phoneNumberId: domainRecord.phoneNumberId,
        priority: domainRecord.priority || this.options.defaultPriority,
        metadata: domainRecord.metadata || {},
        resolvedAt: new Date().toISOString(),
        resolvedVia: 'direct',
        ttl: domainRecord.ttl || this.options.cacheTTL
      };
      
    } catch (error) {
      logger.error(`Database resolution error for ${domain}:`, error);
      return null;
    }
  }
  
  /**
   * Resolve using wildcard patterns
   * @param {string} domain - Domain to resolve
   * @param {Object} context - Resolution context
   * @returns {Promise<Object|null>} Resolution result
   */
  async resolveWildcard(domain, context) {
    try {
      // Check cache first for wildcard patterns
      const wildcardPattern = this.findWildcardPattern(domain);
      if (wildcardPattern) {
        const cached = this.wildcardCache.get(wildcardPattern);
        if (cached && !this.isCacheExpired(cached)) {
          logger.debug(`Wildcard cache hit: ${domain} -> ${wildcardPattern}`);
          return {
            ...cached.data,
            domain: domain,
            resolvedVia: 'wildcard-cache',
            wildcardPattern: wildcardPattern
          };
        }
      }
      
      // Query database for wildcard patterns
      const wildcardDomains = await this.domainRegistry.findWildcardMatches(domain);
      
      if (wildcardDomains.length === 0) {
        return null;
      }
      
      // Sort by priority and specificity
      wildcardDomains.sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) {
          return (b.priority || 0) - (a.priority || 0);
        }
        // More specific patterns first
        return b.domain.length - a.domain.length;
      });
      
      const matchedDomain = wildcardDomains[0];
      
      if (!matchedDomain.enabled) {
        return null;
      }
      
      // Cache the wildcard resolution
      const resolution = {
        domain: domain,
        assistantId: matchedDomain.assistantId,
        phoneNumberId: matchedDomain.phoneNumberId,
        priority: matchedDomain.priority || this.options.defaultPriority,
        metadata: matchedDomain.metadata || {},
        resolvedAt: new Date().toISOString(),
        resolvedVia: 'wildcard',
        wildcardPattern: matchedDomain.domain,
        ttl: matchedDomain.ttl || this.options.cacheTTL
      };
      
      // Cache the wildcard pattern for future use
      this.wildcardCache.set(matchedDomain.domain, {
        data: resolution,
        timestamp: Date.now(),
        ttl: resolution.ttl
      });
      
      logger.debug(`Wildcard resolution: ${domain} -> ${matchedDomain.domain}`);
      
      return resolution;
      
    } catch (error) {
      logger.error(`Wildcard resolution error for ${domain}:`, error);
      return null;
    }
  }
  
  /**
   * Find matching wildcard pattern for a domain
   * @param {string} domain - Domain to match
   * @returns {string|null} Matching wildcard pattern
   */
  findWildcardPattern(domain) {
    const parts = domain.split('.');
    
    // Try different wildcard patterns
    const patterns = [
      `*.${parts.slice(1).join('.')}`, // *.example.com
      `${parts[0]}.*.${parts.slice(2).join('.')}`, // sub.*.com
      '*', // Match all
    ];
    
    for (const pattern of patterns) {
      if (this.wildcardCache.has(pattern)) {
        const cached = this.wildcardCache.get(pattern);
        if (!this.isCacheExpired(cached)) {
          return pattern;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate domain format
   * @param {string} domain - Domain to validate
   * @returns {boolean} True if valid
   */
  validateDomainFormat(domain) {
    if (!domain || typeof domain !== 'string') {
      return false;
    }
    
    // Use the validation utility
    return validateDomain(domain);
  }
  
  /**
   * Normalize domain name
   * @param {string} domain - Raw domain name
   * @returns {string} Normalized domain name
   */
  normalizeDomain(domain) {
    return domain.toLowerCase().trim();
  }
  
  /**
   * Get cached resolution
   * @param {string} domain - Domain name
   * @returns {Object|null} Cached resolution or null
   */
  getCachedResolution(domain) {
    if (!this.cache.has(domain)) {
      return null;
    }
    
    const cached = this.cache.get(domain);
    
    if (this.isCacheExpired(cached)) {
      this.cache.delete(domain);
      this.cacheStats.evictions++;
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Set cached resolution
   * @param {string} domain - Domain name
   * @param {Object} resolution - Resolution result
   */
  setCachedResolution(domain, resolution) {
    // Check cache size limit
    if (this.cache.size >= this.options.maxCacheEntries) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheStats.evictions++;
    }
    
    this.cache.set(domain, {
      data: resolution,
      timestamp: Date.now(),
      ttl: resolution?.ttl || this.options.cacheTTL
    });
  }
  
  /**
   * Check if cache entry is expired
   * @param {Object} cached - Cached entry
   * @returns {boolean} True if expired
   */
  isCacheExpired(cached) {
    return (Date.now() - cached.timestamp) > cached.ttl;
  }
  
  /**
   * Clean up expired cache entries
   */
  cleanupExpiredEntries() {
    let cleaned = 0;
    
    for (const [domain, cached] of this.cache.entries()) {
      if (this.isCacheExpired(cached)) {
        this.cache.delete(domain);
        cleaned++;
      }
    }
    
    // Clean wildcard cache
    for (const [pattern, cached] of this.wildcardCache.entries()) {
      if (this.isCacheExpired(cached)) {
        this.wildcardCache.delete(pattern);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} expired cache entries`);
      this.cacheStats.evictions += cleaned;
    }
  }
  
  /**
   * Update resolver statistics
   * @param {number} startTime - Resolution start time
   * @param {boolean} success - Whether resolution was successful
   */
  updateStats(startTime, success) {
    const resolveTime = Date.now() - startTime;
    
    // Update average resolve time using exponential moving average
    this.stats.averageResolveTime = this.stats.averageResolveTime * 0.9 + resolveTime * 0.1;
    
    // Update cache hit rate
    const totalCacheRequests = this.cacheStats.hits + this.cacheStats.misses;
    if (totalCacheRequests > 0) {
      this.stats.cacheHitRate = (this.cacheStats.hits / totalCacheRequests) * 100;
    }
  }
  
  /**
   * Clear all caches
   */
  clearCache() {
    const clearedEntries = this.cache.size + this.wildcardCache.size;
    this.cache.clear();
    this.wildcardCache.clear();
    
    logger.info(`Cleared ${clearedEntries} cache entries`);
  }
  
  /**
   * Get resolver statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      ...this.stats,
      cache: {
        ...this.cacheStats,
        currentEntries: this.cache.size,
        maxEntries: this.options.maxCacheEntries,
        hitRate: this.stats.cacheHitRate
      },
      wildcardCache: {
        currentEntries: this.wildcardCache.size
      }
    };
  }
  
  /**
   * Test connectivity and performance
   * @returns {Promise<Object>} Test results
   */
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      await this.domainRegistry.healthCheck();
      
      // Test resolution performance with a known domain
      const testDomain = 'test.health.check';
      await this.resolve(testDomain);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: responseTime,
        cache: {
          enabled: this.options.cacheEnabled,
          entries: this.cache.size,
          hitRate: this.stats.cacheHitRate
        },
        stats: this.getStats(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Health check failed:', error);
      
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.clearCache();
    logger.info('FQDN Resolver destroyed');
  }
}

export default FQDNResolver; 