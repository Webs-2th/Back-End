# Insta Community Backend

## 코드 요약
- Express 5 기반 REST API로 인증, 게시글, 댓글, 사용자, 업로드 도메인을 `routes -> controllers -> services` 레이어로 분리했습니다.
- 입력 검증은 Zod 스키마(`controllers/*.js`)와 커스텀 미들웨어를 사용하며, 예외 처리는 `middlewares/errorHandler.js`에서 공통 처리합니다.
- MySQL 연결 풀(`src/db/pool.js`)로 사용자/콘텐츠 데이터를 저장하며, bcrypt 기반 비밀번호 암호화, JWT 발급, nodemailer 이메일 전송 기능을 제공합니다.
- Swagger(OpenAPI) 스펙은 `docs/openapi.yaml`에 유지하며 `/docs` 엔드포인트에서 UI로 제공합니다.

## 프로젝트 구조 힌트
- `src/app.js`: 공통 미들웨어(helmet, morgan, JSON 파서)와 Swagger 경로를 등록합니다.
- `src/server.js`: 환경 변수(.env) 로드 후 서버를 기동하고 종료 시그널을 처리합니다.
- `src/routes/*.js`: auth/posts/comments/users/uploads 등 도메인별 라우터를 모읍니다.
- `sql/schema.sql`: 로컬 MySQL 인스턴스에 적용할 테이블 정의 스크립트입니다.

## 실행 전 준비
1. Node.js 18 LTS 이상과 npm을 설치합니다.
2. 의존성 설치: `npm install`
3. 환경 변수 파일을 준비합니다. 저장소의 `.env` 예시를 복사하거나 새로 만들어 아래 값을 채웁니다.
   - `PORT`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `JWT_SECRET`, `JWT_EXPIRES_IN`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - `APP_BASE_URL`, `UPLOAD_BASE_URL`
4. `sql/schema.sql`을 로컬 데이터베이스에 실행해 기본 스키마를 생성합니다.

## 서버 실행 방법
- 개발 모드(파일 변경 자동 반영):
  ```bash
  npm run dev
  ```
- 프로덕션 모드:
  ```bash
  npm start
  ```
서버가 기동되면 기본 포트는 `.env`의 `PORT`(기본값 4000)이며, 헬스 체크는 `GET /health`로 확인합니다.

## Swagger 확인 방법
1. 서버가 실행 중인지 확인합니다.
2. 브라우저에서 `http://localhost:4000/docs`(또는 설정한 포트)로 이동합니다.
3. 스펙을 수정하려면 `docs/openapi.yaml`을 업데이트하면 Swagger UI에 반영됩니다.

## .env 예시 (DB 연결 포함), 사전에 로컬 MySQL에 DB를 만들어놔야 함!!!
```env
PORT=4000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=로컬 mysql 비밀번호
MYSQL_DATABASE=로컬 mysql에 있는 DB 이름
JWT_SECRET=super-secret
JWT_EXPIRES_IN=15m
EMAIL_FROM=noreply@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-pass
APP_BASE_URL=http://localhost:4000
UPLOAD_BASE_URL=https://cdn.example.com
```
> DB 연결 시 `MYSQL_*` 값이 실제 로컬/운영 DB 설정과 일치해야 하며, 암호·비밀키는 안전한 값으로 교체하세요.
