/**
 * Cloudflare Configuration for Memory Weaver Bot
 * Manages all Cloudflare-related settings and API configurations
 */

// Cloudflare API configuration
export const cloudflareConfig = {
  // Account and API settings
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  
  // Worker configuration
  worker: {
    url: process.env.CLOUDFLARE_WORKER_URL,
    timeout: parseInt(process.env.CLOUDFLARE_TIMEOUT) || 30000, // 30 seconds
    retries: parseInt(process.env.CLOUDFLARE_RETRIES) || 3,
    
    // Environment-specific worker URLs
    environments: {
      development: process.env.CLOUDFLARE_WORKER_DEV_URL,
      staging: process.env.CLOUDFLARE_WORKER_STAGING_URL,
      production: process.env.CLOUDFLARE_WORKER_URL
    }
  },

  // R2 Storage configuration
  r2: {
    bucketName: process.env.CLOUDFLARE_R2_BUCKET || 'memory-weaver-files',
    region: process.env.CLOUDFLARE_R2_REGION || 'auto',
    publicDomain: process.env.CLOUDFLARE_R2_DOMAIN,
    
    // File storage settings
    storage: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
      allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,png,pdf,mp4').split(','),
      uploadTimeout: 300000, // 5 minutes
      
      // Storage classes for different file types
      storageClasses: {
        images: 'STANDARD',
        documents: 'STANDARD',
        audio: 'STANDARD',
        video: 'INFREQUENT_ACCESS', // Cheaper for large video files
        archives: 'GLACIER'          // Cheapest for long-term storage
      }
    },

    // CDN settings
    cdn: {
      cacheControl: {
        images: 'public, max-age=31536000', // 1 year
        documents: 'public, max-age=86400', // 1 day
        other: 'public, max-age=3600'       // 1 hour
      },
      compression: true,
      webp: true // Convert images to WebP when possible
    }
  },

  // D1 Database configuration
  d1: {
    databaseId: process.env.DATABASE_ID,
    connectionString: process.env.DATABASE_URL,
    
    // Connection settings
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
    connectionTimeout: parseInt(process.env.DB_TIMEOUT) || 30000,
    
    // Query settings
    queryTimeout: 10000, // 10 seconds
    maxQuerySize: 1000000, // 1MB
    
    // Migration settings
    migrations: {
      directory: './cloudflare/migrations',
      autoRun: process.env.AUTO_RUN_MIGRATIONS === 'true'
    }
  },

  // KV Storage configuration (for sessions and caching)
  kv: {
    namespaceId: process.env.KV_NAMESPACE_ID,
    
    // TTL settings (in seconds)
    ttl: {
      uploadSessions: 24 * 60 * 60,     // 24 hours
      userCooldowns: 60 * 60,           // 1 hour
      apiCache: 5 * 60,                 // 5 minutes
      rateLimits: 60 * 60               // 1 hour
    },

    // Key prefixes for organization
    prefixes: {
      uploadSession: 'upload_session:',
      userCooldown: 'cooldown:',
      rateLimit: 'rate_limit:',
      cache: 'cache:'
    }
  },

  // Cloudflare Images configuration
  images: {
    accountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT,
    apiToken: process.env.CLOUDFLARE_IMAGES_TOKEN,
    
    // Image processing settings
    variants: {
      thumbnail: 'thumbnail',  // 150x150
      medium: 'medium',        // 800x800
      large: 'large'           // 1920x1920
    },
    
    // Auto-optimization settings
    optimization: {
      format: 'auto',          // Auto-detect best format
      quality: 85,             // Image quality (1-100)
      metadata: 'none',        // Strip metadata for privacy
      sharpen: true            // Apply sharpening
    }
  },

  // IPFS Configuration
  ipfs: {
    nodeUrl: process.env.IPFS_NODE_URL || 'http://31.220.107.113:5001/',
    timeout: parseInt(process.env.IPFS_TIMEOUT) || 60000, // 60 seconds
    retries: parseInt(process.env.IPFS_RETRIES) || 3,
    
    // Pin settings
    pin: {
      enabled: process.env.IPFS_PIN_FILES === 'true',
      recursive: true
    },
    
    // Gateway settings for retrieval
    gateway: {
      url: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/',
      timeout: 30000
    },
    
    // File upload settings
    upload: {
      wrapWithDirectory: false,
      progress: false,
      hashAlg: 'sha2-256'
    }
  },

  // Analytics and monitoring
  analytics: {
    enabled: process.env.CLOUDFLARE_ANALYTICS === 'true',
    datasetId: process.env.CLOUDFLARE_ANALYTICS_DATASET,
    
    // Custom metrics to track
    metrics: [
      'upload_requests',
      'file_processing_time',
      'storage_usage',
      'api_errors',
      'user_activity'
    ]
  },

  // Security settings
  security: {
    // WAF settings
    waf: {
      enabled: true,
      mode: 'simulate', // 'off', 'simulate', 'on'
      sensitivity: 'medium'
    },
    
    // Rate limiting
    rateLimit: {
      uploads: {
        requests: 100,
        window: 3600,        // 1 hour
        action: 'block'
      },
      api: {
        requests: 1000,
        window: 3600,        // 1 hour
        action: 'throttle'
      }
    },

    // CORS settings
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400 // 24 hours
    }
  },

  // Performance settings
  performance: {
    // Caching settings
    cache: {
      api: {
        ttl: 300,            // 5 minutes
        staleWhileRevalidate: 60
      },
      static: {
        ttl: 31536000,       // 1 year
        browser: 86400       // 1 day
      }
    },
    
    // Worker limits
    worker: {
      cpuLimit: 50,          // 50ms CPU time
      memoryLimit: 128,      // 128MB memory
      timeout: 30000         // 30 seconds
    }
  }
};

// Environment-specific configurations
export const environmentConfigs = {
  development: {
    worker: {
      timeout: 60000,        // Longer timeout for debugging
      retries: 1             // Fewer retries for faster feedback
    },
    r2: {
      bucketName: 'memory-weaver-dev',
      storage: {
        maxFileSize: 10485760 // 10MB for dev
      }
    },
    security: {
      waf: {
        mode: 'off'          // Disable WAF in development
      }
    }
  },

  staging: {
    worker: {
      timeout: 45000
    },
    r2: {
      bucketName: 'memory-weaver-staging'
    },
    security: {
      waf: {
        mode: 'simulate'     // Simulate WAF in staging
      }
    }
  },

  production: {
    worker: {
      timeout: 30000
    },
    security: {
      waf: {
        mode: 'on'           // Enable WAF in production
      },
      rateLimit: {
        uploads: {
          requests: 50,      // Stricter rate limits
          action: 'block'
        }
      }
    },
    performance: {
      cache: {
        api: {
          ttl: 600           // Longer cache in production
        }
      }
    }
  }
};

// API endpoints configuration
export const apiEndpoints = {
  // Upload operations
  upload: {
    initialize: '/api/upload/initialize',
    complete: '/api/upload/complete',
    status: '/api/upload/status',
    webhook: '/api/upload/webhook',
    cleanup: '/api/upload/cleanup'
  },

  // Memory operations
  memory: {
    create: '/api/memory/create',
    get: '/api/memory/:id',
    search: '/api/memory/search',
    server: '/api/memory/server',
    delete: '/api/memory/:id',
    stats: '/api/memory/stats'
  },

  // Health and monitoring
  health: '/api/health',
  metrics: '/api/metrics'
};

// Validation functions
export function validateCloudflareConfig() {
  const errors = [];
  const warnings = [];

  // Check required settings
  if (!cloudflareConfig.worker.url) {
    errors.push('CLOUDFLARE_WORKER_URL is required');
  }

  if (!cloudflareConfig.accountId) {
    warnings.push('CLOUDFLARE_ACCOUNT_ID not set - some features may not work');
  }

  if (!cloudflareConfig.apiToken) {
    warnings.push('CLOUDFLARE_API_TOKEN not set - API operations may fail');
  }

  // Validate R2 settings
  if (!cloudflareConfig.r2.bucketName) {
    errors.push('R2 bucket name is required');
  }

  // Validate file size limits
  const maxSize = cloudflareConfig.r2.storage.maxFileSize;
  if (maxSize > 100 * 1024 * 1024) { // 100MB
    warnings.push('Maximum file size is very large - consider reducing for better performance');
  }

  // Validate timeout settings
  if (cloudflareConfig.worker.timeout < 5000) {
    warnings.push('Worker timeout is very low - may cause request failures');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Get environment-specific configuration
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = environmentConfigs[env] || environmentConfigs.development;
  
  // Deep merge configurations
  return mergeDeep(cloudflareConfig, envConfig);
}

// Helper function for deep merging objects
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Utility functions
export function getWorkerUrl(environment = process.env.NODE_ENV) {
  const config = getEnvironmentConfig();
  return config.worker.environments[environment] || config.worker.url;
}

export function getR2BucketName(environment = process.env.NODE_ENV) {
  const envConfigs = environmentConfigs[environment];
  return envConfigs?.r2?.bucketName || cloudflareConfig.r2.bucketName;
}

export function buildApiUrl(endpoint, params = {}) {
  const baseUrl = getWorkerUrl();
  let url = endpoint;
  
  // Replace URL parameters
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  }
  
  return baseUrl + url;
}

// Export default configuration
export default getEnvironmentConfig(); 