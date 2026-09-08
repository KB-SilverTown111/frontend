# Vue 프론트엔드 기능별 구조 개편 설계

## 목표

귀 편한 금융 프론트엔드를 기능 단위로 이해하고 변경할 수 있는 구조로 재편한다. 라우터 진입점은 얇게 유지하고, 송금·고지서·생활금융·음성·온보딩의 화면과 상태를 각 기능 안에서 찾을 수 있게 한다.

## 현재 문제

- `src/views/ServiceRouteView.vue`에 송금, 고지서, 생활금융, 음성, 카메라, 위치, 리마인더, 라우팅, 화면 렌더링이 함께 있다.
- `src/views/OnboardingView.vue`에 단계별 마크업, 입력 처리, 검증, 주소 검색, OS 권한, 회원가입 제출이 함께 있다.
- `src/api`, `src/stores`, `src/services`가 기능별 책임을 가로질러 있어 특정 업무 흐름을 수정할 때 여러 전역 폴더를 찾아야 한다.
- `2-08`, `3-02` 같은 디자인 화면 번호가 라우트와 조건문에 직접 노출되어 화면 의미를 코드만 보고 알기 어렵다.
- `screenData`에는 화면 문구와 HTML 표현이 함께 있어 데이터 변경과 UI 변경의 경계가 약하다.

## 목표 구조

최상위는 `app`, `shared`, `features` 세 영역으로 나눈다.

- `app`: 앱 시작, 전역 초기화, 라우터, 전역 레이아웃만 둔다.
- `shared`: 기능을 알지 못하는 공통 API client, UI primitive, Capacitor adapter, 순수 유틸리티만 둔다.
- `features`: auth, onboarding, transfer, bills, living, voice, my-page를 업무 기능 단위로 둔다.
- 라우터 페이지는 각 feature의 `pages/` 아래에 두고, 실제 화면은 `components/` 또는 `screens/`에서 조합한다.
- API 호출은 같은 feature의 `api/`, Pinia 상태는 같은 feature의 `stores/`, 도메인 규칙은 `model/`, 부수 효과는 `services/`에 둔다.

## 화면 식별자 규칙

업무 코드와 URL에는 의미 있는 `screenKey`와 semantic route만 사용한다.

```text
/bills/scan
/bills/camera
/bills/review
/bills/payment
/bills/success

/transfer/recipient
/transfer/account
/transfer/amount
/transfer/confirm
/transfer/result
```

기존 디자인 번호는 화면 registry의 `designId`에만 보존한다. 백엔드 또는 분석 계약이 요구하지 않는 이상 컴포넌트, 스토어, 테스트, 라우트 조건문에서 숫자 ID를 사용하지 않는다.

## 의존 방향

```text
app → features → shared
pages → components / screens / stores
stores → api / model / services
shared → features를 참조하지 않음
```

기능 간 사용이 필요한 음성 기능은 `features/voice/index.js` 같은 공개 진입점을 통해서만 제공한다. 다른 기능이 음성 내부 파일을 직접 참조하지 않도록 한다.

## 보존할 계약

- 기존 백엔드 endpoint, HTTP method, request/response shape를 유지한다.
- 회원가입, 로그인, 송금 확인·인증·실행, 고지서 OCR·납부, 리마인더, 이동점포, 음성 흐름의 사용자 동작을 유지한다.
- 금융 실행 요청의 idempotency와 명시적 최종 확인을 유지한다.
- Capacitor 권한 거부·미지원 상태와 브라우저 fallback을 유지한다.
- 기존 테스트가 검증하는 접근성, senior-friendly UI, 오류 처리 동작을 유지한다.

## 완료 기준

- 2,000줄 이상인 라우트 화면 파일을 제거하고 업무별 page/screen/component로 분리한다.
- 숫자 화면 ID가 내부 라우트 조건과 테스트 이름에 남지 않는다. 디자인 추적용 `designId`는 registry에 한정한다.
- 기능 API·스토어·서비스가 해당 feature에서 발견된다.
- 기존 테스트와 새 구조 계약 테스트가 통과한다. 개편 전부터 실패한 테스트는 원인과 함께 별도 기록한다.
- `npm run lint`, `npm run build`, `npm run format:check` 결과를 PR에 기록한다.
