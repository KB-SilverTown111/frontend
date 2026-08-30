# 프런트엔드 협업 규칙

## Git Flow

- `main`: QA가 끝난 배포 가능 코드
- `dev`: 기능 통합 브랜치
- `feat/*`: 기능 개발
- `fix/*`: 일반 버그 수정
- `hotfix/*`: 운영 긴급 수정

기능과 일반 수정은 최신 `dev`에서 작업 브랜치를 만들고 PR을 통해 `dev`로 병합합니다. QA가 끝나면 `dev`를 `main`으로 병합합니다. 긴급 수정은 `hotfix/*`에서 처리한 뒤 `main`과 `dev` 양쪽에 반영합니다.

브랜치 이름은 소문자와 숫자를 사용하고 `/` 또는 `-`로 구분합니다.

```text
feat/auth/login
feat/dashboard
fix/login
hotfix/oauth
```

## 개발 절차

1. Issue를 생성합니다.
2. 로컬 `dev`를 최신 상태로 갱신합니다.
3. `feat/*`, `fix/*` 또는 `hotfix/*` 브랜치를 생성합니다.
4. 구현 후 로컬 검증과 포맷팅을 수행합니다.
5. 커밋하고 작업 브랜치를 Push합니다.
6. `dev` 대상 Pull Request를 생성합니다.
7. CI 통과와 팀원 1명 이상의 승인을 받은 뒤 병합합니다.
8. 병합된 작업 브랜치를 삭제합니다.

`main`과 `dev`에는 직접 Push하지 않습니다.

## 커밋 메시지

```text
Feat: 새로운 기능 추가
Fix: 버그 수정
Docs: 문서 수정
Refactor: 코드 리팩토링
Style: 코드 스타일 변경
Test: 테스트 추가 및 수정
Chore: 빌드, 설정, 라이브러리 변경
Remove: 사용하지 않는 코드나 파일 삭제
```

Gitmoji를 앞에 붙인 형식도 사용할 수 있습니다.

```text
✨ Feat: 카카오 OAuth 로그인 구현
🐛 Fix: JWT 토큰 오류 수정
```

커밋 메시지는 Husky의 `commit-msg` 훅과 CI에서 검사합니다. 대화형 커밋 도우미는 `npm run commit`으로 실행합니다.

## 코드 품질

```bash
npm ci
npm run lint
npm run format
npm run format:check
npm run build
```

커밋 시 lint-staged가 변경된 Vue/JavaScript 파일에 Prettier와 ESLint 수정을 적용합니다. Pull Request CI는 브랜치 흐름, 커밋 메시지, 전체 린트·포맷 및 빌드를 검사합니다.

VS Code로 저장소를 열면 Volar, Gitmoji, ESLint, Prettier 확장 설치가 추천됩니다. 저장 시 Prettier 포맷, ESLint 수정 및 Import 정리가 실행됩니다.

## Pull Request

- 기본 대상 브랜치는 `dev`입니다.
- 팀원 1명 이상의 승인이 필요합니다.
- 충돌은 PR 작성자가 해결합니다.
- 병합 전에 최신 `dev`를 반영합니다.
- CI가 통과해야 합니다.
- UI 변경이 있으면 스크린샷을 첨부합니다.
- 관련 Issue와 테스트 방법을 작성합니다.
