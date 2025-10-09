/**
 * Production-ready logging utility
 * In development: logs to console
 * In production: can be configured to send to logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry = this.formatMessage(level, message, data, context)
    
    if (this.isDevelopment) {
      // In development, use console methods with colors
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      }
      const reset = '\x1b[0m'
      
      console[level === 'debug' ? 'log' : level](
        `${colors[level]}[${entry.timestamp}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}${reset}`,
        data ? data : ''
      )
    } else if (this.isProduction) {
      // In production, you could send to a logging service
      // For now, we'll just use console methods without colors
      console[level === 'debug' ? 'log' : level](
        `[${entry.timestamp}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`,
        data ? data : ''
      )
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context)
  }
}

export const logger = new Logger()
export default logger


