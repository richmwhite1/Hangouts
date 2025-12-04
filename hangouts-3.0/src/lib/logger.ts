// Production-ready logging utility
// Uses Winston for server-side logging, console for client-side

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
  private isServer = typeof window === 'undefined'

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context
    }

    // Use Winston logger only on server-side
    if (this.isServer) {
      try {
        const { defaultLogger } = require('./winston-logger')
        defaultLogger[level](message, data)
      } catch (error) {
        // Fallback to console if Winston fails
        console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${message}`, data || '')
      }
    } else {
      // Client-side logging
      const consoleMethod = level === 'debug' ? 'log' : level
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '')
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

// Export singleton instance
export const logger = new Logger()

// Export individual methods for convenience
export const { debug, info, warn, error } = logger

// Export Winston logger for advanced usage (server-side only)
export const createWinstonLogger = (context: string) => {
  if (typeof window === 'undefined') {
    try {
      const { createLogger } = require('./winston-logger')
      return createLogger(context)
    } catch (error) {
      console.warn('Winston logger not available:', error)
      return logger
    }
  }
  return logger
}

// Higher-order function for API route logging
export const withLogger = (handler: any) => {
  return async (req: any, res: any) => {
    const start = Date.now()
    try {
      const result = await handler(req, res)
      const duration = Date.now() - start
      logger.info(`API ${req.method} ${req.url} completed in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - start
      logger.error(`API ${req.method} ${req.url} failed after ${duration}ms`, error)
      throw error
    }
  }
}

// Export default logger
export default logger