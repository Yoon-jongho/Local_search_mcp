import { writeFileSync, appendFileSync } from "fs";
import { join } from "path";

class Logger {
  constructor() {
    this.logFile = join(process.cwd(), "mcp-server.log");
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    const logLine = `${timestamp} [${level}] ${message}${
      data ? " " + JSON.stringify(data) : ""
    }\n`;

    try {
      appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error("로그 쓰기 실패:", error.message);
    }
  }

  info(message, data) {
    this.log("INFO", message, data);
    console.error(`[INFO] ${message}`);
  }

  error(message, data) {
    this.log("ERROR", message, data);
    console.error(`[ERROR] ${message}`);
  }

  debug(message, data) {
    if (process.env.NODE_ENV === "development") {
      this.log("DEBUG", message, data);
      console.error(`[DEBUG] ${message}`);
    }
  }

  warn(message, data) {
    this.log("WARN", message, data);
    console.error(`[WARN] ${message}`);
  }
}

export const logger = new Logger();
