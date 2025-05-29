# 🔍 Local Search MCP Server

Claude Desktop에서 로컬 파일시스템에 안전하게 접근할 수 있게 해주는 MCP 서버입니다.

> **MCP란?** Model Context Protocol - Claude가 외부 도구와 상호작용할 수 있게 해주는 프로토콜입니다.

## ✨ 주요 기능

- 📁 **디렉토리 탐색** - 허용된 폴더의 파일 목록 확인
- 📄 **파일 읽기/쓰기** - 텍스트 파일 내용 읽기 및 편집
- 🔍 **스마트 검색** - 파일명 또는 내용으로 파일 검색
- 📊 **파일 정보** - 크기, 수정일, 권한 등 상세 정보 확인
- 🛡️ **보안 우선** - 지정된 경로 외부 접근 완전 차단

## 🚀 빠른 시작

### 1단계: 프로젝트 클론 및 설치

```bash
git clone [repository-url]
cd local_search_mcp
npm install
```

### 2단계: 환경 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 편집 (본인의 경로에 맞게 수정)
# 예시: ALLOWED_PATHS=Desktop/Projects,Documents/Code
```

### 3단계: Claude Desktop 설정

1. `claude_desktop_config.example.json` 파일 내용 확인
2. 본인 운영체제에 맞는 설정 복사
3. Claude Desktop 설정 파일에 추가:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 4단계: 서버 실행 및 연결

```bash
# 서버 시작
npm start

# Claude Desktop 재시작
# 설정 > 개발자에서 서버 상태 확인
```

## 🔧 환경 설정 가이드

### `.env` 파일 설정 예시

```bash
# 개발자용 설정
ALLOWED_PATHS=Desktop/Projects,Documents/Code,Downloads

# 일반 사용자 설정
ALLOWED_PATHS=Documents,Desktop,Downloads

# 특정 프로젝트만 허용
ALLOWED_PATHS=workspace/project1,workspace/project2
```

### 주요 설정 옵션

| 설정                 | 설명                    | 예시                     |
| -------------------- | ----------------------- | ------------------------ |
| `ALLOWED_PATHS`      | 접근 허용할 폴더 경로   | `Desktop,Documents`      |
| `MAX_FILE_SIZE`      | 최대 파일 크기 (바이트) | `10485760` (10MB)        |
| `ALLOWED_EXTENSIONS` | 허용할 파일 확장자      | `.js,.py,.md` 또는 `all` |

## 💬 Claude Desktop 사용법

### 기본 명령어

```
"Documents 폴더의 파일 목록을 보여줘"
"README.md 파일을 읽어줘"
"새로운 test.txt 파일을 만들어서 '안녕하세요'라고 써줘"
```

### 검색 명령어

```
"Desktop 폴더에서 JavaScript 파일들을 찾아줘"
"package.json이 포함된 파일을 검색해줘"
"TODO가 들어있는 파일들을 찾아줘"
```

### 정보 확인

```
"이 파일의 크기와 수정일을 알려줘"
"src 폴더의 상세 정보를 보여줘"
```

## 🛡️ 보안 기능

- ✅ **경로 제한**: 설정된 폴더 외부 접근 차단
- ✅ **파일 크기 제한**: 대용량 파일 처리 방지
- ✅ **확장자 필터링**: 허용된 파일 타입만 처리
- ✅ **디렉토리 탐색 공격 방지**: `../` 경로 탐색 차단
- ✅ **실시간 검증**: 모든 요청에 대한 보안 검사

## 🔍 트러블슈팅

### "서버를 찾을 수 없습니다"

- Claude Desktop을 완전히 종료 후 재시작
- `claude_desktop_config.json` 파일 경로 확인
- 프로젝트 경로가 올바른지 확인

### "접근 거부" 오류

- `.env` 파일의 `ALLOWED_PATHS` 설정 확인
- 요청한 경로가 허용된 경로 내에 있는지 확인
- 상대 경로 사용 시 홈 디렉토리 기준인지 확인

### "JSON 파싱 오류"

- MCP 서버 로그 확인 (`mcp-server.log`)
- Node.js 버전 확인 (18 이상 권장)
- 의존성 재설치: `npm ci`

### 서버 로그 확인

```bash
# 실시간 로그 보기
tail -f mcp-server.log

# 최근 로그 확인
cat mcp-server.log
```

## 🛠️ 개발 정보

### 프로젝트 구조

```
local_search_mcp/
├── src/
│   ├── index.js          # 메인 서버
│   ├── config.js         # 설정 관리
│   ├── security.js       # 보안 검증
│   ├── logger.js         # 로깅 시스템
│   └── tools/
│       └── filesystem.js # 파일시스템 도구
├── .env.example          # 환경 설정 예시
├── claude_desktop_config.example.json
└── README.md
```

### 사용 기술

- **Node.js** 18+
- **MCP SDK** ^1.12.0
- **ES Modules** (type: "module")

### 개발 모드 실행

```bash
npm run dev  # nodemon으로 자동 재시작
```

## 🤝 기여하기

1. Fork 후 브랜치 생성
2. 변경사항 커밋
3. Pull Request 제출

## 🎯 팀 사용 팁

### 프로젝트별 설정

각자의 작업 환경에 맞게 `.env` 파일을 설정하여 필요한 폴더만 접근하도록 설정하세요.

### 공통 명령어 가이드

팀 내에서 자주 사용하는 명령어 패턴을 공유하여 일관성 있게 사용하세요.

### 보안 주의사항

- 민감한 파일이 포함된 폴더는 `ALLOWED_PATHS`에서 제외
- 프로덕션 서버에서는 사용 금지
- 개인 개발 환경에서만 사용 권장

### By.YoonPro

**Happy Coding! 🚀**
