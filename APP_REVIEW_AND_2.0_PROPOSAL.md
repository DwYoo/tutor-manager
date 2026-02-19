# 과외 매니저 - 종합 리뷰 및 2.0 제안서

> **작성일:** 2026-02-19
> **대상:** 과외 매니저 v1.x (현재 코드베이스)
> **목적:** 체계적 현황 분석 + v2.0 개선 제안

---

## 목차

1. [현황 요약](#1-현황-요약)
2. [UI 리뷰 및 2.0 제안](#2-ui-리뷰-및-20-제안)
3. [UX 리뷰 및 2.0 제안](#3-ux-리뷰-및-20-제안)
4. [기능 리뷰 및 2.0 제안](#4-기능-리뷰-및-20-제안)
5. [코드 품질 리뷰 및 2.0 제안](#5-코드-품질-리뷰-및-20-제안)
6. [성능 리뷰 및 2.0 제안](#6-성능-리뷰-및-20-제안)
7. [보안 리뷰 및 2.0 제안](#7-보안-리뷰-및-20-제안)
8. [아키텍처 리뷰 및 2.0 제안](#8-아키텍처-리뷰-및-20-제안)
9. [우선순위 로드맵](#9-우선순위-로드맵)

---

## 1. 현황 요약

### 기술 스택
| 항목 | 현재 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + React 19 |
| 언어 | JavaScript (TypeScript 미사용) |
| 백엔드/DB | Supabase (Auth + PostgreSQL + Storage) |
| 스타일링 | 99% 인라인 스타일 + 소량 Tailwind v4 |
| 차트 | Recharts 3.7 |
| PDF | jsPDF + html2canvas (동적 import) |
| UI 라이브러리 | **없음** — 모든 컴포넌트 자체 구현 |
| 상태 관리 | useState 직접 사용 (글로벌 상태 관리 없음) |
| 아이콘 | 인라인 SVG 직접 작성 |

### 페이지 구조
```
/                    → 대시보드 리다이렉트
/(app)/dashboard     → 대시보드 (커스텀 블록 레이아웃)
/(app)/schedule      → 시간표 (주간/월간)
/(app)/students      → 학생 목록
/(app)/students/[id] → 학생 상세 (4개 메인탭, 10개 서브탭)
/(app)/tuition       → 수업료 관리
/share/[token]       → 학부모 공유 뷰 (비인증)
```

### 핵심 지표 (코드 규모)
| 파일 | 라인 수 | useState 개수 |
|------|---------|--------------|
| StudentDetail.jsx | 1,238줄 | 39개 |
| ShareView.jsx | 905줄 | — |
| Tuition.jsx | 697줄 | — |
| Schedule.jsx | 591줄 | — |
| Dashboard.jsx | 462줄 | — |

---

## 2. UI 리뷰 및 2.0 제안

### 2.1 현황 분석

#### 잘 된 점
- **일관된 색상 체계:** `Colors.js`에 시멘틱 색상 토큰 정의 (bg, sf, ac, dn, wn 등)
- **학생별 색상 구분:** 8가지 색상 스킴(`SC`)으로 시간표에서 학생 시각 구분
- **모바일 최적화 기반:** Bottom sheet 모달, 스와이프 네비게이션, safe-area 지원
- **Pretendard 폰트:** 한국어에 최적화된 웹폰트 선택
- **커스텀 대시보드:** 드래그 앤 드롭 블록 재배치 기능

#### 문제점

**P1: 인라인 스타일 100% 의존 — 유지보수 불가**
```js
// 모든 컴포넌트에서 반복되는 패턴
const ls = { display:"block", fontSize:12, fontWeight:500, color:C.tt, marginBottom:6 };
const is = { width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.bd}` };
```
- 동일한 스타일 객체가 5개 이상 파일에 복붙
- hover, focus, media query 등 pseudo-class/element 표현 불가 → `<style>` 태그 삽입으로 우회
- 스타일이 JSX와 뒤섞여 가독성 저하

**P2: 매 렌더링마다 `<style>` 태그 재삽입**
```js
// Dashboard.jsx, Schedule.jsx, StudentDetail.jsx 등 모든 주요 컴포넌트
<style>{`.hcard{transition:all .12s;...}@media(max-width:768px){...}`}</style>
```
- CSS 중복 주입, 스타일 깜빡임 가능성, 성능 영향

**P3: 아이콘 시스템 부재**
- 모든 아이콘이 인라인 SVG로 하드코딩
- 크기/색상 변경 시 매번 SVG 수정 필요
- 일관성 유지 어려움

**P4: 접근성(A11y) 미흡**
| 항목 | 현황 |
|------|------|
| `<label htmlFor>` | 없음 — 폼 라벨 연결 안됨 |
| `role="dialog"` / `aria-modal` | 모든 모달에 없음 |
| 포커스 트래핑 | 모달 내 포커스 탈출 가능 |
| 키보드 네비게이션 | 커스텀 드롭다운에 없음 |
| 색상 대비 | `C.tt (#A8A29E)` 대비율 2.9:1 (WCAG AA 미달) |
| 드래그 앤 드롭 | 키보드 대체 수단 없음 |
| Skip links | 없음 |

**P5: 반응형 설계에 "중간 사이즈" 부재**
- 768px 기준 모바일/데스크탑 2단계만 존재
- 태블릿(768px~1024px) 영역에서 레이아웃 어색

### 2.2 v2.0 제안

#### A. 디자인 시스템 구축
```
components/ui/
  Button.jsx        — 크기(sm/md/lg), 변형(primary/secondary/ghost/danger)
  Input.jsx         — 라벨, 에러 메시지, 도움말 통합
  Select.jsx        — 네이티브 + 커스텀 드롭다운 통합
  Modal.jsx         — 포커스 트래핑, ESC 닫기, aria-modal 내장
  ConfirmDialog.jsx — confirm() 대체, 비동기 응답
  Toast.jsx         — 기존 유지 + 개선
  Badge.jsx         — 상태/카테고리 뱃지 통합
  Card.jsx          — 기본 카드 컨테이너
  Tabs.jsx          — 탭 네비게이션 통합 (mainTab/subTab 패턴 표준화)
  Avatar.jsx        — 이니셜/이미지 아바타
  Skeleton.jsx      — 로딩 스켈레톤
  EmptyState.jsx    — 데이터 없음 상태 표준화
```

#### B. 스타일링 전면 교체
- **인라인 스타일 → Tailwind CSS 전환** (이미 설치되어 있으나 미사용)
- 색상 토큰을 Tailwind 테마에 통합 (`tailwind.config`에 `Colors.js` 매핑)
- 반응형 중간 브레이크포인트 추가: `sm(640px)`, `md(768px)`, `lg(1024px)`, `xl(1280px)`
- `<style>` 태그 전면 제거 → Tailwind `@apply` 또는 CSS Modules로 대체

#### C. 아이콘 시스템
- `lucide-react` 도입 (트리쉐이킹 지원, 일관된 스타일)
- 또는 현재 인라인 SVG를 `Icons.js`에 통합하고 props로 size/color 제어

#### D. 접근성 전면 개선
| 항목 | 조치 |
|------|------|
| 모든 `<input>` | `<label htmlFor={id}>` 연결 |
| 모든 모달 | `role="dialog"`, `aria-modal="true"`, 포커스 트래핑 |
| 커스텀 드롭다운 | `role="listbox"`, 화살표 키 네비게이션, `aria-expanded` |
| 색상 대비 | `C.tt`를 `#6B7280` 이상으로 변경 (4.5:1 이상) |
| 드래그 앤 드롭 | 화살표 키 대체 또는 "이동" 버튼 추가 |
| 스크린 리더 | 상태 변경 시 `aria-live` 리전 활용 |

#### E. 로딩/빈 상태 개선
- **현재:** "불러오는 중..." 텍스트만 표시
- **2.0:** 스켈레톤 UI (대시보드 블록, 학생 카드, 시간표 슬롯 등)
- **빈 상태:** 일러스트 + 안내 메시지 + CTA 버튼 (예: "첫 학생을 등록해보세요")

---

## 3. UX 리뷰 및 2.0 제안

### 3.1 현황 분석

#### 잘 된 점
- **직관적 네비게이션:** 4개 메인 메뉴, 모바일 하단 네비게이션
- **컨텍스트 메뉴:** 우클릭(데스크탑)/롱프레스(모바일) 지원
- **Undo 지원:** 시간표에서 Ctrl+Z 되돌리기
- **딥링크:** 학생 상세 탭을 URL 쿼리 파라미터로 공유 가능
- **드래그 생성/이동:** 시간표에서 직관적 수업 추가/이동
- **자동 상태 계산:** 시간 기반 수업 상태 자동 전환 (예정→진행중→완료)
- **학부모 공유:** 토큰 기반 공유 링크, 세밀한 권한 설정

#### 문제점

**P1: 학생 상세 페이지 과부하**
- 4개 메인탭 × 10개 서브탭 → 사용자가 원하는 정보 찾기 어려움
- 1,238줄의 단일 컴포넌트 → 모든 탭이 동시에 상태 공유
- 탭 전환 시 전체 컴포넌트 리렌더

**P2: 데이터 입력 동선 비효율**
- 수업 기록을 위해: 시간표 클릭 → 모달 열기 → 탭 전환(계획/내용/피드백/숙제/자료) → 저장
- 각 탭 전환마다 컨텍스트 잃음
- 자주 쓰는 "수업 내용 + 숙제" 조합을 한 화면에서 보기 어려움

**P3: `confirm()` 사용으로 인한 UX 단절**
- 학생 삭제, 학습 계획 삭제 등에서 브라우저 네이티브 confirm 사용
- 스타일링 불가, 모바일에서 어색, 접근성 문제
- 앱의 나머지 UI와 시각적 불일치

**P4: 에러 복구 경로 부족**
- 데이터 로딩 실패 시 "다시 시도" 버튼만 존재
- 부분 실패 시 어떤 데이터가 저장되었고 안 되었는지 알 수 없음
- 오프라인 상태 감지 및 안내 없음

**P5: 온보딩/가이드 없음**
- 첫 사용자에게 아무런 안내 없이 빈 대시보드 표시
- 복잡한 기능(반복 수업, SWOT 분석, 공유 설정)에 대한 설명 없음

**P6: 검색/필터 기능 분산**
- 학생 목록: 이름/과목/학교 검색만 지원
- 시간표: 학생 필터 없음 (특정 학생 수업만 보기 불가)
- 수업 기록: 전체 텍스트 검색 불가
- 글로벌 검색 없음

**P7: 숙제 관리 UX 개선 필요**
- 학생 상세 → 학습 관리 → 숙제 탭으로 3단계 진입
- 전체 학생의 미완료 숙제 한눈에 보기 어려움
- 학부모가 숙제 완료율만 수정 가능 — 코멘트/사진 첨부 불가

### 3.2 v2.0 제안

#### A. 학생 상세 페이지 재구성
```
현재 (중첩 탭 구조):
  메인탭 → 서브탭 → 콘텐츠

2.0 제안 (플랫 네비게이션 + 섹션):
  학생 프로필 헤더 (항상 보임: 이름, 과목, 학교, 다음 수업)
  ├── 수업 이력 (타임라인 - 기본 뷰)
  ├── 수업 일정 (캘린더)
  ├── 숙제 현황
  ├── 오답 노트
  ├── 교재 관리
  ├── 성적 분석
  ├── 학습 전략 (SWOT)
  └── 자료실
```
- 좌측 사이드바 또는 상단 수평 탭으로 플랫화 (중첩 제거)
- 각 섹션을 독립 컴포넌트로 분리 → lazy loading

#### B. 빠른 수업 기록 모드
- 수업 종료 후 바로 "빠른 기록" 모달: 수업 내용 + 숙제 + 피드백 한 화면
- 대시보드 "기록 미완료" 블록에서 원클릭 기록 시작
- 자주 사용하는 템플릿 저장 기능

#### C. 글로벌 검색 (Cmd+K / Ctrl+K)
```
검색 대상:
  - 학생 이름
  - 수업 내용/주제
  - 숙제 내용
  - 오답 문제 번호
  - 교재명
빠른 액션:
  - "수업 추가" → 시간표 모달
  - "학생 추가" → 학생 등록 모달
  - "수업료 확인" → 수업료 페이지
```

#### D. 온보딩 플로우
1. 첫 로그인 → 환영 화면 + 기본 설정 (이름, 수업 시간 기본값)
2. 첫 학생 등록 가이드 (단계별 하이라이트)
3. 주요 기능 투어 (시간표 드래그, 숙제 관리, 공유 링크)
4. "도움말" 버튼으로 언제든 다시 볼 수 있음

#### E. 오프라인/네트워크 상태 대응
- 네트워크 상태 감지 → 상단 배너 "오프라인 상태입니다"
- 미저장 변경사항 로컬 큐잉 → 복구 시 자동 동기화
- 중요 데이터 변경 시 낙관적 업데이트 + 실패 시 롤백

#### F. 알림/리마인더 시스템
- 수업 30분 전 브라우저 알림 (Push Notification API)
- 미기록 수업 리마인더 (매일 저녁)
- 수업료 미수금 리마인더 (월말)
- 학부모 리포트 발송 리마인더

---

## 4. 기능 리뷰 및 2.0 제안

### 4.1 현황 분석

#### 잘 된 점
- **대시보드:** 커스터마이징 가능한 블록 시스템, 다가오는 수업/미기록 수업/주의 학생 등 핵심 정보
- **시간표:** 드래그 생성/이동, 반복 수업, 예외 처리, Undo/Redo
- **학생 관리:** 드래그 순서 변경, 보관(아카이브), SWOT 분석
- **오답 관리:** 챕터별 그룹핑, 벌크 선택, 이유 분류
- **수업료:** 자동/수동 계산 토글, 현금영수증 생성, CSV 내보내기
- **공유 링크:** 8개 세밀한 권한 토글, 학부모 숙제 수정 가능
- **PDF 리포트:** 학생별 종합 리포트 생성

#### 누락/개선 필요 기능

**P1: 반복 수업 관리 복잡성**
- 반복 수업이 단일 DB 레코드 + 예외 배열로 저장
- 하나의 회차를 수정하면 별도 레코드로 "실체화(materialize)"
- 반복 수업 전체 수정 (시간 변경 등) UX 불명확

**P2: 수업료 월별 데이터 격리 부족**
- 전체 수업 데이터를 로드 후 JS에서 월별 필터링
- 이전 달 수업료 변경 시 사이드 이펙트 추적 어려움

**P3: 학부모 커뮤니케이션 수단 제한**
- 공유 링크는 읽기 전용 (숙제 완료율 제외)
- 학부모 코멘트/메시지 기능 없음
- 학부모에게 리포트를 "보내는" 기능 없음 (링크 공유만 가능)

**P4: 데이터 내보내기/백업 미흡**
- 수업료만 CSV 내보내기 가능
- 전체 데이터 백업/복원 기능 없음
- 다른 앱에서 데이터 가져오기(import) 불가

### 4.2 v2.0 제안

#### A. 반복 수업 개선
```
옵션 1: "이 수업만 수정" / "이후 모든 수업 수정" / "모든 수업 수정"
  → Google Calendar 방식 3지선다

옵션 2: 반복 수업 "시리즈" 관리 페이지
  → 시리즈별 시간/요일 변경, 특정 기간 일시 중지, 종료일 설정
```

#### B. 학부모 포털 확장
```
현재: 읽기 전용 공유 링크 + 숙제 완료율 수정
2.0:
  - 학부모 코멘트/질문 남기기
  - 수업 사진/자료 확인 및 다운로드
  - 다음 수업 일정 캘린더 연동 (.ics 파일)
  - 수업료 납부 내역 확인
  - 학부모 피드백 폼 (수업 만족도, 요청사항)
  - 카카오톡/이메일 알림 발송 (리포트 업데이트 시)
```

#### C. 수업 템플릿
- 과목별/유형별 수업 템플릿 저장
- 수업 계획 작성 시 템플릿 선택 → 자동 채움
- 공통 숙제 유형 프리셋 (예: "교재 p.XX~XX", "복습 노트 정리")

#### D. 통계/분석 강화
```
현재: 주간 수업 바 차트, 성적 추이, 오답 분포
2.0:
  - 월별/분기별 수업 이행률 추이
  - 학생별 성적 상승/하락 트렌드 알림
  - 과목별 수업 시간 분포
  - 수입 추이 차트 (월별, 분기별, 연간)
  - 학생 유지율 (신규/탈퇴 추적)
  - 수업 취소율 분석
  - 학생 간 성적 비교 (익명화)
```

#### E. 데이터 관리
- **전체 데이터 내보내기:** JSON/Excel 형식, 모든 테이블 포함
- **데이터 가져오기:** CSV/Excel에서 학생/수업 데이터 import
- **자동 백업:** 주간 자동 백업 이메일 발송 옵션
- **계정 데이터 삭제:** GDPR 스타일 "모든 데이터 삭제" 기능

#### F. 다중 과목/다중 선생님 지원
```
현재: 단일 선생님 → 다수 학생 구조
2.0 옵션:
  - 학생당 다중 과목 지원 (수학 + 영어를 별도 트래킹)
  - 팀 모드: 여러 선생님이 한 대시보드 공유 (선택적)
```

---

## 5. 코드 품질 리뷰 및 2.0 제안

### 5.1 현황 분석 — 심각한 문제

#### C1: 초대형 단일 컴포넌트 (SRP 위반)
| 파일 | 라인 | 책임 |
|------|------|------|
| `StudentDetail.jsx` | 1,238줄 | 수업, 성적, 오답, 리포트, 학습계획, 교재, 파일, 공유, PDF — **9가지 기능** |
| `ShareView.jsx` | 905줄 | StudentDetail의 공유 버전 — 로직 대부분 복붙 |
| `Tuition.jsx` | 697줄 | 수업료 테이블, 차트, 영수증, 파일관리 — **4가지 기능** |
| `Schedule.jsx` | 591줄 | 주간/월간 뷰, 드래그, 컨텍스트 메뉴, 모달 — **4가지 기능** |

#### C2: 코드 중복 (DRY 위반)
- `updDetail()` 함수: Dashboard, Schedule, StudentDetail에서 **3회 복붙**
- `countLessons()` 로직: Dashboard, Tuition에서 **2회 복붙**
- `mkLes()` 데이터 변환: 3개 컴포넌트에서 유사 패턴 반복
- 인라인 스타일 객체 (`ls`, `is`): 5개 이상 파일에서 동일 정의

#### C3: 변수명 가독성 극히 낮음
```js
// 실제 코드 예시
const mkLes = l => ({...l, sh:l.start_hour, sm:l.start_min, dur:l.duration, sub:l.subject, top:l.topic})
const y2m = y => stH*60 + Math.round(y/SHT)*SMN;
const x2d = (x,r) => {...}
// BN, DFL, sF, sRes, lRes, tRes, scRes, tbRes, al, dl, co, nW, gL, gCo 등
```
- 코드 리뷰, 디버깅, 신규 개발자 온보딩에 심각한 장벽

#### C4: React Hook 사용 문제
- `StudentDetail.jsx`: 39개 개별 `useState` — 관련 상태 그루핑 안됨
- `Schedule.jsx`: `undoToastTimer.current` cleanup 누락 → 언마운트 후 `setState` 호출 가능
- `StudentDetail.jsx` line 197: `wTimers.current` debounce 타이머 언마운트 후에도 Supabase 호출
- `useCallback`/`useMemo` 거의 미사용 → 매 렌더마다 함수 재생성

#### C5: Deprecated API 사용
```js
// lib/utils.js
document.execCommand('insertText', false, text);  // Deprecated
```

### 5.2 v2.0 제안

#### A. 컴포넌트 분리 계획
```
StudentDetail.jsx (1,238줄) → 분리:
  StudentDetail/
    index.jsx            — 라우팅/탭 컨테이너 (~100줄)
    LessonTimeline.jsx   — 수업 타임라인
    LessonCalendar.jsx   — 수업 캘린더
    HomeworkPanel.jsx     — 숙제 관리
    WrongAnswers.jsx      — 오답 관리
    Textbooks.jsx         — 교재 관리
    ScoreAnalysis.jsx     — 성적 분석/차트
    StudyPlan.jsx         — SWOT/학습 전략
    FileArchive.jsx       — 자료실
    ShareSettings.jsx     — 공유 설정 모달
    PDFExport.jsx         — PDF 리포트 생성
    hooks/
      useStudentData.js   — 데이터 페칭 통합
      useLessonUpdate.js  — 수업 업데이트 로직 (중복 제거)

Schedule.jsx (591줄) → 분리:
  Schedule/
    index.jsx            — 컨테이너
    WeekView.jsx         — 주간 뷰
    MonthView.jsx        — 월간 뷰
    LessonBlock.jsx      — 개별 수업 블록
    ScheduleModal.jsx    — 수업 추가/수정 모달
    ContextMenu.jsx      — 컨텍스트 메뉴
    hooks/
      useDragLesson.js   — 드래그 로직
      useScheduleData.js — 데이터 페칭
```

#### B. 공통 로직 추출
```js
// hooks/useLessonUpdate.js — 3곳에서 중복된 updDetail 통합
export function useLessonUpdate(lessons, setLessons, toast) {
  return useCallback(async (id, data) => {
    // 통합된 업데이트 로직
  }, [lessons]);
}

// hooks/useLessonCount.js — 2곳에서 중복된 countLessons 통합
export function useLessonCount(lessons) {
  return useCallback((studentId, year, month) => {
    // 통합된 카운트 로직
  }, [lessons]);
}
```

#### C. TypeScript 점진적 도입
```
Phase 1: 타입 정의 (types/)
  types/student.ts     — Student, StudentFormData
  types/lesson.ts      — Lesson, LessonFormData, HomeworkItem
  types/tuition.ts     — TuitionRecord
  types/score.ts       — Score, WrongAnswer
  types/share.ts       — SharePermissions

Phase 2: 신규 코드 TS로 작성
  새로 분리하는 컴포넌트와 훅은 .tsx/.ts로 작성

Phase 3: 기존 코드 점진적 변환
  jsconfig.json → tsconfig.json (allowJs: true)
  파일별 .js → .ts 변환
```

#### D. 변수명 개선 가이드
```js
// Before
const mkLes = l => ({...l, sh:l.start_hour, sm:l.start_min, dur:l.duration})
const y2m = y => stH*60+Math.round(y/SHT)*SMN

// After
const toLessonViewModel = (lesson) => ({
  ...lesson,
  startHour: lesson.start_hour,
  startMin: lesson.start_min,
  duration: lesson.duration,
})
const pixelToMinutes = (y) => startHour * 60 + Math.round(y / SLOT_HEIGHT) * SLOT_MINUTES
```

---

## 6. 성능 리뷰 및 2.0 제안

### 6.1 현황 분석

#### PR1: O(일수 × 수업수) 연산 매 렌더마다 실행 [심각]
```js
// Dashboard.jsx — 모든 활성 학생 × 월의 모든 날 × 전체 수업 배열 순회
const countMonthLessons = (sid) => {
  const dim = new Date(year, month, 0).getDate();  // 28~31
  let cnt = 0;
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(year, month-1, d);
    cnt += lessons.filter(l => l.student_id === sid && lessonOnDate(l, dt)).length;
  }
  return cnt;
};
```
- 학생 10명 × 31일 = **310번** `filter` 호출/렌더
- `useMemo` 없이 매 렌더마다 재계산
- Tuition.jsx에서도 동일 패턴 반복

#### PR2: `select('*')` — 불필요한 데이터 과다 로드
```js
// 시간표에서 수업 목록 로드 시 모든 컬럼 + 중첩 관계 로드
supabase.from('lessons').select('*, homework(*), files(*)')
// content, feedback, private_memo 등 대용량 텍스트 컬럼 포함
// 시간표에서는 date, start_hour, start_min, duration, subject만 필요
```

#### PR3: Recharts 정적 import (번들 ~300KB)
```js
// Dashboard.jsx — 첫 로드에 포함
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
// StudentDetail.jsx — 역시 정적
import { AreaChart, Area, XAxis, ... } from 'recharts'
```

#### PR4: 페이지 간 데이터 공유 없음
- Dashboard → Schedule → Students 이동 시 매번 전체 데이터 재요청
- 동일한 `lessons`, `students`, `textbooks` 테이블을 4개 페이지에서 독립 fetch

#### PR5: 드래그 중 매 픽셀마다 `setLessons` 호출
```js
// Schedule.jsx — mousemove 이벤트 핸들러
const mv = ev => {
  setLessons(p => p.map(x => x.id === l.id ? {...x, ...lastPos} : x));
};
window.addEventListener("mousemove", mv);  // 스로틀 없음
```

#### PR6: 60초 인터벌 전체 컴포넌트 리렌더
```js
// Schedule.jsx, StudentDetail.jsx
useEffect(() => {
  const iv = setInterval(() => setTick(t => t+1), 60000);
  return () => clearInterval(iv);
}, []);
```
- 1,238줄 컴포넌트가 60초마다 전체 리렌더
- 실제 변경이 필요한 부분은 수업 상태 뱃지뿐

### 6.2 v2.0 제안

#### A. 데이터 캐싱 레이어 도입
```
옵션 1: React Query (TanStack Query) [권장]
  - 자동 캐싱, 재검증, 중복 요청 방지
  - staleTime 설정으로 불필요한 재요청 방지
  - 페이지 간 캐시 공유

옵션 2: Zustand + SWR 패턴
  - 가벼운 전역 스토어
  - 선택적 구독으로 불필요한 리렌더 방지
```

```js
// 예시: React Query 적용
function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: () => supabase.from('students').select('id, name, subject, grade, school, color_index, archived'),
    staleTime: 5 * 60 * 1000, // 5분
  });
}

function useLessonsForSchedule(weekStart, weekEnd) {
  return useQuery({
    queryKey: ['lessons', 'schedule', weekStart, weekEnd],
    queryFn: () => supabase.from('lessons')
      .select('id, student_id, date, start_hour, start_min, duration, subject, status, is_recurring, recurring_day')
      .gte('date', weekStart)
      .lte('date', weekEnd),
  });
}
```

#### B. Supabase 쿼리 최적화
```sql
-- 현재: 전체 수업 로드 후 JS에서 월별 카운트
-- 2.0: SQL에서 직접 집계
CREATE OR REPLACE FUNCTION count_monthly_lessons(p_user_id uuid, p_year int, p_month int)
RETURNS TABLE (student_id uuid, lesson_count bigint)
AS $$
  SELECT student_id, count(*)
  FROM lessons
  WHERE user_id = p_user_id
    AND date >= make_date(p_year, p_month, 1)
    AND date < make_date(p_year, p_month, 1) + interval '1 month'
    AND status != 'cancelled'
  GROUP BY student_id
$$ LANGUAGE SQL;
```

#### C. 컬럼 프로젝션 적용
```js
// 시간표: 필요한 컬럼만
supabase.from('lessons').select('id, student_id, date, start_hour, start_min, duration, subject, status, topic')

// 학생 목록: 필요한 컬럼만
supabase.from('students').select('id, name, subject, grade, school, color_index, sort_order, archived')
```

#### D. Recharts 동적 import
```js
// 현재: 정적 import
import { BarChart, Bar } from 'recharts'

// 2.0: 동적 import
const WeekChart = dynamic(() => import('./blocks/WeekChart'), { ssr: false })
```

#### E. 드래그 성능 개선
```js
// 2.0: requestAnimationFrame 게이트
let rafId = null;
const mv = (ev) => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    // CSS transform으로 시각적 이동 (DOM reflow 없음)
    dragRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    rafId = null;
  });
};
// drop 시에만 setLessons 호출
```

#### F. 타이머 기반 리렌더 최적화
```js
// 2.0: 다음 상태 전환 시점까지만 타이머 설정
const nextTransition = useMemo(() => {
  // 현재 시간 기준 가장 가까운 수업 시작/종료 시점 계산
  return findNextStatusTransitionTime(lessons, new Date());
}, [lessons]);

useEffect(() => {
  if (!nextTransition) return;
  const ms = nextTransition - Date.now();
  const timer = setTimeout(() => setTick(t => t + 1), ms);
  return () => clearTimeout(timer);
}, [nextTransition]);
```

---

## 7. 보안 리뷰 및 2.0 제안

### 7.1 현황 분석

#### S1: XSS — 영수증 프린트 템플릿 [치명적]
```js
// Tuition.jsx lines 334-349
const makeR = (title) => `<div style="...">
  <td>${f.name || ''}</td>           // 학생 이름 — 이스케이프 없음
  <td>${f.subject || ''}</td>        // 과목명 — 이스케이프 없음
  <td>${f.etcLabel1 || ''}</td>      // 사용자 입력 — 이스케이프 없음
`;
// → document.write()로 새 창에 삽입
```
- 학생 이름에 `<script>` 태그 삽입 시 실행됨
- 사용자 정의 필드(`etcLabel1`, `etcLabel2`)는 직접 입력 가능

#### S2: 공유 링크 보안 취약 [높음]
- **토큰 만료 없음:** UUID 한번 생성되면 영구 유효
- **토큰 폐기 불가:** "링크 폐기" 기능 UI 없음
- **회전(rotation) 없음:** 자동 갱신 메커니즘 없음
- **비공개 메모 노출:** fallback 경로에서 `select('*')`로 `private_memo` 포함 로드

#### S3: 파일 업로드 검증 없음 [높음]
```js
// StudentDetail.jsx — 파일 확장자만 체크 (MIME 타입 무시)
const ext = file.name.split('.').pop().toLowerCase();
// 파일 크기 제한 없음
// MIME 타입 검증 없음
```

#### S4: RLS 단일 의존 [중간]
- 모든 API 호출이 Supabase anon key로 직접 수행
- 서버 사이드 API 라우트 없음 → 비즈니스 로직 검증 레이어 부재
- RLS 정책 오류 시 방어선 없음

#### S5: localStorage에 서명 이미지 저장 [낮음]
- base64 인코딩된 서명/도장 이미지가 localStorage에 저장
- XSS 공격 시 서명 이미지 탈취 가능

### 7.2 v2.0 제안

#### A. XSS 방지
```js
// HTML 이스케이프 유틸리티
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

// 영수증 템플릿에 적용
`<td>${escapeHtml(f.name || '')}</td>`
```
- **또는** DOMPurify 도입하여 모든 사용자 입력 sanitize
- **또는** 영수증을 React 컴포넌트로 렌더링 후 `react-to-print` 사용 (문자열 보간 제거)

#### B. 공유 링크 보안 강화
```
1. 토큰 만료: share_token_expires_at 컬럼 추가 (기본 30일)
2. 토큰 폐기: "링크 비활성화" 버튼 + share_token NULL 설정
3. 토큰 갱신: "새 링크 생성" → 이전 토큰 무효화
4. 비공개 필드 분리: RPC에서 private_memo, plan_*_private 제외 보장
5. 접근 로그: share_access_log 테이블로 접근 기록
```

#### C. 파일 업로드 보안
```js
// 2.0: 다중 검증
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) throw new Error('파일 크기 초과 (최대 10MB)');
  if (!ALLOWED_MIMES.includes(file.type)) throw new Error('지원하지 않는 파일 형식');
  // 추가: 매직 바이트 검증 (파일 헤더 확인)
}
```

#### D. API 라우트 레이어 추가
```
app/api/
  lessons/route.js     — 수업 CRUD (입력 검증 + 권한 확인)
  share/[token]/route.js — 공유 데이터 (비공개 필드 필터링 보장)
  upload/route.js      — 파일 업로드 (서버 사이드 검증)
  tuition/receipt/route.js — 영수증 생성 (서버 사이드 HTML 렌더링)
```
- Supabase 직접 호출 → Next.js API Route를 통한 간접 호출로 전환
- 서버에서 입력 검증, 비즈니스 로직 실행, 민감 필드 필터링

---

## 8. 아키텍처 리뷰 및 2.0 제안

### 8.1 현황 구조
```
현재 아키텍처:
  브라우저 ←→ Supabase (직접 통신)

  컴포넌트 → supabase.from('table').select('*') → DB
  컴포넌트 → supabase.storage.from('bucket').upload() → Storage
  컴포넌트 → supabase.auth.signInWithOAuth() → Auth
```

### 8.2 문제점
1. **API 추상화 없음:** 테이블명이 20개 이상 파일에 문자열로 분산
2. **비즈니스 로직이 컴포넌트에 내장:** 수업료 계산, 수업 상태 판정 등이 UI 코드와 혼재
3. **테스트 불가 구조:** 비즈니스 로직이 React 컴포넌트 내부에 있어 유닛 테스트 어려움
4. **데이터 변환 비일관:** `mkLes()` 등이 각 컴포넌트마다 다르게 정의

### 8.3 v2.0 아키텍처 제안

```
2.0 아키텍처:

  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   UI Layer   │    │ Logic Layer  │    │ Data Layer   │
  │  Components  │ ←→ │   Hooks +    │ ←→ │  Services +  │
  │  (Presentat.)│    │   Contexts   │    │  Repository  │
  └──────────────┘    └──────────────┘    └──────────────┘
                                                  ↕
                                          ┌──────────────┐
                                          │   Supabase   │
                                          │  (via API    │
                                          │   Routes)    │
                                          └──────────────┘
```

#### 디렉토리 구조 제안
```
src/
  app/                          — Next.js App Router 페이지
    (app)/
      dashboard/page.tsx
      schedule/page.tsx
      students/page.tsx
      students/[id]/page.tsx
      tuition/page.tsx
    share/[token]/page.tsx
    api/                        — API Routes (서버 사이드)
      lessons/route.ts
      students/route.ts
      tuition/route.ts
      share/route.ts
      upload/route.ts

  components/
    ui/                         — 디자인 시스템 (Button, Input, Modal 등)
    layout/                     — AppShell, Sidebar, BottomNav
    dashboard/                  — 대시보드 블록 컴포넌트
    schedule/                   — 시간표 관련 컴포넌트
    student/                    — 학생 상세 서브 컴포넌트
    tuition/                    — 수업료 관련 컴포넌트
    share/                      — 공유 뷰 컴포넌트

  hooks/                        — 커스텀 React 훅
    useStudents.ts
    useLessons.ts
    useTuition.ts
    useScores.ts
    useLessonUpdate.ts          — 3곳 중복 코드 통합
    useLessonCount.ts           — 2곳 중복 코드 통합
    useGlobalSearch.ts

  services/                     — 비즈니스 로직 (React 의존 없음)
    lessonService.ts            — 수업 상태 계산, 반복 수업 로직
    tuitionService.ts           — 수업료 계산 로직
    scheduleService.ts          — 충돌 감지, 시간 변환
    exportService.ts            — PDF, CSV 내보내기
    shareService.ts             — 공유 토큰 관리

  repositories/                 — 데이터 접근 레이어
    studentRepository.ts        — students 테이블 CRUD
    lessonRepository.ts         — lessons 테이블 + homework 관계
    tuitionRepository.ts        — tuition 테이블 CRUD
    scoreRepository.ts          — scores + wrong_answers 테이블
    fileRepository.ts           — Supabase Storage 관리

  types/                        — TypeScript 타입 정의
    student.ts
    lesson.ts
    tuition.ts
    score.ts
    share.ts

  lib/
    supabase.ts                 — Supabase 클라이언트 (설정 강화)
    constants.ts                — 색상, 상수 등
    utils.ts                    — 유틸리티 함수
    validators.ts               — 입력 검증 함수
```

---

## 9. 우선순위 로드맵

### Phase 1: 긴급 수정 (1~2주)
| # | 항목 | 심각도 | 영향 |
|---|------|--------|------|
| 1 | 영수증 XSS 수정 (HTML 이스케이프) | 치명적 | 보안 |
| 2 | 공유 링크에서 private_memo 필터링 | 높음 | 보안 |
| 3 | 파일 업로드 크기/MIME 검증 추가 | 높음 | 보안 |
| 4 | `confirm()` → 커스텀 ConfirmDialog 교체 | 중간 | UX |
| 5 | 공유 토큰 만료/폐기 기능 | 높음 | 보안 |

### Phase 2: 성능 개선 (2~4주)
| # | 항목 | 영향 |
|---|------|------|
| 1 | React Query 도입 + 데이터 캐싱 | 네트워크/렌더 성능 |
| 2 | `select('*')` → 필요 컬럼만 프로젝션 | 네트워크 페이로드 |
| 3 | 수업 카운트 SQL RPC 함수 전환 | CPU/렌더 성능 |
| 4 | Recharts 동적 import | 초기 로드 시간 |
| 5 | 드래그 `requestAnimationFrame` 적용 | UI 반응성 |

### Phase 3: 구조 개선 (4~8주)
| # | 항목 | 영향 |
|---|------|------|
| 1 | StudentDetail.jsx 분리 (9개 서브 컴포넌트) | 유지보수성 |
| 2 | 공통 로직 훅 추출 (updDetail, countLessons) | 코드 중복 제거 |
| 3 | 디자인 시스템 구축 (Button, Input, Modal 등) | UI 일관성 |
| 4 | 인라인 스타일 → Tailwind 전환 | 유지보수성 |
| 5 | API 라우트 레이어 추가 | 보안/아키텍처 |
| 6 | TypeScript 타입 정의 및 점진적 도입 | 안정성 |

### Phase 4: 신규 기능 (8~16주)
| # | 항목 | 가치 |
|---|------|------|
| 1 | 글로벌 검색 (Cmd+K) | 사용 효율 |
| 2 | 빠른 수업 기록 모드 | 핵심 워크플로우 개선 |
| 3 | 학부모 포털 확장 (코멘트, 알림) | 커뮤니케이션 |
| 4 | 브라우저 Push 알림 | 수업 리마인더 |
| 5 | 통계/분석 강화 (수업 이행률 추이, 수입 차트) | 인사이트 |
| 6 | 데이터 내보내기/가져오기 | 데이터 포터빌리티 |
| 7 | 온보딩 플로우 | 신규 사용자 경험 |
| 8 | 접근성 전면 개선 | 포용적 디자인 |

### Phase 5: 확장 기능 (선택적)
| # | 항목 | 가치 |
|---|------|------|
| 1 | 다중 과목 지원 | 유연성 |
| 2 | 팀/협업 모드 | 확장성 |
| 3 | 캘린더 연동 (Google Calendar) | 편의성 |
| 4 | 카카오톡 알림 연동 | 한국 사용자 편의 |
| 5 | 오프라인 모드 + 동기화 | 안정성 |
| 6 | 반복 수업 시리즈 관리 고도화 | 기능 완성도 |

---

## 부록: 점수표

| 영역 | 현재 점수 (10점) | 주요 감점 사유 |
|------|-----------------|---------------|
| **UI 디자인** | 6.5 | 인라인 스타일 유지보수 한계, 디자인 시스템 부재, 접근성 미흡 |
| **UX 설계** | 7.0 | 학생 상세 과부하, 온보딩 없음, 에러 복구 부족 |
| **기능 완성도** | 7.5 | 핵심 기능 대부분 구현됨, 학부모 소통/통계 보강 필요 |
| **코드 품질** | 4.0 | 초대형 컴포넌트, 코드 중복, 변수명 가독성, 타입 안전 없음 |
| **성능** | 4.5 | O(n²) 연산 반복, 데이터 과다 로드, 캐싱 없음, 리렌더 과다 |
| **보안** | 5.0 | XSS 취약점, 공유 링크 보안, 파일 업로드 검증 부재 |
| **아키텍처** | 4.5 | API 추상화 없음, 비즈니스 로직 분리 안됨, 테스트 불가 구조 |
| **전체 평균** | **5.6** | |

> **결론:** 과외 매니저는 기능적으로 매우 풍부하고 한국 과외 시장의 니즈를 잘 반영한 앱입니다.
> 하지만 코드 품질, 성능, 보안 면에서 기술 부채가 상당하며, 사용자 수 증가 시 심각한 문제가 될 수 있습니다.
> 2.0에서는 **보안 수정 → 성능 개선 → 구조 개선 → 신규 기능** 순서로 점진적으로 개선할 것을 권장합니다.
