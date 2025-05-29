import { resolve, relative, extname } from "path";
import { existsSync, statSync } from "fs";
import { logger } from "./logger.js";
import { homedir } from "os";

export class SecurityValidator {
  constructor(configManager) {
    this.configManager = configManager;
  }

  // 경로가 허용된 디렉토리 내에 있는지 검증
  validatePath(inputPath) {
    try {
      let absolutePath;

      if (inputPath.startsWith("/") || inputPath.match(/^[A-Za-z]:/)) {
        // 이미 절대경로인 경우
        absolutePath = resolve(inputPath);
      } else {
        // 상대경로인 경우: 홈 디렉토리 기준으로 먼저 시도
        const homeBasedPath = resolve(homedir(), inputPath);
        const cwdBasedPath = resolve(inputPath);

        // 홈 디렉토리 기준 경로가 허용된 경로에 포함되어 있는지 확인
        const allowedPaths = this.configManager.getAllowedPaths();
        const isHomeBasedAllowed = allowedPaths.some((allowedPath) => {
          const resolvedAllowedPath = resolve(allowedPath);
          const relativePath = relative(resolvedAllowedPath, homeBasedPath);
          return (
            !relativePath.startsWith("..") && !relativePath.startsWith("/")
          );
        });

        absolutePath = isHomeBasedAllowed ? homeBasedPath : cwdBasedPath;
      }

      const allowedPaths = this.configManager.getAllowedPaths();

      // 허용된 경로 중 하나의 하위 경로인지 확인
      const isAllowed = allowedPaths.some((allowedPath) => {
        const resolvedAllowedPath = resolve(allowedPath);
        const relativePath = relative(resolvedAllowedPath, absolutePath);

        // 상위 디렉토리로 벗어나는 경로(..) 차단
        return !relativePath.startsWith("..") && !relativePath.startsWith("/");
      });

      if (!isAllowed) {
        throw new Error(`❌ 접근 거부: ${inputPath}`);
      }

      return absolutePath;
    } catch (error) {
      throw new Error(`경로 검증 실패: ${error.message}`);
    }
  }

  // 파일 크기 및 존재 여부 검증
  validateFile(filePath) {
    const validatedPath = this.validatePath(filePath);

    if (!existsSync(validatedPath)) {
      throw new Error(`파일이 존재하지 않음: ${filePath}`);
    }

    const stats = statSync(validatedPath);

    if (stats.isDirectory()) {
      return { type: "directory", stats };
    }

    // 파일 크기 검증
    const maxSize = this.configManager.getMaxFileSize();
    if (stats.size > maxSize) {
      throw new Error(
        `파일 크기 초과: ${(stats.size / 1024 / 1024).toFixed(2)}MB > ${
          maxSize / 1024 / 1024
        }MB`
      );
    }

    // 확장자 확인 (경고만)
    this.checkExtension(validatedPath);

    return { type: "file", stats, path: validatedPath };
  }

  // 파일 확장자 확인
  checkExtension(filePath) {
    const allowedExtensions = this.configManager.getAllowedExtensions();
    const fileExt = extname(filePath).toLowerCase();

    if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExt)) {
      logger.warn(`허용되지 않은 확장자: ${fileExt}`, { filePath });
    }
  }

  // 쓰기 작업 전 검증
  validateWriteOperation(filePath, content) {
    const validatedPath = this.validatePath(filePath);

    // 내용 크기 검증
    const contentSize = Buffer.byteLength(content, "utf8");
    const maxSize = this.configManager.getMaxFileSize();

    if (contentSize > maxSize) {
      throw new Error(
        `내용이 너무 큼: ${(contentSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    return validatedPath;
  }
}
