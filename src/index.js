#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ConfigManager } from "./config.js";
import { SecurityValidator } from "./security.js";
import { FilesystemTools } from "./tools/filesystem.js";
import { logger } from "./logger.js";

class LocalSearchMCPServer {
  constructor() {
    this.configManager = new ConfigManager();
    this.security = new SecurityValidator(this.configManager);
    this.filesystemTools = new FilesystemTools(this.security);

    this.server = new Server(
      {
        name: "local-search-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    logger.info("MCP 서버 초기화 완료");
  }

  setupHandlers() {
    // 도구 목록 반환
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug("도구 목록 요청 받음");

      return {
        tools: [
          {
            name: "create_directory",
            description: "새로운 디렉토리(폴더)를 생성합니다. 중첩 폴더도 자동으로 생성됩니다",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "생성할 디렉토리 경로",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "list_directory",
            description: "지정된 디렉토리의 파일과 폴더 목록을 반환합니다",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "탐색할 디렉토리 경로",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "read_file",
            description: "파일 내용을 읽어서 반환합니다",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "읽을 파일 경로",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "write_file",
            description: "파일에 내용을 씁니다 (기존 파일 덮어쓰기)",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "쓸 파일 경로",
                },
                content: {
                  type: "string",
                  description: "파일에 쓸 내용",
                },
              },
              required: ["path", "content"],
            },
          },
          {
            name: "search_files",
            description:
              "지정된 디렉토리에서 파일명이나 내용으로 파일을 검색합니다",
            inputSchema: {
              type: "object",
              properties: {
                directory: {
                  type: "string",
                  description: "검색할 디렉토리 경로",
                },
                query: {
                  type: "string",
                  description: "검색할 키워드",
                },
                searchContent: {
                  type: "boolean",
                  description:
                    "파일 내용도 검색할지 여부 (기본: false, 파일명만 검색)",
                },
              },
              required: ["directory", "query"],
            },
          },
          {
            name: "get_file_info",
            description: "파일 또는 디렉토리의 상세 정보를 반환합니다",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "정보를 확인할 파일/디렉토리 경로",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "merge_files",
            description: "여러 파일을 하나로 병합합니다",
            inputSchema: {
              type: "object",
              properties: {
                paths: {
                  type: "array",
                  items: { type: "string" },
                  description: "병합할 파일 경로 배열",
                },
                outputPath: {
                  type: "string",
                  description: "출력 파일 경로 (선택, 없으면 기본 OUTPUT_PATH 사용)",
                },
                separator: {
                  type: "string",
                  description: "파일 간 구분자 (선택, 기본: \\n\\n=== [파일명] ===\\n\\n)",
                },
              },
              required: ["paths"],
            },
          },
          {
            name: "merge_directory_files",
            description: "디렉토리 내 파일들을 패턴으로 필터링하여 병합합니다",
            inputSchema: {
              type: "object",
              properties: {
                directory: {
                  type: "string",
                  description: "검색할 디렉토리 경로",
                },
                pattern: {
                  type: "string",
                  description: "파일명 패턴 (예: 2025-10-*.txt, 기본: *)",
                },
                outputPath: {
                  type: "string",
                  description: "출력 파일 경로 (선택, 없으면 기본 OUTPUT_PATH 사용)",
                },
                separator: {
                  type: "string",
                  description: "파일 간 구분자 (선택)",
                },
                sortBy: {
                  type: "string",
                  description: "정렬 기준 (name 또는 date, 기본: name)",
                },
              },
              required: ["directory"],
            },
          },
          {
            name: "delete_files",
            description: "여러 파일을 삭제합니다",
            inputSchema: {
              type: "object",
              properties: {
                paths: {
                  type: "array",
                  items: { type: "string" },
                  description: "삭제할 파일 경로 배열",
                },
              },
              required: ["paths"],
            },
          },
          {
            name: "get_files_summary",
            description: "디렉토리 내 파일들의 요약 정보를 반환합니다 (파일 수, 총 크기, 날짜 범위 등)",
            inputSchema: {
              type: "object",
              properties: {
                directory: {
                  type: "string",
                  description: "검색할 디렉토리 경로",
                },
                pattern: {
                  type: "string",
                  description: "파일명 패턴 (예: *.txt, 기본: *)",
                },
              },
              required: ["directory"],
            },
          },
        ],
      };
    });

    // 도구 실행 처리
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`도구 실행 요청: ${name}`, args);

      try {
        let result;

        switch (name) {
          case "create_directory":
            result = await this.filesystemTools.createDirectory(args.path);
            break;

          case "list_directory":
            result = await this.filesystemTools.listDirectory(args.path);
            break;

          case "read_file":
            result = await this.filesystemTools.readFile(args.path);
            break;

          case "write_file":
            result = await this.filesystemTools.writeFile(
              args.path,
              args.content
            );
            break;

          case "search_files":
            result = await this.filesystemTools.searchFiles(
              args.directory,
              args.query,
              args.searchContent || false
            );
            break;

          case "get_file_info":
            result = await this.filesystemTools.getFileInfo(args.path);
            break;

          case "merge_files":
            result = await this.filesystemTools.mergeFiles(
              args.paths,
              args.outputPath,
              args.separator
            );
            break;

          case "merge_directory_files":
            result = await this.filesystemTools.mergeDirectoryFiles(
              args.directory,
              args.pattern,
              args.outputPath,
              args.separator,
              args.sortBy
            );
            break;

          case "delete_files":
            result = await this.filesystemTools.deleteFiles(args.paths);
            break;

          case "get_files_summary":
            result = await this.filesystemTools.getFilesSummary(
              args.directory,
              args.pattern
            );
            break;

          default:
            throw new Error(`알 수 없는 도구: ${name}`);
        }

        logger.info(`도구 실행 성공: ${name}`);
        return result;
      } catch (error) {
        logger.error(`도구 실행 실패: ${name}`, { error: error.message, args });

        return {
          content: [
            {
              type: "text",
              text: `❌ 오류: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async run() {
    logger.info("Local Search MCP 서버 시작");
    logger.info("허용된 경로", { paths: this.configManager.getAllowedPaths() });
    logger.info("출력 경로", { path: this.configManager.getOutputPath() });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info("서버가 Claude Desktop과 연결되었습니다");
  }
}

// 서버 시작
const server = new LocalSearchMCPServer();
server.run().catch((error) => {
  logger.error("서버 실행 실패", { error: error.message });
  console.error("서버 실행 실패:", error);
});
