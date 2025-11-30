/**
 * Production-safe logger utility
 * - In development: logs everything
 * - In production: only logs errors
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  /**
   * Debug/info logs - only in development
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning logs - only in development
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Error logs - always logged (needed for debugging production issues)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Info logs with emoji - only in development
   */
  info: (emoji: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(emoji, ...args);
    }
  },

  /**
   * Performance timing - only in development
   */
  perf: (label: string, startTime: number) => {
    if (isDevelopment) {
      const duration = (performance.now() - startTime).toFixed(0);
      console.log(`⏱️ ${label}: ${duration}ms`);
    }
  },

  /**
   * Table logs - only in development
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Group logs - only in development
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
};

/**
 * Conditional logging based on environment
 * Usage: 
 * import { logger } from './utils/logger';
 * logger.log('Debug info'); // Only in dev
 * logger.error('Error'); // Always logged
 */
export default logger;
