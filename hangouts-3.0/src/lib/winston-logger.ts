import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Import Sentry for error tracking
let Sentry: any = null
// Temporarily disable Sentry to fix build issues
// try {
//   Sentry = require('@sentry/nextjs')
// } catch (error) {
//   // Sentry not available, continue without it
// }

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Tell winston that you want to link the colors
winston.addColors(colors)

// Define which transports the logger must use
const transports: winston.transport[] = []

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    })
  )
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  )

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  )

  // HTTP logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  )
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  transports,
  exitOnError: false,
})

// Create a stream object with a 'write' function for Morgan
export const morganStream = {
  write: (message: string) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')))
  },
}

// Enhanced logger with context support
export class ContextLogger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private formatMessage(message: string, data?: any): string {
    const contextPrefix = `[${this.context}]`
    if (data) {
      return `${contextPrefix} ${message} ${JSON.stringify(data)}`
    }
    return `${contextPrefix} ${message}`
  }

  private sendToSentry(level: string, message: string, data?: any) {
    if (Sentry && (level === 'error' || level === 'warn')) {
      if (level === 'error') {
        Sentry.captureException(new Error(message), {
          extra: data,
          tags: { context: this.context }
        })
      } else {
        Sentry.captureMessage(message, level as any, {
          extra: data,
          tags: { context: this.context }
        })
      }
    }
  }

  debug(message: string, data?: any) {
    logger.debug(this.formatMessage(message, data))
  }

  info(message: string, data?: any) {
    logger.info(this.formatMessage(message, data))
  }

  warn(message: string, data?: any) {
    logger.warn(this.formatMessage(message, data))
    this.sendToSentry('warn', message, data)
  }

  error(message: string, data?: any) {
    logger.error(this.formatMessage(message, data))
    this.sendToSentry('error', message, data)
  }

  http(message: string, data?: any) {
    logger.http(this.formatMessage(message, data))
  }
}

// Create context loggers
export const createLogger = (context: string) => new ContextLogger(context)

// Default logger instance
export const defaultLogger = new ContextLogger('APP')

// Export individual methods for backward compatibility
export const { debug, info, warn, error } = defaultLogger

// Export the winston logger instance for advanced usage
export { logger as winstonLogger }

export default defaultLogger
