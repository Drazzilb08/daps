/**
 * DAPS API Core Module - Caching, Error Handling, and Request Management
 * 
 * Provides centralized API communication with:
 * - Intelligent caching with TTL
 * - Comprehensive error handling
 * - Request deduplication
 * - Response standardization
 * - Toast notification integration
 */

const API_BASE = '/api';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Cache entry structure for request deduplication and TTL management
 */
class CacheEntry {
  constructor(data, ttl = CACHE_TTL) {
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
  }

  /**
   * Check if cache entry is still valid
   * @returns {boolean} True if entry is still fresh
   */
  isValid() {
    return Date.now() - this.timestamp < this.ttl;
  }
}

/**
 * In-flight request tracker to prevent duplicate requests
 */
class RequestTracker {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Get existing request promise or create new one
   * @param {string} key - Request identifier
   * @param {Function} requestFn - Function that returns a promise
   * @returns {Promise} Request promise
   */
  getOrCreate(key, requestFn) {
    if (this.requests.has(key)) {
      return this.requests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.requests.delete(key);
    });

    this.requests.set(key, promise);
    return promise;
  }
}

/**
 * API Error class for consistent error handling
 */
class APIError extends Error {
  constructor(message, status, data = null, url = '') {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
    this.url = url;
  }

  /**
   * Check if error is client-side (4xx)
   * @returns {boolean} True if client error
   */
  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is server-side (5xx)
   * @returns {boolean} True if server error
   */
  isServerError() {
    return this.status >= 500;
  }

  /**
   * Check if error should be retried
   * @returns {boolean} True if retry is appropriate
   */
  isRetryable() {
    return this.isServerError() || this.status === 429 || this.status === 408;
  }
}

/**
 * Core API client with caching, error handling, and request management
 */
const apiCore = {
  cache: new Map(),
  requestTracker: new RequestTracker(),

  /**
   * Clear cache entries (all or by pattern)
   * @param {string|RegExp} pattern - Optional pattern to match cache keys
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (pattern instanceof RegExp ? pattern.test(key) : key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  },

  /**
   * Get cache key for request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {string} Cache key
   */
  getCacheKey(url, options = {}) {
    const { body, ...cacheableOptions } = options;
    return `${url}:${JSON.stringify(cacheableOptions)}`;
  },

  /**
   * Check cache for valid entry
   * @param {string} cacheKey - Cache key to check
   * @returns {*} Cached data or null
   */
  getFromCache(cacheKey) {
    const entry = this.cache.get(cacheKey);
    if (entry && entry.isValid()) {
      return entry.data;
    }
    
    if (entry) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  },

  /**
   * Store data in cache
   * @param {string} cacheKey - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setCache(cacheKey, data, ttl = CACHE_TTL) {
    this.cache.set(cacheKey, new CacheEntry(data, ttl));
  },

  /**
   * Create AbortController with timeout
   * @param {number} timeout - Timeout in milliseconds
   * @returns {AbortController} Abort controller
   */
  createTimeoutController(timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Clean up timeout on signal
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });

    return controller;
  },

  /**
   * Make HTTP request with error handling
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<*>} Response data
   * @throws {APIError} API-specific error
   */
  async makeRequest(url, options = {}) {
    const controller = this.createTimeoutController(options.timeout);
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    
    const requestOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    };

    try {
      const response = await fetch(fullUrl, requestOptions);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { data: await response.text() };
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw new APIError(
          responseData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          responseData,
          fullUrl
        );
      }

      // Handle DAPS error format
      if (responseData && responseData.success === false) {
        throw new APIError(
          responseData.message || 'Request failed',
          response.status,
          responseData,
          fullUrl
        );
      }

      return responseData;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408, null, fullUrl);
      }

      if (error instanceof APIError) {
        throw error;
      }

      // Network or other errors
      throw new APIError(
        `Network error: ${error.message}`,
        0,
        null,
        fullUrl
      );
    }
  },

  /**
   * GET request with caching
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @param {boolean} options.useCache - Whether to use cache (default: true)
   * @param {number} options.cacheTTL - Cache TTL in milliseconds
   * @returns {Promise<*>} Response data
   */
  async get(url, options = {}) {
    const { useCache = true, cacheTTL, ...requestOptions } = options;
    const cacheKey = this.getCacheKey(url, requestOptions);

    // Check cache first
    if (useCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // Use request tracker to prevent duplicate requests
    return this.requestTracker.getOrCreate(cacheKey, async () => {
      const data = await this.makeRequest(url, {
        method: 'GET',
        ...requestOptions,
      });

      // Cache successful responses
      if (useCache && data) {
        this.setCache(cacheKey, data, cacheTTL);
      }

      return data;
    });
  },

  /**
   * POST request with cache invalidation
   * @param {string} url - Request URL
   * @param {*} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async post(url, data, options = {}) {
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });

    // Clear related cache entries
    this.clearCache(url.split('?')[0]);

    return response;
  },

  /**
   * PUT request with cache invalidation
   * @param {string} url - Request URL
   * @param {*} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async put(url, data, options = {}) {
    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });

    // Clear related cache entries
    this.clearCache(url.split('?')[0]);

    return response;
  },

  /**
   * DELETE request with cache invalidation
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async delete(url, options = {}) {
    const response = await this.makeRequest(url, {
      method: 'DELETE',
      ...options,
    });

    // Clear related cache entries
    this.clearCache(url.split('?')[0]);

    return response;
  },

  /**
   * PATCH request with cache invalidation
   * @param {string} url - Request URL
   * @param {*} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async patch(url, data, options = {}) {
    const response = await this.makeRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });

    // Clear related cache entries
    this.clearCache(url.split('?')[0]);

    return response;
  },
};

export { apiCore, APIError };