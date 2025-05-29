import { homedir } from "os";
import { join, resolve } from "path";
import { existsSync } from "fs";
import dotenv from "dotenv";
import { logger } from "./logger.js";

// .env 파일 로드
dotenv.config();

export class ConfigManager {
  constructor() {
    this.config = {
      // 허용된 디렉토리 경로들 - 환경변수에서 읽기
      allowedPaths: this.parseAllowedPaths(),

      // 파일 크기 제한 (바이트, 기본 10MB)
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,

      // 허용된 파일 확장자
      allowedExtensions: this.parseAllowedExtensions(),

      // 서버 설정
      serverInfo: {
        name: process.env.SERVER_NAME || "local-search-mcp-server",
        version: process.env.SERVER_VERSION || "1.0.0",
        description:
          process.env.SERVER_DESCRIPTION ||
          "로컬 파일시스템 검색 및 접근을 위한 MCP 서버",
      },
    };

    // 설정 유효성 검증
    this.validateConfig();
  }

  /**
   * 환경변수에서 허용된 경로들을 파싱
   */
  parseAllowedPaths() {
    const envPaths = process.env.ALLOWED_PATHS;

    if (!envPaths) {
      // 기본 경로들 (환경변수가 없을 때)
      const defaultBasePath = process.env.DEFAULT_BASE_PATH || "Desktop";
      return [
        join(homedir(), defaultBasePath),
        join(homedir(), "Documents"),
        join(homedir(), "Downloads"),
      ];
    }

    // 콤마로 구분된 경로들을 배열로 변환
    return envPaths
      .split(",")
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
      .map((path) => {
        // 절대 경로인지 확인
        if (path.startsWith("/") || path.match(/^[A-Za-z]:/)) {
          return resolve(path);
        }
        // 상대 경로면 홈 디렉토리 기준으로 변환
        return resolve(homedir(), path);
      });
  }

  /**
   * 환경변수에서 허용된 확장자들을 파싱
   */
  parseAllowedExtensions() {
    const envExtensions = process.env.ALLOWED_EXTENSIONS;

    if (!envExtensions) {
      // 기본 확장자들
      return [
        ".txt",
        ".md",
        ".js",
        ".json",
        ".html",
        ".css",
        ".py",
        ".java",
        ".cpp",
        ".c",
        ".h",
        ".xml",
        ".yaml",
        ".yml",
        ".cs",
        ".vue",
        ".ts",
        ".tsx",
        ".go",
        ".rs",
        ".swift",
        ".kt",
        ".php",
        ".rb",
      ];
    }

    if (envExtensions.toLowerCase() === "all") {
      return []; // 모든 확장자 허용
    }

    // 콤마로 구분된 확장자들을 배열로 변환
    return envExtensions
      .split(",")
      .map((ext) => ext.trim())
      .filter((ext) => ext.length > 0)
      .map((ext) => (ext.startsWith(".") ? ext : "." + ext));
  }

  /**
   * 설정 유효성 검증
   */
  validateConfig() {
    const validPaths = [];
    const invalidPaths = [];

    this.config.allowedPaths.forEach((path) => {
      if (existsSync(path)) {
        validPaths.push(path);
      } else {
        invalidPaths.push(path);
      }
    });

    if (validPaths.length === 0) {
      throw new Error(
        `❌ 사용 가능한 경로가 없습니다. 설정을 확인해주세요.\n무효한 경로들: ${invalidPaths.join(
          ", "
        )}`
      );
    }

    if (invalidPaths.length > 0) {
      logger.warn(
        `⚠️  일부 경로에 접근할 수 없습니다: ${invalidPaths.join(", ")}`
      );
    }

    // 유효한 경로만 저장
    this.config.allowedPaths = validPaths;

    logger.info(`✅ ${validPaths.length}개의 유효한 경로가 설정되었습니다.`);
  }

  /**
   * 허용된 경로 목록 반환
   */
  getAllowedPaths() {
    return this.config.allowedPaths;
  }

  /**
   * 최대 파일 크기 반환
   */
  getMaxFileSize() {
    return this.config.maxFileSize;
  }

  /**
   * 허용된 확장자 목록 반환
   */
  getAllowedExtensions() {
    return this.config.allowedExtensions;
  }

  /**
   * 서버 정보 반환
   */
  getServerInfo() {
    return this.config.serverInfo;
  }

  /**
   * 설정 정보 출력 (디버깅용)
   */
  printConfig() {
    logger.debug("📋 현재 설정:");
    logger.debug("📁 허용된 경로:", this.getAllowedPaths());
    logger.debug(
      "📊 최대 파일 크기:",
      `${this.getMaxFileSize() / 1024 / 1024}MB`
    );
    logger.debug("허용된 확장자", {
      extensions:
        this.getAllowedExtensions().length === 0
          ? "모든 확장자"
          : this.getAllowedExtensions().join(", "),
    });
  }

  /**
   * 새 경로 추가 (런타임)
   */
  addAllowedPath(path) {
    const resolvedPath = resolve(path);
    if (!this.config.allowedPaths.includes(resolvedPath)) {
      if (existsSync(resolvedPath)) {
        this.config.allowedPaths.push(resolvedPath);
        logger.info(`✅ 새 경로 추가됨: ${resolvedPath}`);
      } else {
        logger.warn(`⚠️  경로에 접근할 수 없습니다: ${resolvedPath}`);
      }
    }
  }
}
