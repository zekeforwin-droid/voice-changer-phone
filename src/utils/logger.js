/**
 * Logger Utility
 * 
 * Structured logging with context for the voice changer system.
 * Uses pino for production, console for development.
 */

import pino from 'pino';

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Create base pino logger
const baseLogger = pino({
  level: LOG_LEVEL,
  transport: IS_PRODUCTION ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
  base: {
    pid: undefined,
    hostname: undefined,
  },
});

/**
 * Create a child logger with a specific context
 * 
 * @param {string} context - Logger context (e.g., 'server', 'voice-transformer')
 * @returns {object} - Logger instance
 */
export function createLogger(context) {
  return baseLogger.child({ context });
}

/**
 * Simple console-based logger (fallback/development)
 */
export class SimpleLogger {
  constructor(context) {
    this.context = context;
    this.enabled = {
      debug: LOG_LEVEL === 'debug' || LOG_LEVEL === 'trace',
      info: true,
      warn: true,
      error: true,
    };
  }
  
  _format(level, message, data) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = `[${timestamp}] ${level.toUpperCase()} [${this.context}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }
  
  debug(message, data) {
    if (this.enabled.debug) {
      console.debug(this._format('debug', message, data));
    }
  }
  
  info(message, data) {
    if (this.enabled.info) {
      console.info(this._format('info', message, data));
    }
  }
  
  warn(message, data) {
    if (this.enabled.warn) {
      console.warn(this._format('warn', message, data));
    }
  }
  
  error(message, data) {
    if (this.enabled.error) {
      console.error(this._format('error', message, data));
    }
  }
}

/**
 * Metrics logger for tracking performance
 */
export class MetricsLogger {
  constructor() {
    this.metrics = new Map();
    this.logger = createLogger('metrics');
  }
  
  /**
   * Record a metric value
   */
  record(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        values: [],
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
      });
    }
    
    const metric = this.metrics.get(name);
    metric.values.push(value);
    metric.sum += value;
    metric.count++;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    
    // Keep only last 1000 values
    if (metric.values.length > 1000) {
      const removed = metric.values.shift();
      metric.sum -= removed;
    }
  }
  
  /**
   * Get aggregated metrics
   */
  getMetrics(name) {
    const metric = this.metrics.get(name);
    if (!metric || metric.count === 0) {
      return null;
    }
    
    const values = metric.values;
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: metric.count,
      min: metric.min,
      max: metric.max,
      avg: metric.sum / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  /**
   * Log all metrics
   */
  logAll() {
    for (const [name, _] of this.metrics) {
      const metrics = this.getMetrics(name);
      if (metrics) {
        this.logger.info(`Metric ${name}:`, metrics);
      }
    }
  }
  
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
  }
}

// Export default logger
export default createLogger('app');
