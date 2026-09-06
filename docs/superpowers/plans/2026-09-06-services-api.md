# 온보딩 제외 서비스·API 연결 구현 계획

> 설계: `docs/superpowers/specs/2026-09-06-services-api-design.md`
> 범위: 프론트엔드만. 백엔드 파일과 온보딩 흐름은 수정하지 않는다.

## 1. API 공통 기반 확장

**대상 파일**

- `src/api/client.js`
- `src/api/errors.js`
- 신규 `src/api/request.js` 또는 기존 클라이언트 보조 함수
- `scripts/service-api.test.mjs`

**작업**

1. Axios 공통 요청 옵션(멱등 키, multipart 헤더, query)을 재사용 가능한 작은 함수로 만든다.
2. 표준 오류 응답의 `code`, `message`, `requestId`, `fieldErrors`를 화면용 메시지로 안전하게 변환한다.
3. 인증 토큰을 기존 저장소에서 읽되 토큰/비밀번호/민감 요청 본문은 로그에 남기지 않는다.
4. API 단위 테스트에서 HTTP 메서드, 경로, 요청 본문, 멱등성 헤더를 검증한다.

## 2. 도메인 API 모듈

**신규 파일**

- `src/api/accounts.js`
- `src/api/transfers.js`
- `src/api/bills.js`
- `src/api/reminders.js`
- `src/api/mobileBranches.js`
- `src/api/voice.js`
- `src/api/profile.js`

**작업 순서**

1. 명세와 백엔드 DTO에 맞춰 각 함수의 요청 객체를 그대로 전달하고 응답 필드도 보존한다.
2. 송금 API는 prepare → amount validation → 조회/confirm/authenticate/execute/cancel, Risk Score·risk-check·guardian verification을 모두 제공한다.
3. 고지서 API는 이미지 `FormData` 업로드, 목록/월별 요약/상세, confirm, `Idempotency-Key`가 필요한 mock execute를 제공한다.
4. 생활금융 API는 reminders CRUD/snooze, mobile branch 목록/상세, account 목록을 제공한다.
5. 음성 API는 세션 생성/조회/종료, turn, events, speech-token, voice-settings를 제공한다.
6. 사용자 API는 `/users/me` 및 `/users/me/consents` 조회/수정을 제공한다.
7. 쓰기 API의 키 생성은 호출 시점마다 새 UUID를 만들고, 요청 자체 멱등인 voice-settings PUT에는 키를 붙이지 않는다.

## 3. 공유 서비스 스토어

**신규 파일**

- `src/stores/serviceData.js`
- `src/stores/transfer.js`
- `src/stores/bill.js`
- `src/stores/voice.js`

**작업**

1. loading/empty/error/success 상태와 마지막 요청의 오류를 명시적으로 관리한다.
2. transfer 스토어는 server status/currentStep/confirmationToken을 기준으로만 다음 동작을 허용한다.
3. bill 스토어는 촬영/선택 이미지와 OCR 후보/확인 토큰을 메모리에만 보관하고 화면 이탈·완료·취소 시 초기화한다.
4. voice 스토어는 sessionId와 서버 응답의 currentStep/status/tts/displayCard를 복원하고 REPLAY/INTERRUPTED를 기록한다.
5. 스토어 테스트는 성공·실패·만료·취소 전이를 최소 케이스로 검증한다.

## 4. production 화면 연결

**대상 파일**

- `src/views/ServiceRouteView.vue`
- `src/views/TransferHomeView.vue`
- `src/views/ServiceHomeView.vue`
- 필요 시 신규 `src/components/services/*`
- `src/styles/transfer.css` 또는 서비스 전용 스타일 파일

**작업**

1. 현재 Figma/프로토타입의 화면 ID와 문구를 유지하면서 API-backed 영역을 슬롯 형태로 추가한다.
2. 송금 화면은 계좌 선택, 연락처 후보, 금액 확인, Risk/보호자 확인, PIN, 최종 실행을 순서대로 연결한다. 실행 버튼은 서버 상태와 토큰이 준비된 경우에만 활성화한다.
3. 고지서 화면은 Capacitor 카메라/앨범 선택 후 OCR API를 호출하고, 후보 확인·수정·mock 납부 실행·결과/실패 화면으로 연결한다.
4. 생활금융 화면은 계좌 목록, 리마인더 생성/수정/취소/미루기, 이동점포 위치·상세, 프로필·동의·음성 설정을 API 응답으로 채운다. 위치 권한 거부 시 직접 지역 선택을 유지한다.
5. 음성 화면은 진입점별 세션 생성과 서버 상태 복구, STT 결과 전송, TTS/displayCard 표시, 다시 듣기/중단/종료를 연결한다. Speech 토큰 미설정·네트워크 실패는 텍스트 대체 안내로 표시한다.
6. 화면별 loading, empty, error, retry 상태와 접근 가능한 버튼 라벨을 제공한다.
7. 온보딩 라우트·스토어는 수정하지 않는다. 기존 `/prototype` 라우트와 컴포넌트도 production 화면에서 직접 사용하지 않는다.

## 5. 테스트 우선 순서

각 단계는 테스트를 먼저 추가한 후 구현한다.

1. `scripts/service-api.test.mjs`: API 모듈 요청 계약과 멱등성 헤더
2. `scripts/service-stores.test.mjs`: 상태 전이와 민감정보 초기화
3. `scripts/service-routes.test.mjs`: 모든 production 화면과 주요 액션 라우트
4. `npm run test:onboarding`: 온보딩 회귀 확인
5. `npm run lint`
6. `npm run format:check`
7. `npm run build`

## 6. 수동 확인

- `npm run dev`에서 로그인 후 송금/고지서/생활금융/음성 홈과 대표 API 화면을 확인한다.
- `VITE_API_BASE_URL`이 설정된 환경에서는 실제 백엔드 응답을, 미설정/실패 환경에서는 오류·빈 상태를 확인한다.
- Android는 웹 자산을 Capacitor에 동기화한 뒤 기기에서 카메라/권한과 입력 화면을 수동 확인한다.

## 7. 변경 제한

- 백엔드 디렉터리에는 파일을 수정하지 않는다.
- 사용자가 나중에 처리하기로 한 git stage/commit/push는 실행하지 않는다.
- API 계약에 없는 임의의 성공 응답이나 금융 실행을 추가하지 않는다.
