import { readdir, readFile, writeFile, stat, access } from "fs/promises";
import { join, basename, extname } from "path";
import { constants } from "fs";
import { logger } from "../logger.js";

export class FilesystemTools {
  constructor(securityValidator) {
    this.security = securityValidator;
  }

  /**
   * 디렉토리 목록 조회
   */
  async listDirectory(dirPath) {
    try {
      const validatedPath = this.security.validatePath(dirPath);
      const items = await readdir(validatedPath, { withFileTypes: true });

      const result = [];
      for (const item of items) {
        const itemPath = join(validatedPath, item.name);
        const stats = await stat(itemPath);

        result.push({
          name: item.name,
          type: item.isDirectory() ? "directory" : "file",
          size: item.isFile() ? stats.size : null,
          modified: stats.mtime.toISOString(),
          extension: item.isFile() ? extname(item.name) : null,
        });
      }

      return {
        content: [
          {
            type: "text",
            text:
              `📁 ${dirPath} 디렉토리 내용:\n\n` +
              result
                .map((item) => {
                  const icon = item.type === "directory" ? "📁" : "📄";
                  const size = item.size
                    ? ` (${(item.size / 1024).toFixed(1)}KB)`
                    : "";
                  const modified = new Date(item.modified).toLocaleString(
                    "ko-KR"
                  );
                  return `${icon} ${item.name}${size}\n   수정: ${modified}`;
                })
                .join("\n\n") +
              `\n\n총 ${result.length}개 항목`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`디렉토리 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 파일 내용 읽기
   */
  async readFile(filePath) {
    try {
      const fileInfo = this.security.validateFile(filePath);

      if (fileInfo.type === "directory") {
        throw new Error(
          "디렉토리는 읽을 수 없습니다. list_directory를 사용하세요."
        );
      }

      const content = await readFile(fileInfo.path, "utf-8");
      const lines = content.split("\n").length;
      const chars = content.length;

      return {
        content: [
          {
            type: "text",
            text:
              `📄 ${basename(filePath)} 파일 내용:\n` +
              `📊 ${lines}줄, ${chars}자\n` +
              `${"=".repeat(50)}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`파일 읽기 실패: ${error.message}`);
    }
  }

  /**
   * 파일 쓰기
   */
  async writeFile(filePath, content) {
    try {
      const validatedPath = this.security.validateWriteOperation(
        filePath,
        content
      );

      await writeFile(validatedPath, content, "utf-8");
      const stats = await stat(validatedPath);

      return {
        content: [
          {
            type: "text",
            text:
              `✅ 파일 쓰기 완료!\n` +
              `📁 경로: ${filePath}\n` +
              `📊 크기: ${(stats.size / 1024).toFixed(1)}KB\n` +
              `⏰ 수정 시간: ${stats.mtime.toLocaleString("ko-KR")}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`파일 쓰기 실패: ${error.message}`);
    }
  }

  /**
   * 파일 검색
   */
  async searchFiles(directory, query, searchContent = false) {
    try {
      const validatedPath = this.security.validatePath(directory);
      const results = [];

      await this._searchRecursive(validatedPath, query, searchContent, results);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `🔍 "${query}" 검색 결과: 없음\n📁 검색 경로: ${directory}`,
            },
          ],
        };
      }

      const resultText = results
        .map((result) => {
          let text = `📄 ${result.relativePath}`;
          if (result.matches && result.matches.length > 0) {
            text += `\n   💡 일치하는 내용: ${result.matches
              .slice(0, 3)
              .join(", ")}`;
            if (result.matches.length > 3) {
              text += ` 외 ${result.matches.length - 3}개`;
            }
          }
          return text;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text:
              `🔍 "${query}" 검색 결과 (총 ${results.length}개):\n` +
              `📁 검색 경로: ${directory}\n` +
              `🔍 검색 범위: ${
                searchContent ? "파일명 + 내용" : "파일명만"
              }\n\n` +
              resultText,
          },
        ],
      };
    } catch (error) {
      throw new Error(`파일 검색 실패: ${error.message}`);
    }
  }

  /**
   * 재귀적 파일 검색
   */
  async _searchRecursive(
    dirPath,
    query,
    searchContent,
    results,
    basePath = dirPath
  ) {
    try {
      const items = await readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = join(dirPath, item.name);

        // 보안 검증 (허용된 경로 내부인지)
        try {
          this.security.validatePath(itemPath);
        } catch {
          continue; // 접근 불가한 경로는 건너뛰기
        }

        if (item.isDirectory()) {
          // 디렉토리는 재귀 탐색
          await this._searchRecursive(
            itemPath,
            query,
            searchContent,
            results,
            basePath
          );
        } else if (item.isFile()) {
          // 파일명 검색
          const relativePath = itemPath
            .replace(basePath, "")
            .replace(/^\//, "");
          const nameMatches = item.name
            .toLowerCase()
            .includes(query.toLowerCase());

          let contentMatches = [];

          // 내용 검색 (옵션)
          if (searchContent && nameMatches === false) {
            try {
              const fileInfo = this.security.validateFile(itemPath);
              if (fileInfo.stats.size < 1024 * 1024) {
                // 1MB 이하만 내용 검색
                const content = await readFile(itemPath, "utf-8");
                const lines = content.split("\n");

                lines.forEach((line, index) => {
                  if (line.toLowerCase().includes(query.toLowerCase())) {
                    contentMatches.push(
                      `Line ${index + 1}: ${line.trim().substring(0, 100)}`
                    );
                  }
                });
              }
            } catch {
              // 읽기 실패한 파일은 건너뛰기
            }
          }

          if (nameMatches || contentMatches.length > 0) {
            results.push({
              relativePath,
              fullPath: itemPath,
              nameMatch: nameMatches,
              matches: contentMatches,
            });
          }
        }
      }
    } catch (error) {
      // 접근 권한 없는 디렉토리는 조용히 건너뛰기
      logger.warn(`디렉토리 접근 실패: ${dirPath}`);
    }
  }

  /**
   * 파일/디렉토리 정보 조회
   */
  async getFileInfo(path) {
    try {
      const fileInfo = this.security.validateFile(path);
      const stats = fileInfo.stats;

      const info = {
        path: path,
        type: fileInfo.type,
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: {
          readable: true, // validateFile이 성공했으므로
          writable: false,
          executable: false,
        },
      };

      // 권한 확인
      try {
        await access(fileInfo.path, constants.W_OK);
        info.permissions.writable = true;
      } catch {}

      try {
        await access(fileInfo.path, constants.X_OK);
        info.permissions.executable = true;
      } catch {}

      // 파일인 경우 추가 정보
      if (fileInfo.type === "file") {
        info.extension = extname(path);
        info.basename = basename(path);
      }

      const formatDate = (date) => new Date(date).toLocaleString("ko-KR");
      const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} bytes`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      };

      return {
        content: [
          {
            type: "text",
            text:
              `📋 ${basename(path)} 정보:\n\n` +
              `📁 경로: ${path}\n` +
              `📊 유형: ${info.type === "file" ? "파일" : "디렉토리"}\n` +
              `📏 크기: ${formatSize(info.size)}\n` +
              `🕐 생성: ${formatDate(info.created)}\n` +
              `📝 수정: ${formatDate(info.modified)}\n` +
              `👁  접근: ${formatDate(info.accessed)}\n` +
              `🔐 권한: ${info.permissions.readable ? "R" : "-"}${
                info.permissions.writable ? "W" : "-"
              }${info.permissions.executable ? "X" : "-"}\n` +
              (info.extension ? `📎 확장자: ${info.extension}` : ""),
          },
        ],
      };
    } catch (error) {
      throw new Error(`파일 정보 조회 실패: ${error.message}`);
    }
  }
}
