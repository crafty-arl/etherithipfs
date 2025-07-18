/**
 * Database Configuration for Memory Weaver Bot
 * Manages D1 database settings, schemas, and migrations
 */

// Database configuration
export const databaseConfig = {
  // Connection settings
  connection: {
    databaseId: process.env.DATABASE_ID,
    url: process.env.DATABASE_URL,
    timeout: parseInt(process.env.DB_TIMEOUT) || 30000,
    retries: parseInt(process.env.DB_RETRIES) || 3
  },

  // Query settings
  query: {
    timeout: 10000,           // 10 seconds
    maxRows: 1000,            // Maximum rows per query
    maxQuerySize: 1000000,    // 1MB maximum query size
    enableWAL: true           // Write-Ahead Logging for better performance
  },

  // Migration settings
  migrations: {
    directory: './cloudflare/migrations',
    autoRun: process.env.AUTO_RUN_MIGRATIONS === 'true',
    backupBeforeMigration: true,
    
    // Migration file naming convention
    filePattern: /^\d{4}_\d{2}_\d{2}_\d{6}_.+\.sql$/,
    
    // Migration tracking
    trackingTable: 'schema_migrations'
  },

  // Table configurations
  tables: {
    // Memories table configuration
    memories: {
      primaryKey: 'id',
      indexes: [
        'user_id',
        'server_id', 
        'category',
        'privacy_level',
        'created_at'
      ],
      
      // Constraints
      constraints: {
        titleLength: { min: 3, max: 100 },
        descriptionLength: { min: 10, max: 1000 },
        validCategories: ['Personal', 'Server Events', 'Resources', 'Gaming', 'Other'],
        validPrivacyLevels: ['Public', 'Members Only', 'Private']
      }
    },

    // Memory files table configuration
    memory_files: {
      primaryKey: 'id',
      foreignKeys: [
        { column: 'memory_id', references: 'memories(id)', onDelete: 'CASCADE' }
      ],
      indexes: [
        'memory_id',
        'file_type',
        'uploaded_at',
        'processing_status'
      ],
      
      // File constraints
      constraints: {
        maxFileSize: 200 * 1024 * 1024, // 200MB
        allowedFileTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'application/msword',
          'audio/mpeg', 'audio/wav',
          'video/mp4', 'video/quicktime'
        ],
        validProcessingStatuses: ['pending', 'processing', 'completed', 'failed']
      }
    }
  },

  // Performance settings
  performance: {
    // Connection pooling
    pool: {
      min: 1,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },

    // Query optimization
    optimization: {
      enableQueryCache: true,
      queryCacheSize: 100,
      enablePreparedStatements: true,
      maxPreparedStatements: 50
    }
  },

  // Backup settings
  backup: {
    enabled: process.env.DB_BACKUP_ENABLED === 'true',
    schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: parseInt(process.env.DB_BACKUP_RETENTION) || 30, // 30 days
    
    // Backup locations
    destinations: {
      r2: {
        bucket: process.env.BACKUP_BUCKET || 'memory-weaver-backups',
        prefix: 'database-backups/'
      }
    }
  }
};

// Database schema definitions
export const schema = {
  // Memories table schema
  memories: `
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      title TEXT NOT NULL CHECK(length(title) >= 3 AND length(title) <= 100),
      description TEXT NOT NULL CHECK(length(description) >= 10 AND length(description) <= 1000),
      category TEXT NOT NULL DEFAULT 'Other' CHECK(category IN ('Personal', 'Server Events', 'Resources', 'Gaming', 'Other')),
      privacy_level TEXT NOT NULL DEFAULT 'Members Only' CHECK(privacy_level IN ('Public', 'Members Only', 'Private')),
      visibility_duration INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tags TEXT DEFAULT '[]',
      file_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
      share_options TEXT DEFAULT '["channel"]',
      final_notes TEXT DEFAULT '',
      upload_config TEXT DEFAULT '{}'
    )
  `,

  // Memory files table schema
  memory_files: `
    CREATE TABLE IF NOT EXISTS memory_files (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL CHECK(file_size > 0),
      storage_url TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      ipfs_cid TEXT,
      ipfs_url TEXT,
      thumbnail_url TEXT,
      metadata TEXT DEFAULT '{}',
      processing_status TEXT NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      storage_duration INTEGER NOT NULL DEFAULT 0,
      expires_at DATETIME,
      error_message TEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    )
  `,

  // Schema migrations tracking table
  schema_migrations: `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT NOT NULL
    )
  `,

  // Indexes for better performance
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_memories_server_id ON memories(server_id)',
    'CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)',
    'CREATE INDEX IF NOT EXISTS idx_memories_privacy ON memories(privacy_level)',
    'CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status)',
    
    'CREATE INDEX IF NOT EXISTS idx_files_memory_id ON memory_files(memory_id)',
    'CREATE INDEX IF NOT EXISTS idx_files_type ON memory_files(file_type)',
    'CREATE INDEX IF NOT EXISTS idx_files_status ON memory_files(processing_status)',
    'CREATE INDEX IF NOT EXISTS idx_files_uploaded ON memory_files(uploaded_at)',
    'CREATE INDEX IF NOT EXISTS idx_files_expires ON memory_files(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_files_ipfs_cid ON memory_files(ipfs_cid)'
  ],

  // Triggers for automatic timestamps
  triggers: [
    `CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
     AFTER UPDATE ON memories 
     FOR EACH ROW 
     BEGIN 
       UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`,
     
    `CREATE TRIGGER IF NOT EXISTS update_files_timestamp 
     AFTER UPDATE ON memory_files 
     FOR EACH ROW 
     BEGIN 
       UPDATE memory_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`
  ]
};

// Environment-specific configurations
export const environmentConfigs = {
  development: {
    query: {
      timeout: 30000,         // Longer timeouts for debugging
      maxRows: 100            // Smaller result sets for development
    },
    migrations: {
      autoRun: true           // Auto-run migrations in development
    },
    backup: {
      enabled: false          // Disable backups in development
    }
  },

  testing: {
    connection: {
      databaseId: process.env.TEST_DATABASE_ID,
      url: process.env.TEST_DATABASE_URL
    },
    query: {
      timeout: 5000,          // Faster timeouts for tests
      maxRows: 50
    },
    migrations: {
      autoRun: true
    },
    backup: {
      enabled: false
    }
  },

  production: {
    query: {
      timeout: 10000,
      maxRows: 1000
    },
    migrations: {
      autoRun: false,         // Manual migrations in production
      backupBeforeMigration: true
    },
    backup: {
      enabled: true,
      schedule: '0 2 * * *'   // Daily backups
    },
    performance: {
      pool: {
        max: 20               // More connections in production
      }
    }
  }
};

// Validation functions
export function validateDatabaseConfig() {
  const errors = [];
  const warnings = [];

  // Check required settings
  if (!databaseConfig.connection.databaseId) {
    errors.push('DATABASE_ID is required');
  }

  // Validate timeout settings
  if (databaseConfig.connection.timeout < 1000) {
    warnings.push('Database timeout is very low');
  }

  if (databaseConfig.query.timeout < 1000) {
    warnings.push('Query timeout is very low');
  }

  // Validate migration settings
  if (databaseConfig.migrations.autoRun && process.env.NODE_ENV === 'production') {
    warnings.push('Auto-running migrations in production is not recommended');
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
  return mergeDeep(databaseConfig, envConfig);
}

// Helper function for deep merging
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

// Database utility functions
export function buildConnectionString(config = databaseConfig.connection) {
  if (config.url) {
    return config.url;
  }
  
  // Build connection string from components
  return `sqlite:${config.databaseId}.db`;
}

export function getTableConstraints(tableName) {
  return databaseConfig.tables[tableName]?.constraints || {};
}

export function validateMemoryData(data) {
  const constraints = getTableConstraints('memories');
  const errors = [];

  if (data.title) {
    const titleLength = data.title.length;
    if (titleLength < constraints.titleLength.min || titleLength > constraints.titleLength.max) {
      errors.push(`Title must be between ${constraints.titleLength.min} and ${constraints.titleLength.max} characters`);
    }
  }

  if (data.description) {
    const descLength = data.description.length;
    if (descLength < constraints.descriptionLength.min || descLength > constraints.descriptionLength.max) {
      errors.push(`Description must be between ${constraints.descriptionLength.min} and ${constraints.descriptionLength.max} characters`);
    }
  }

  if (data.category && !constraints.validCategories.includes(data.category)) {
    errors.push(`Category must be one of: ${constraints.validCategories.join(', ')}`);
  }

  if (data.privacy_level && !constraints.validPrivacyLevels.includes(data.privacy_level)) {
    errors.push(`Privacy level must be one of: ${constraints.validPrivacyLevels.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateFileData(data) {
  const constraints = getTableConstraints('memory_files');
  const errors = [];

  if (data.file_size > constraints.maxFileSize) {
    errors.push(`File size exceeds maximum of ${constraints.maxFileSize} bytes`);
  }

  if (data.file_type && !constraints.allowedFileTypes.includes(data.file_type)) {
    errors.push(`File type ${data.file_type} is not allowed`);
  }

  if (data.processing_status && !constraints.validProcessingStatuses.includes(data.processing_status)) {
    errors.push(`Invalid processing status: ${data.processing_status}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export default configuration
export default getEnvironmentConfig(); 