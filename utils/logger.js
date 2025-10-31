import path from "path";
import fs from "fs";

const LOG_DIR = path.join(process.cwd(), "logs");

// Create logs directory if not exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log levels
 */
export const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

/**
 * Write log to file
 */
const writeLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  const logLine = JSON.stringify(logEntry) + "\n";

  // Write to daily log file
  const date = timestamp.split("T")[0];
  const logFile = path.join(LOG_DIR, `${date}.log`);

  fs.appendFile(logFile, logLine, (err) => {
    if (err) console.error("Failed to write log:", err);
  });

  //   Write to console
  const colors = {
    ERROR: "\x1b[31m", // Red
    WARN: "\x1b[33m", // Yellow
    INFO: "\x1b[36m", // Cyan
    DEBUG: "\x1b[90m", // Gray
  };

  const color = colors[level] || "";
  const reset = "\x1b[0m";

  console.log(`${color}[${level}]${reset} ${timestamp} - ${message}`);
  if (Object.keys(meta).length > 0) {
    console.log(JSON.stringify(meta, null, 2));
  }
};

/**
 * Logger functions
 */
export const logger = {
  error: (message, meta) => writeLog(LOG_LEVELS.ERROR, message, meta),
  warn: (message, meta) => writeLog(LOG_LEVELS.WARN, message, meta),
  info: (message, meta) => writeLog(LOG_LEVELS.INFO, message, meta),
  debug: (message, meta) => writeLog(LOG_LEVELS.DEBUG, message, meta),
};

/**
 * Log security events
 */
export const logSecurityEvent = (event, details) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });

  // Write to separate security log
  const logFile = path.join(LOG_DIR, "security.log");
  const logEntry =
    JSON.stringify({
      event,
      ...details,
      timestamp: new Date().toISOString(),
    }) + "\n";

  fs.appendFile(logFile, logEntry, (err) => {
    if (err) console.error("Failed to write security log:", err);
  });
};

/**
 * Log GraphQL operations
 */
export const logGraphQLOperation = (
  operationName,
  duration,
  success,
  error = null
) => {
  const logData = {
    operation: operationName,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logData.error = error.message;
  }

  if (success) {
    logger.info(`GraphQL: ${operationName}`, logData);
  } else {
    logger.error(`GraphQL: ${operationName} failed`, logData);
  }
};
