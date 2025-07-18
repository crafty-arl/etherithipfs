import fs from 'fs';
import path from 'path';

/**
 * Logger utility for Memory Weaver bot
 * Provides structured logging with different levels and output options
 */

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

// Log level names
const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.FATAL]: 'FATAL'
};

// Configuration
const config = {
  level: getLogLevel(),
  console: true,
  file: process.env.LOG_TO_FILE === 'true',
  filePath: process.env.LOG_FILE_PATH || './logs/memory-weaver.log',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  includeTimestamp: true,
  includeLevel: true,
  colorize: process.env.NODE_ENV !== 'production'
};

// Colors for console output
const colors = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  FATAL: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'   // Reset
};

// Ensure log directory exists
if (config.file) {
  ensureLogDirectory();
}

/**
 * Main logger class
 */
class Logger {
  constructor() {
    this.logQueue = [];
    this.isWriting = false;
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  debug(message, ...data) {
    this.log(LOG_LEVELS.DEBUG, message, ...data);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  info(message, ...data) {
    this.log(LOG_LEVELS.INFO, message, ...data);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  warn(message, ...data) {
    this.log(LOG_LEVELS.WARN, message, ...data);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  error(message, ...data) {
    this.log(LOG_LEVELS.ERROR, message, ...data);
  }

  /**
   * Log fatal message
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  fatal(message, ...data) {
    this.log(LOG_LEVELS.FATAL, message, ...data);
  }

  /**
   * Main logging method
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  log(level, message, ...data) {
    // Check if we should log this level
    if (level < config.level) {
      return;
    }

    const logEntry = this.createLogEntry(level, message, data);

    // Console output
    if (config.console) {
      this.logToConsole(logEntry);
    }

    // File output
    if (config.file) {
      this.logToFile(logEntry);
    }

    // Send to external monitoring if configured
    if (level >= LOG_LEVELS.ERROR) {
      this.sendToMonitoring(logEntry);
    }
  }

  /**
   * Create structured log entry
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {Array} data - Additional data
   * @returns {Object} Log entry object
   */
  createLogEntry(level, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      levelNum: level,
      message,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    };

    // Add additional data if provided
    if (data && data.length > 0) {
      entry.data = data.length === 1 ? data[0] : data;
    }

    // Add context information
    entry.context = this.getContext();

    return entry;
  }

  /**
   * Get current context information
   * @returns {Object} Context object
   */
  getContext() {
    const context = {
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown'
    };

    // Add memory usage
    const memUsage = process.memoryUsage();
    context.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    };

    return context;
  }

  /**
   * Log to console with formatting
   * @param {Object} logEntry - Log entry object
   */
  logToConsole(logEntry) {
    const levelName = logEntry.level;
    const color = config.colorize ? colors[levelName] : '';
    const reset = config.colorize ? colors.RESET : '';
    
    let output = '';

    // Timestamp
    if (config.includeTimestamp) {
      output += `[${logEntry.timestamp}] `;
    }

    // Log level
    if (config.includeLevel) {
      output += `${color}${levelName}${reset} `;
    }

    // Message
    output += logEntry.message;

    // Additional data
    if (logEntry.data) {
      output += ' ' + this.formatData(logEntry.data);
    }

    // Use appropriate console method
    switch (logEntry.levelNum) {
      case LOG_LEVELS.DEBUG:
        console.debug(output);
        break;
      case LOG_LEVELS.INFO:
        console.info(output);
        break;
      case LOG_LEVELS.WARN:
        console.warn(output);
        break;
      case LOG_LEVELS.ERROR:
      case LOG_LEVELS.FATAL:
        console.error(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Log to file
   * @param {Object} logEntry - Log entry object
   */
  async logToFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Check file size and rotate if needed
      await this.rotateLogFileIfNeeded();
      
      // Write to file
      fs.appendFileSync(config.filePath, logLine, 'utf8');

    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  async rotateLogFileIfNeeded() {
    try {
      if (!fs.existsSync(config.filePath)) {
        return;
      }

      const stats = fs.statSync(config.filePath);
      if (stats.size < config.maxFileSize) {
        return;
      }

      // Rotate existing files
      const logDir = path.dirname(config.filePath);
      const logName = path.basename(config.filePath, path.extname(config.filePath));
      const logExt = path.extname(config.filePath);

      // Move existing rotated files
      for (let i = config.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
        const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);
        
        if (fs.existsSync(oldFile)) {
          if (i === config.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current file to .1
      const rotatedFile = path.join(logDir, `${logName}.1${logExt}`);
      fs.renameSync(config.filePath, rotatedFile);

    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  /**
   * Send critical logs to external monitoring
   * @param {Object} logEntry - Log entry object
   */
  async sendToMonitoring(logEntry) {
    try {
      // This would integrate with monitoring services like:
      // - Sentry
      // - Datadog
      // - New Relic
      // - Custom webhook

      const monitoringUrl = process.env.MONITORING_WEBHOOK_URL;
      if (!monitoringUrl) {
        return;
      }

      // Example webhook payload
      const payload = {
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        message: logEntry.message,
        service: 'memory-weaver-bot',
        environment: process.env.NODE_ENV || 'development',
        data: logEntry.data,
        context: logEntry.context
      };

      // Send to monitoring service (simplified example)
      // In production, use proper HTTP client with retries
      const response = await fetch(monitoringUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Failed to send log to monitoring:', response.statusText);
      }

    } catch (error) {
      console.error('Monitoring integration error:', error);
    }
  }

  /**
   * Format additional data for output
   * @param {any} data - Data to format
   * @returns {string} Formatted data string
   */
  formatData(data) {
    if (data === null || data === undefined) {
      return String(data);
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof Error) {
      return `${data.name}: ${data.message}\n${data.stack}`;
    }

    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch (error) {
        return '[Circular Reference or Non-serializable Object]';
      }
    }

    return String(data);
  }

  /**
   * Create child logger with additional context
   * @param {Object} context - Additional context to include
   * @returns {Logger} Child logger instance
   */
  child(context) {
    const childLogger = new Logger();
    const originalCreateLogEntry = childLogger.createLogEntry.bind(childLogger);
    
    childLogger.createLogEntry = function(level, message, data) {
      const entry = originalCreateLogEntry(level, message, data);
      entry.context = { ...entry.context, ...context };
      return entry;
    };

    return childLogger;
  }

  /**
   * Flush any pending log entries
   */
  async flush() {
    // Implementation for flushing pending logs if using async file writing
    return Promise.resolve();
  }
}

/**
 * Utility functions
 */

/**
 * Get log level from environment
 * @returns {number} Log level
 */
function getLogLevel() {
  const levelName = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
  return LOG_LEVELS[levelName] !== undefined ? LOG_LEVELS[levelName] : LOG_LEVELS.INFO;
}

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
  try {
    const logDir = path.dirname(config.filePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create log directory:', error);
    config.file = false; // Disable file logging if directory creation fails
  }
}

/**
 * Performance monitoring helpers
 */

/**
 * Time a function execution
 * @param {string} label - Label for the timer
 * @param {Function} fn - Function to time
 * @returns {any} Function result
 */
export async function timeFunction(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`${label} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${label} failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Memory usage logger
 */
export function logMemoryUsage(label = 'Memory Usage') {
  const usage = process.memoryUsage();
  logger.info(`${label}:`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}

/**
 * Request correlation ID for tracking
 */
export function withCorrelationId(id, fn) {
  const childLogger = logger.child({ correlationId: id });
  
  // Replace global logger temporarily
  const originalLogger = global.logger;
  global.logger = childLogger;
  
  try {
    return fn();
  } finally {
    global.logger = originalLogger;
  }
}

// Create and export default logger instance
export const logger = new Logger();

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown logging
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Log startup information
logger.info('Logger initialized', {
  level: LOG_LEVEL_NAMES[config.level],
  console: config.console,
  file: config.file,
  filePath: config.file ? config.filePath : 'disabled'
}); 