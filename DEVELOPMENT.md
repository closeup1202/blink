# Development Guide

## 프로젝트 구조

```
blink/
├── public/
│   ├── manifest.json          # Chrome Extension 설정
│   └── icons/                 # Extension 아이콘 (TODO)
│
├── src/
│   ├── background/            # Service Worker
│   │   └── index.ts          # 알림, 배지 관리
│   │
│   ├── content/               # LinkedIn 페이지 주입
│   │   ├── index.tsx         # 진입점
│   │   ├── observer.ts       # SPA 변화 감지 (MutationObserver)
│   │   └── utils/
│   │       ├── parser.ts     # 프로필 정보 파싱
│   │       └── dom.ts        # DOM 조작 헬퍼
│   │
│   ├── popup/                 # Extension Popup UI
│   │   ├── index.tsx         # 진입점
│   │   ├── App.tsx           # 메인 컴포넌트
│   │   └── components/
│   │       ├── ContactList.tsx
│   │       └── ContactCard.tsx
│   │
│   ├── storage/              # chrome.storage.local 래퍼
│   │   └── index.ts
│   │
│   ├── utils/                # 공통 유틸리티
│   │   ├── date.ts          # 날짜 관련 함수
│   │   └── status.ts        # 상태 관련 함수
│   │
│   ├── types/                # TypeScript 타입 정의
│   │   └── index.ts
│   │
│   └── styles/               # 글로벌 스타일
│       └── global.css
│
└── popup.html                # Popup HTML 진입점
```

## 주요 파일 설명

### `manifest.json`
Chrome Extension의 설정 파일. Manifest V3 기준으로 작성됨.

- `permissions`: storage, alarms
- `host_permissions`: LinkedIn 도메인
- `content_scripts`: LinkedIn 페이지에 주입
- `background`: Service Worker 설정

### `src/types/index.ts`
핵심 타입 정의:
- `FollowUpStatus`: 4가지 상태 (contacted, replied, meeting_booked, not_interested)
- `Contact`: 연락처 데이터 구조

### `src/storage/index.ts`
chrome.storage.local 래퍼. 모든 데이터 저장/조회는 여기를 통해 이루어짐.

### `src/background/index.ts`
Background Service Worker. 알람, 배지, overdue 체크 담당.

### `src/content/observer.ts`
**가장 중요한 파일 중 하나!**
LinkedIn SPA 변화를 감지하고 적절한 UI를 주입하는 로직.

## 개발 워크플로우

### 1. 개발 서버 실행

```bash
npm run dev
```

Vite의 HMR(Hot Module Replacement)이 작동하지만, Chrome Extension은 수동으로 새로고침 필요.

### 2. 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됨.

### 3. Chrome에서 테스트

1. `chrome://extensions/` 열기
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `dist/` 폴더 선택

### 4. 변경사항 적용

코드 변경 후:
1. `npm run build` 실행
2. `chrome://extensions/`에서 새로고침 버튼 클릭
3. LinkedIn 페이지 새로고침

## 다음 단계 (Day 4-6)

### 프로필 페이지에 Save Lead 패널 주입

**위치:** `src/content/observer.ts`의 `injectProfilePanel()` 함수

**TODO:**
1. LinkedIn 프로필 페이지의 우측 사이드바 찾기
2. Save Lead 패널 컴포넌트 생성
3. React 컴포넌트를 DOM에 주입
4. 프로필 정보 파싱 (`src/content/utils/parser.ts` 사용)
5. 저장 버튼 클릭 시 `storage.saveContact()` 호출

**참고 사항:**
- LinkedIn DOM 구조는 자주 변경될 수 있음
- `waitForElement()` 유틸 사용하여 요소 대기
- LinkedIn 프로필 URL을 고유 키로 사용

## LinkedIn DOM 셀렉터 (참고용, 변경될 수 있음)

```typescript
// 프로필 이름
'h1.text-heading-xlarge'

// 프로필 직함
'.text-body-medium.break-words'

// 우측 사이드바
'.pv-top-card-v2-ctas'

// 검색 결과 리스트
'.reusable-search__result-container'
```

## 디버깅 팁

### Content Script 디버깅
- LinkedIn 페이지에서 F12 → Console 탭
- `console.log()` 사용

### Background Script 디버깅
- `chrome://extensions/` → "서비스 워커" 클릭
- 별도 DevTools 창 열림

### Popup 디버깅
- Popup 열고 우클릭 → "검사"

## 주의사항

### LinkedIn 정책
- 자동화 금지 (자동 메시지 발송 등)
- 데이터 스크래핑 금지
- 사용자 명시적 동작에만 반응

### Chrome Web Store 정책
- 외부 서버로 데이터 전송 시 명시 필요
- 권한 최소화
- manifest.json에 명확한 설명 필요

## TypeScript 타입 체크

```bash
npm run type-check
```

## 빌드 최적화

Vite는 자동으로 다음을 처리:
- Code splitting
- Tree shaking
- Minification
- CSS 최적화

## 환경 변수 (v2+)

`.env` 파일 생성:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

사용:
```typescript
const url = import.meta.env.VITE_SUPABASE_URL
```

## 다음 마일스톤

- [ ] Day 4-6: Profile Panel 구현
- [ ] Day 7-9: Search Overlay 구현
- [ ] Day 10-12: Follow-up Logic 완성
- [ ] Day 13-14: Popup UI 폴리싱
- [ ] Chrome Web Store 제출
