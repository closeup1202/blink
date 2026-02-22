# Blink — LinkedIn Follow-up Chrome Extension

**Version:** 1.0
**Created:** 2026-02-21
**Status:** Design Document

---

## 1. 프로젝트 비전

### 한 줄 정의
LinkedIn 탭을 벗어나지 않고 팔로업 리마인더와 상태 관리를 완결하는 초경량 Chrome Extension

### 핵심 가치 제안
> **"Never lose a deal because you forgot to follow up."**
> **"LinkedIn 탭을 벗어나지 않고 상태 관리까지 완결"**

이 제품은:
- ✅ 경량 팔로업 레이어
- ✅ 워크플로우 강화 도구
- ✅ 영업 메모리 어시스턴트

이 제품이 아닌 것:
- ❌ 풀 CRM 시스템
- ❌ 이메일 스크래퍼
- ❌ 자동화 봇
- ❌ LinkedIn 스팸 도구

---

## 2. 타겟 시장

### Primary Target
**Solo SaaS Founders & 1인 영업**

프로필:
- 1-5인 SaaS 팀 / 프리랜서 / 1인 영업
- 초기 단계 / 부트스트랩
- LinkedIn을 매일 사용
- Google Sheets/Notion으로 리드 관리
- 무거운 CRM 시스템 없음

### Secondary Target
- 개인 네트워커
- 취준생 (채용 담당자 팔로업)
- LinkedIn을 주 채널로 사용하지만 Surfe ($39-79/월)는 비싼 사람들

### 왜 이 세그먼트인가?
- 빠른 의사결정
- 카드 결제 가능한 구매자
- Indie Hacker 커뮤니티에서 활발
- 팔로업 의존도 높음
- CRM 세팅할 여유 없음

---

## 3. 핵심 문제

### 현재 워크플로우
1. LinkedIn에서 검색
2. 프로필 방문
3. 메시지 전송
4. Sheet/Notion에 기록
5. **팔로업 잊어버림** ← 핵심 문제

### Pain Points
- 팔로업 날짜 잊어버림
- LinkedIn ↔ CRM 사이 탭 전환
- 검색 결과에서 가시성 없음
- 수동 추적 피로
- **CRM 탭을 별도로 열어야 하는 워크플로우 단절**

---

## 4. 경쟁 분석

| 제품 | 가격 | 핵심 기능 | 약점 |
|---|---|---|---|
| **Surfe** | $39-79/user/month | 외부 CRM 연동, 데이터 enrichment | 비쌈, CRM 필요 |
| **Wiza** | $49+/month | 이메일/연락처 추출 | 데이터 수집 중심 |
| **Folk** | $20+/month | CRM + LinkedIn import | 별도 탭 필요 |
| **Hotline** | **$9/month** | **LinkedIn 위에서 자체 완결** | — |

### 차별화 포인트
Surfe/Wiza가 외부 CRM 연동과 데이터 수집에 집중하는 반면, Hotline은:
- LinkedIn 내에서 완결되는 워크플로우
- CRM 불필요
- 저렴한 가격
- 팔로업 특화

---

## 5. MVP 기능 범위 (Strict)

### Feature 1: Save Lead + Status
**상태 정의:**
```
🔵 Contacted      — 연락함
🟡 Replied        — 답장 받음
🟢 Meeting Booked — 미팅 잡힘
🔴 Not Interested — 관심 없음
```

### Feature 2: Follow-up Date & Reminder
- 다음 팔로업 날짜 선택
- 마지막 메시지 이후 X일 지나면 자동 overdue 감지
- 타임스탬프 비교만으로 구현 (AI 불필요)

### Feature 3: Search Result Overlay
LinkedIn 검색 결과에서:
- 상태 배지 표시
- Overdue 인디케이터
- 마지막 연락 정보

### MVP에서 제외
- ❌ AI 기능
- ❌ 자동화
- ❌ CRM 연동
- ❌ 팀 기능
- ❌ 백엔드 동기화 (v1)

---

## 6. 제품 로드맵

### MVP (v1.0) — Follow-up Reminder Engine
**목표:** LinkedIn 탭을 벗어나지 않고 팔로업 완결

핵심 기능:
- 프로필 페이지에서 Lead 저장
- 상태 관리 (4가지 상태)
- 타임스탬프 기반 팔로업 배지
- 로컬 저장 (chrome.storage.local)
- Popup UI로 저장된 연락처 목록 확인

### v2 — Pipeline Overlay
- 검색 결과 화면에서 상태 뱃지 표시 강화
- 색상으로 상태 구분
- Notes 기능 추가
- CRM 내보내기

### v3 — Relationship Memory Layer (유료)
- LinkedIn 메시지창 옆 히스토리 + 내부 메모
- Supabase 백엔드
- 클라우드 동기화
- 팀 모드
- Analytics 대시보드

---

## 7. 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| **Extension 표준** | Manifest V3 | Chrome 현재 표준 |
| **프레임워크** | React + Vite | Extension 템플릿 존재, 빠른 세팅 |
| **스타일** | Tailwind CSS | 빠른 UI 개발 |
| **데이터 저장** | chrome.storage.local | 백엔드 없이 로컬 저장, 개인정보 이슈 없음 |
| **언어** | TypeScript | 타입 안전성 |

**MVP는 백엔드 없이 로컬 저장만으로 완결.**
동기화 기능은 v2 이후 Supabase로 추가.

---

## 8. 데이터 모델

### Contact 타입 정의

```typescript
// src/types/index.ts

export type FollowUpStatus =
  | 'contacted'       // 🔵 Contacted
  | 'replied'         // 🟡 Replied
  | 'meeting_booked'  // 🟢 Meeting Booked
  | 'not_interested'  // 🔴 Not Interested

export interface Contact {
  id: string                 // LinkedIn profile URL (고유 키)
  name: string
  title: string
  company: string
  status: FollowUpStatus
  lastContactedAt: number    // timestamp (ms)
  nextFollowUpDate: number   // timestamp (ms)
  followUpAfterDays: number  // 며칠 후 리마인더 (default: 7)
  createdAt: number          // timestamp (ms)
  memo?: string              // v2 기능
}
```

**Profile URL을 고유 키로 사용하여 중복 방지.**

---

## 9. 폴더 구조

```
hotline/
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── src/
│   ├── background/
│   │   └── index.ts           # Service Worker — 알림 타이머
│   │
│   ├── content/
│   │   ├── index.tsx           # LinkedIn 페이지 진입점
│   │   ├── observer.ts         # MutationObserver — LinkedIn SPA 대응
│   │   ├── components/
│   │   │   ├── SaveLeadPanel.tsx   # 프로필에 주입되는 패널
│   │   │   └── StatusBadge.tsx     # 검색 결과 배지
│   │   └── utils/
│   │       ├── parser.ts           # 프로필 정보 파싱
│   │       └── dom.ts              # DOM 조작 유틸
│   │
│   ├── popup/
│   │   ├── index.tsx           # Popup 진입점
│   │   ├── App.tsx             # 메인 화면
│   │   └── components/
│   │       ├── ContactList.tsx     # 저장된 연락처 목록
│   │       └── ContactCard.tsx     # 개별 연락처 카드
│   │
│   ├── storage/
│   │   └── index.ts           # chrome.storage.local 래퍼
│   │
│   ├── utils/
│   │   ├── date.ts            # 날짜 관련 유틸리티
│   │   └── status.ts          # 상태 관련 유틸리티
│   │
│   └── types/
│       └── index.ts           # 공통 타입 정의
│
├── styles.css
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 10. UX 설계

### 1) Profile Page Panel (프로필 페이지)
**위치:** LinkedIn 프로필 우측 사이드바

주입되는 패널:
```
┌─────────────────────────────┐
│  💼 Save to Hotline         │
├─────────────────────────────┤
│  Status: [Dropdown ▼]       │
│  Follow-up in: [7] days     │
│  [Save Lead] 버튼            │
└─────────────────────────────┘
```

### 2) Search Results Overlay (검색 결과)
**위치:** 각 프로필 카드 위에 배지

```
John Doe                    🔵 Contacted
Founder @ Acme Inc.         Last: 3 days ago
───────────────────────────
Jane Smith                  🔴 OVERDUE!
CEO @ StartupXYZ            Follow up now
```

### 3) Popup UI
**위치:** Extension 아이콘 클릭 시

```
┌─────────────────────────────────────┐
│  Hotline                            │
├─────────────────────────────────────┤
│  🔴 Overdue (2)                     │
│  ├─ John Doe (5 days overdue)      │
│  └─ Jane Smith (2 days overdue)    │
│                                      │
│  🔵 Contacted (3)                   │
│  🟡 Replied (1)                     │
│  🟢 Meeting Booked (2)              │
└─────────────────────────────────────┘
```

---

## 11. 주요 기술 고려사항

### LinkedIn SPA 대응 (핵심 난관)
LinkedIn은 페이지 이동 시 전체 새로고침이 발생하지 않는 SPA 구조.

**해결책:**
- `observer.ts`에서 `MutationObserver`로 DOM 변화 감지
- URL 변경 감지 (`popstate`, `pushState` 가로채기)
- 배지를 재주입하는 로직 필수

**이것이 Content Script에서 가장 까다로운 구현 포인트.**

### 보안 & 개인정보
- MVP는 모든 데이터를 로컬(`chrome.storage.local`)에만 저장
- 외부 전송 없음
- Chrome Web Store 심사 통과 용이
- 개인정보 이슈 없음

### 성능
- 검색 결과 페이지에서 많은 프로필 카드 처리 시 성능 고려
- Debouncing/Throttling 적용
- Virtual scrolling (v2)

---

## 12. 개발 타임라인 (14일)

| Day | Task |
|-----|------|
| **1-3** | - Vite + React + Manifest V3 세팅<br>- LinkedIn DOM 분석<br>- 버튼 주입 테스트 |
| **4-6** | - chrome.storage.local 래퍼 구현<br>- Save Lead 기능 완성<br>- 데이터 저장/조회 로직 |
| **7-9** | - 검색 결과 overlay 렌더링<br>- MutationObserver 구현<br>- StatusBadge 컴포넌트 |
| **10-12** | - Follow-up 로직 & overdue 감지<br>- Background Service Worker<br>- 날짜 계산 유틸 |
| **13-14** | - Popup UI 완성<br>- 버그 수정<br>- Chrome Web Store 제출 준비 |

---

## 13. 수익화 전략

### Free Plan
- 최대 30개 리드
- 모든 핵심 기능 사용 가능

### Pro Plan ($9/month)
- 무제한 리드
- 조기 가격: $9/month
- 이후 $15/month로 인상 예정

### 가격 포지셔닝
| Competitor | Price | Hotline |
|---|---|---|
| Surfe | $39-79/mo | **5-8배 저렴** |
| Folk | $20/mo | **2배 저렴** |

---

## 14. Go-To-Market 전략

### First 50 Users
**채널:**
- IndieHackers
- Reddit (r/SaaS, r/Entrepreneur, r/startups)
- Twitter/X build-in-public
- Manual LinkedIn outreach (dogfooding!)

**메시징:**
> "Stop losing deals because you forgot to follow up."
> "LinkedIn CRM without leaving LinkedIn."

### Launch Checklist
- [ ] Product Hunt 런칭
- [ ] IndieHackers 포스트
- [ ] Reddit 커뮤니티 공유
- [ ] Twitter 빌드 스레드
- [ ] Chrome Web Store 최적화 (SEO)

---

## 15. 리스크 관리

### 주요 리스크
| 리스크 | 완화 방안 |
|---|---|
| **LinkedIn UI 변경** | MutationObserver로 동적 대응<br>버전 업데이트 프로세스 확립 |
| **LinkedIn 정책 제한** | 자동화 없음<br>스크래핑 없음<br>경량 overlay만 사용 |
| **차별화 부족** | "Follow-up specialist" 명확한 포지셔닝<br>가격 경쟁력 |

### 정책 준수
- ✅ LinkedIn 데이터를 외부 서버로 전송하지 않음
- ✅ 자동 메시지 발송 없음
- ✅ 사용자 명시적 동의하에만 저장
- ✅ Chrome Web Store 정책 준수

---

## 16. 성공 지표 (90일)

### Month 1 — Validation
- 50 beta users
- 20% retention
- NPS > 30

### Month 2 — Early Traction
- 100 paid users
- $900 MRR
- 30% retention

### Month 3 — Scale
- 200 paid users
- $1,800 MRR
- 40% retention

### Long-term Target
- $3,000+ MRR (scale)
- 500+ paid users
- 50%+ retention

---

## 17. 최종 포지셔닝

**This is not another CRM.**

**This is:**

> **"A lightweight outbound memory layer for LinkedIn."**
> **"LinkedIn을 CRM처럼 사용하게 해주는 초경량 레이어"**

---

## 18. Next Steps

1. ✅ 설계 문서 완료
2. ⬜ Vite + React + Manifest V3 프로젝트 세팅
3. ⬜ LinkedIn DOM 구조 분석 및 injection point 파악
4. ⬜ chrome.storage.local 기본 CRUD 구현
5. ⬜ Save Lead Panel 프로토타입
6. ⬜ MVP 개발 시작

---

**Document Version:** 1.0
**Last Updated:** 2026-02-21
**Status:** Ready for Development
