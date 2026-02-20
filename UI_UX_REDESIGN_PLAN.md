# 과외 매니저 — UI/UX 전면 개선 기획안

## 현황 요약

과외 매니저는 Next.js 16 + React 19 + Supabase 기반의 과외 관리 SaaS로, 대시보드/캘린더/학생관리/수업료관리 4개 핵심 모듈로 구성되어 있다. 커스텀 디자인 시스템(`components/ui/`)이 존재하나 실제 사용률이 낮고, 대부분의 페이지가 인라인 스타일과 `<style>` 태그 주입 방식으로 UI를 구성하고 있다.

---

## 1단계: 디자인 시스템 기반 정비

> 모든 후속 개선의 토대. 일관성과 유지보수성을 확보한다.

### 1-1. 디자인 토큰 통합 및 확장

**현재 문제:**
- 컬러 토큰이 `globals.css`(CSS 변수)와 `Colors.js`(JS 상수)에 이중 정의됨
- 간격(spacing), 모서리 반경(radius), 타이포그래피, 그림자(shadow) 토큰이 없음
- 컴포넌트마다 `borderRadius: 14`, `12`, `16`, `8`, `6` 등 제각기 다른 값 사용

**개선 계획:**
- `Colors.js`를 제거하고 CSS 변수(`var(--color-ac)` 등)를 직접 참조하도록 전환
- `globals.css`의 `@theme` 블록에 spacing/radius/shadow/typography 토큰 추가:
  ```
  --radius-sm: 6px / --radius-md: 10px / --radius-lg: 14px / --radius-xl: 20px
  --shadow-sm / --shadow-md / --shadow-lg
  --space-1: 4px ~ --space-8: 32px
  --font-xs: 11px / --font-sm: 13px / --font-base: 14px / --font-lg: 16px / --font-xl: 20px
  ```
- 토큰 JS 헬퍼 파일 생성 (`lib/tokens.js`)으로 CSS 변수를 JS에서 참조할 수 있는 유틸 제공

**대상 파일:** `app/globals.css`, `components/Colors.js` (삭제), 전체 컴포넌트

---

### 1-2. UI 컴포넌트 라이브러리 실사용 전환

**현재 문제:**
- `Button`, `Card`, `Tabs`, `Input`, `Modal` 컴포넌트가 존재하나 Dashboard, Students, Schedule, Tuition, StudentDetail에서 거의 사용되지 않음
- 각 페이지가 raw `<button>`, `<div>`, `<input>` 에 인라인 스타일로 자체 구현
- 동일한 버튼이 5가지 다른 모양으로 렌더링됨

**개선 계획:**
- 모든 raw `<button>` 요소를 `<Button>` 컴포넌트로 교체
- 모든 raw `<input>` 요소를 `<Input>` 컴포넌트로 교체
- StudentDetail의 자체 탭 구현을 `<Tabs>` 컴포넌트로 교체
- 카드 레이아웃을 `<Card>` 컴포넌트로 통일
- 모달을 `<Modal>` 컴포넌트로 통일 (Schedule의 `SchModal` 등)

**대상 파일:** `components/Dashboard.jsx`, `Students.jsx`, `StudentDetail.jsx`, `Schedule.jsx`, `Tuition.jsx`

---

### 1-3. 인라인 `<style>` 태그 제거

**현재 문제:**
- AppShell(4개), Dashboard, Students, Schedule, StudentDetail, Tuition, Sidebar에 각각 `<style>` 태그가 주입됨
- `!important` 남용으로 스타일 충돌 발생
- 매 렌더링마다 브라우저 스타일 재계산 유발

**개선 계획:**
- 모든 `<style>` 태그 내용을 `globals.css` 또는 CSS Module로 이전
- `!important` 사용 제거, 적절한 specificity 구조로 전환
- 미디어 쿼리를 `globals.css`에 중앙 집중화

**대상 파일:** `app/globals.css`, `components/AppShell.jsx`, `Sidebar.jsx`, 각 페이지 컴포넌트

---

## 2단계: 접근성(A11y) 필수 개선

> WCAG 2.1 AA 수준 준수를 목표로 한다.

### 2-1. HTML 언어 속성 설정

**현재 문제:** `<html>` 태그에 `lang="ko"` 미설정. 스크린 리더가 한국어를 영어 발음으로 읽을 수 있음.

**개선:** `app/layout.js`에서 `<html lang="ko">` 설정

**대상 파일:** `app/layout.js`

---

### 2-2. 포커스 관리 체계 수립

**현재 문제:**
- `Input.jsx`: `outline: 'none'`으로 브라우저 기본 포커스 링 제거 후 대체 스타일 없음
- `Button.jsx`: `:focus-visible` 스타일 없음
- `Sidebar.jsx`: `.sb-item`에 `:focus` 스타일 없음
- 사이드바 닫기 버튼 터치 타겟 26x26px (최소 44x44px 필요)

**개선 계획:**
- `globals.css`에 글로벌 `:focus-visible` 스타일 추가 (2px solid 파란 outline + 2px offset)
- `Input.jsx`: 포커스 시 `border-color` 변경 + `box-shadow` 링 추가
- `Button.jsx`: `:focus-visible` 스타일 추가
- 모든 인터랙티브 요소의 최소 터치 타겟 44x44px 보장
  - `Button.jsx` `sm` 사이즈: `minHeight: 30` -> `minHeight: 36` (+ 패딩으로 44px 보장)
  - 사이드바 닫기 버튼: `padding: 4` -> `padding: 13`
  - 모바일 하단 네비게이션: `fontSize: 10` -> `fontSize: 11`

**대상 파일:** `app/globals.css`, `components/ui/Button.jsx`, `components/ui/Input.jsx`, `components/Sidebar.jsx`, `components/AppShell.jsx`

---

### 2-3. ARIA 속성 보강

**현재 문제:**
- `Tabs.jsx`: `role="tablist"`, `role="tab"`, `aria-selected` 없음
- `StudentDetail.jsx`: 자체 탭에 ARIA 속성 전무
- `Modal.jsx`: 모달 닫힐 때 이전 포커스 복원 안 됨, `body` 스크롤 잠금 없음
- `Card.jsx`: 클릭 가능한 카드에 `role="button"` 없음
- `Input.jsx`: `aria-describedby`로 에러/힌트 텍스트 연결 안 됨
- 모바일 하단 내비게이션: `aria-current="page"` 없음

**개선 계획:**
- `Tabs.jsx`에 완전한 ARIA tabs 패턴 구현 (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, 화살표 키 탐색)
- `Modal.jsx` 개선:
  - 열릴 때 `document.body.style.overflow = 'hidden'` 설정
  - 닫힐 때 트리거 요소로 포커스 복원
  - 포커스 트랩의 focusable 요소 목록을 동적으로 갱신
  - 닫기 아이콘을 유니코드 `✕` 에서 SVG 아이콘으로 변경
- `Card.jsx`: `clickable` prop이 true일 때 `role="button"`, `tabIndex="0"`, `onKeyDown(Enter/Space)` 추가
- `Input.jsx`: 에러/힌트에 `id` 부여 후 `aria-describedby`로 연결, `aria-invalid` 추가
- 모바일 내비게이션 `button`에 `aria-current="page"` 추가

**대상 파일:** `components/ui/Tabs.jsx`, `components/ui/Modal.jsx`, `components/ui/Card.jsx`, `components/ui/Input.jsx`, `components/AppShell.jsx`

---

## 3단계: 로딩/에러/빈 상태 UX 개선

### 3-1. 스켈레톤 로딩 도입

**현재 문제:**
- 5개 페이지 모두 `"불러오는 중..."` 텍스트 로딩만 표시
- `globals.css`에 `@keyframes shimmer` 정의되어 있으나 미사용
- `Skeleton.jsx` 컴포넌트 존재하나 미사용

**개선 계획:**
- 각 페이지별 전용 스켈레톤 레이아웃 생성:
  - **Dashboard**: 위젯 그리드 형태의 스켈레톤 (2열 카드 플레이스홀더)
  - **Students**: 학생 카드 리스트 스켈레톤 (3~4개 카드 shimmer)
  - **StudentDetail**: 프로필 헤더 + 탭 + 컨텐츠 영역 스켈레톤
  - **Schedule**: 캘린더 그리드 스켈레톤 (7열 셀)
  - **Tuition**: 테이블 헤더 + 행 스켈레톤
- `Skeleton.jsx`의 shimmer 애니메이션을 `globals.css`의 `@keyframes shimmer`와 연결

**대상 파일:** `components/ui/Skeleton.jsx`, 각 페이지 컴포넌트

---

### 3-2. 에러 상태 개선

**현재 문제:**
- 모든 페이지 동일한 `"데이터를 불러오지 못했습니다"` + 재시도 버튼
- Supabase 영문 에러 메시지가 한국어 UI에 노출
- 재시도에 rate limiting 없음

**개선 계획:**
- 공통 `ErrorState` 컴포넌트 생성: 아이콘 + 제목 + 상세 메시지 + 재시도 버튼
- 에러 유형별 분기: 네트워크 오류 / 인증 만료 / 서버 오류 / 권한 부족
- 자동 재시도 시 exponential backoff (2s, 4s, 8s) 적용
- Supabase 에러 코드를 한국어로 매핑하는 `lib/errorMessages.js` 유틸 추가
- Login.jsx의 에러 번역 범위 확장 (rate limit, email not confirmed, network error 등)

**대상 파일:** `components/ui/EmptyState.jsx` (확장), `lib/errorMessages.js` (신규), `components/Login.jsx`

---

### 3-3. 빈 상태(Empty State) 일관화

**현재 문제:**
- Dashboard 위젯 3개(`upcoming`, `unrecorded`, `alerts`)가 데이터 없을 때 `null` 반환 → 레이아웃 붕괴
- 빈 상태 메시지 유무가 위젯마다 불일치

**개선 계획:**
- 데이터 없는 위젯도 카드 프레임 유지, `EmptyState` 컴포넌트로 "예정된 수업이 없습니다" 등 표시
- `Students`, `Tuition`의 검색 결과 0건일 때도 검색어 포함 빈 상태 메시지 표시

**대상 파일:** `components/Dashboard.jsx`, `components/Students.jsx`, `components/Tuition.jsx`

---

## 4단계: 네비게이션 및 레이아웃 개선

### 4-1. 데스크톱/모바일 네비게이션 아이콘 통일

**현재 문제:**
- `AppShell.jsx`의 `NAV_ICONS`와 `Sidebar.jsx`의 `ICONS` 맵이 별도 정의
- 같은 `students` 항목에 1인 아이콘(AppShell) vs 2인 아이콘(Sidebar) 사용

**개선 계획:**
- `Icons.js`에 네비게이션 아이콘 세트를 통합 정의
- AppShell과 Sidebar가 동일 아이콘 소스 참조
- 아이콘에 `aria-hidden="true"` 추가 (텍스트 라벨이 있으므로)

**대상 파일:** `components/Icons.js`, `components/AppShell.jsx`, `components/Sidebar.jsx`

---

### 4-2. 사이드바 UX 개선

**현재 문제:**
- 로그아웃 버튼이 사용자 프로필 **위에** 배치 — 실수로 로그아웃 유발
- 이메일 말줄임 처리 시 `title` 속성 없음 → 전체 이메일 확인 불가
- 활성 상태 표시에 색상 변경 + 점(dot) 이중 적용 — 시각 노이즈

**개선 계획:**
- 사용자 프로필을 로그아웃 버튼 위로 이동 (프로필 → 구분선 → 로그아웃 순서)
- 로그아웃 버튼에 `ConfirmDialog` 확인 과정 추가
- 말줄임된 이메일에 `title` 속성 추가
- 활성 상태의 점(dot) 제거, 색상 변경만으로 충분

**대상 파일:** `components/Sidebar.jsx`

---

### 4-3. 모바일 레이아웃 최적화

**현재 문제:**
- 데스크톱 사이드바가 `display:none` + `!important`로 숨기지만 DOM에 완전히 마운트됨
- 768~1023px 태블릿 구간에서 캘린더 7열 그리드(minWidth:800)가 좁아 가로 스크롤 발생

**개선 계획:**
- 데스크톱 사이드바를 CSS가 아닌 조건부 렌더링으로 전환 (불필요한 DOM 제거)
- 태블릿 구간(768~1023px)용 캘린더 5일 보기 또는 축약 보기 추가
- Schedule 모바일 뷰의 날짜 선택기 터치 영역 확대

**대상 파일:** `components/AppShell.jsx`, `components/Schedule.jsx`

---

## 5단계: 핵심 페이지별 UX 개선

### 5-1. Dashboard 개선

**현재 문제:**
- 9px 폰트 사이즈의 알림 태그 — 가독성 최저
- 위젯 편집 모드의 컨트롤 버튼이 카드 바깥(`top:-8`)에 위치 → 잘림/겹침 위험
- 주간 차트가 custom div로 구현 (Recharts와 불일치)
- 드래그 앤 드롭 위젯 정렬에 키보드 대안 부족

**개선 계획:**
- 알림 태그 최소 폰트 사이즈 `11px` 이상으로 상향
- 편집 모드 컨트롤을 카드 내부 상단 우측으로 이동
- 주간 차트를 `LazyBarChart` (Recharts) 컴포넌트로 교체 → 일관된 차트 스타일
- 편집 모드에서 키보드 방향키(↑↓←→)로 위젯 이동 지원

**대상 파일:** `components/Dashboard.jsx`

---

### 5-2. Students 목록 개선

**현재 문제:**
- 삭제(삭제) 버튼이 수정/보관과 동일한 스타일 — 위험 조작이 구분 안 됨
- 액션 버튼 11px 폰트, 패딩 없음 → 터치 타겟 미달
- 학생 번호(`stuNumMap`)가 이름 앞에 표시되나 의미 설명 없음
- 검색 입력에 초기화(x) 버튼 없음
- 추가/수정 모달: 필수 필드 표시 없음, 숫자 필드에 `type="text"` 사용, 유효성 검증 피드백 없음
- 드롭 인디케이터가 카드 옆면(세로선)으로 표시 → 삽입 위치 모호

**개선 계획:**
- 삭제 버튼: `color: C.dn` (빨간색) + hover 시 배경색 변경
- 모든 액션 버튼 최소 `fontSize: 12`, `padding: '4px 8px'`, `minHeight: 32px`
- 학생 번호를 뱃지 형태로 분리 표시하거나, 설정에서 표시/숨김 토글 추가
- 검색 입력에 `value`가 있을 때 우측에 X 클리어 버튼 표시
- 추가/수정 모달 개선:
  - 필수 필드에 `*` 표시 및 `aria-required="true"`
  - 수업료 필드에 `type="number"`, `inputMode="numeric"` 적용
  - 실시간 인라인 유효성 검증 (이름 필수, 수업료 숫자 확인)
- 드롭 인디케이터를 카드 사이 가로선 방식으로 변경

**대상 파일:** `components/Students.jsx`

---

### 5-3. StudentDetail 구조 개선

**현재 문제:**
- 150KB, ~50개 `useState` 호출이 단일 컴포넌트에 집중 → 유지보수 한계
- 자체 탭 구현이 `Tabs.jsx` 무시, ARIA 속성 없음
- 타임라인 뷰에 페이지네이션/가상화 없음 (200+ 수업 시 성능 저하)
- `window.confirm()` 과 `useConfirm()` 훅이 혼용됨 (line 210)
- 공유 권한 체크박스 16x16px → 터치 타겟 미달
- 모바일에서 탭 간 스와이프 내비게이션 없음

**개선 계획:**
- **컴포넌트 분할:** 탭별로 하위 컴포넌트 추출
  - `StudentDetail/ClassTab.jsx` (수업 타임라인)
  - `StudentDetail/ScoresTab.jsx` (성적 차트)
  - `StudentDetail/WrongTab.jsx` (오답 관리)
  - `StudentDetail/ReportTab.jsx` (리포트)
  - `StudentDetail/FilesTab.jsx` (파일)
  - `StudentDetail/PlanTab.jsx` (학습 계획)
- `Tabs.jsx` 컴포넌트 사용으로 전환 (ARIA 속성 자동 적용)
- 타임라인에 무한 스크롤 또는 월별 페이지네이션 도입 (초기 로드 최근 3개월)
- `window.confirm()` 호출을 모두 `useConfirm()` 훅으로 통일
- 체크박스를 커스텀 체크박스 컴포넌트로 교체 (최소 44x44px 터치 영역)
- 모바일 탭 영역에 좌우 스와이프 제스처 추가 (`touchstart`/`touchmove`/`touchend`)

**대상 파일:** `components/StudentDetail.jsx` → 여러 파일로 분할

---

### 5-4. Schedule(캘린더) 개선

**현재 문제:**
- 컨텍스트 메뉴(상태 변경, 복사, 삭제)가 우클릭에서만 작동 → 키보드/터치 사용자 접근 불가
- 수업 블록 내 상태 뱃지 `fontSize: 8` → 읽기 불가
- 드래그 앤 드롭 이벤트 리스너가 컴포넌트 언마운트 시 정리 안 됨
- 768~1023px 구간에서 7열 그리드가 minWidth:800으로 가로 스크롤 발생

**개선 계획:**
- 각 수업 블록에 케밥 메뉴(...) 버튼 추가 → 클릭/키보드로 상태 변경 메뉴 접근
- 상태 뱃지 최소 `fontSize: 10`, 블록 높이가 작을 때는 색상 막대만 표시
- 드래그 이벤트 리스너를 `useEffect` 클린업에 포함
- 태블릿 구간에 5일 업무 뷰 옵션 추가

**대상 파일:** `components/Schedule.jsx`

---

### 5-5. Tuition(수업료) 개선

**현재 문제:**
- 12열 테이블이 좁은 화면에서 가로 스크롤 시 학생 이름 컬럼이 함께 스크롤 → 맥락 상실
- 학생 숨기기 버튼 16x16px `+`/`-` 문자, 의미 불명확
- 영수증 생성이 `window.open()` 팝업 → 팝업 차단기에 의해 차단 가능
- CSV 내보내기에 로딩/성공 피드백 없음

**개선 계획:**
- 학생 이름 컬럼을 `position: sticky; left: 0`으로 고정
- 테이블 오른쪽 끝에 그라디언트 그림자로 스크롤 가능 힌트 표시
- 숨기기 버튼을 아이콘(눈 모양) + 툴팁으로 변경, 최소 32x32px
- 영수증 생성을 새 탭(`window.open` + `_blank`) 또는 인앱 미리보기로 변경
- CSV 내보내기에 `loading` 상태 + 완료 시 `toast` 알림 추가

**대상 파일:** `components/Tuition.jsx`

---

### 5-6. Login 페이지 개선

**현재 문제:**
- 비밀번호 필드에 표시/숨기기 토글 없음
- 회원가입 시 비밀번호 요구사항 안내 없음
- Supabase 에러 메시지 대부분 영문 그대로 노출
- 로그인/회원가입/비밀번호 찾기 모드 전환 시 애니메이션 없음

**개선 계획:**
- 비밀번호 입력 우측에 눈 모양 아이콘 토글 버튼 추가
- 회원가입 모드에서 비밀번호 강도 표시기(약함/보통/강함 + 프로그레스 바) 추가
- 비밀번호 최소 6자 이상 요구사항 텍스트 상시 표시
- Supabase 에러 코드 한국어 매핑 확대 (rate limit, email 미확인, 네트워크 오류 등)
- 모드 전환 시 페이드 또는 슬라이드 트랜지션 추가

**대상 파일:** `components/Login.jsx`

---

## 6단계: 인터랙션 품질 향상

### 6-1. 트랜지션 및 애니메이션

**현재 문제:**
- 페이지 전환 시 `fadeIn` 애니메이션만 존재
- 모달 열기/닫기에 enter 애니메이션만 있고 exit 애니메이션 없음
- 사이드바 오버레이 열림/닫힘에 트랜지션 없음 (즉시 마운트/언마운트)

**개선 계획:**
- 모달: 열기 시 `scale(0.95) → scale(1)` + `opacity 0→1`, 닫기 시 역방향 애니메이션
- 바텀시트: `translateY(100%) → translateY(0)` 슬라이드업
- 사이드바 오버레이: `translateX(-100%) → translateX(0)` 슬라이드인 + 배경 페이드
- 토스트 알림: 슬라이드인 + 슬라이드아웃 (현재 슬라이드인만 존재)
- 탭 전환 시 콘텐츠 영역에 부드러운 페이드 효과

**대상 파일:** `components/ui/Modal.jsx`, `components/AppShell.jsx`, `components/Toast.jsx`

---

### 6-2. 피드백 패턴 강화

**현재 문제:**
- 삭제/저장 등 중요 작업 시 시각적 피드백 불충분
- 드래그 앤 드롭 시 드롭 가능 영역 표시 미흡

**개선 계획:**
- 저장 버튼: 클릭 → `loading` 상태 (스피너) → 성공 시 체크마크 → 원래 상태 복귀
- 삭제 버튼: 클릭 → `ConfirmDialog` → 확인 시 `loading` → 삭제 애니메이션(fadeOut) → toast
- 드래그 중: 드래그 중인 아이템에 그림자 강화, 드롭 타겟에 하이라이트 배경

**대상 파일:** 각 페이지 컴포넌트

---

## 7단계: 한국어 폰트 및 타이포그래피

### 7-1. 폰트 폴백 개선

**현재 문제:**
- 폰트 폴백 체인: `'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif`
- 한국어 전용 폴백 폰트 없음 → CDN 장애 시 한국어 글리프 렌더링 불안정

**개선 계획:**
- 폰트 폴백 체인에 한국어 시스템 폰트 추가:
  ```
  'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif
  ```
- `font-display: swap` 확인하여 폰트 로딩 중에도 텍스트 표시 보장

**대상 파일:** `app/globals.css`, `app/layout.js`

---

### 7-2. 타이포그래피 계층 정리

**현재 문제:**
- 폰트 사이즈가 8px ~ 18px 사이에서 체계 없이 사용됨
- 8px, 9px, 10px 등 가독성 한계 이하의 텍스트 존재
- 제목/본문/캡션 구분 없이 `fontSize`와 `fontWeight`가 자유 사용

**개선 계획:**
- 최소 폰트 사이즈를 `11px`로 설정 (절대 하한)
- 타이포그래피 스케일 정의:
  ```
  Display: 24px/800  →  페이지 제목
  Heading: 17px/700  →  섹션 제목, 모달 제목
  Subhead: 14px/600  →  카드 제목, 탭 라벨
  Body:    14px/400  →  본문 텍스트
  Caption: 12px/400  →  보조 텍스트, 라벨
  Micro:   11px/500  →  뱃지, 태그 (최소 사이즈)
  ```
- 각 컴포넌트에서 이 스케일을 준수하도록 일괄 수정

**대상 파일:** 전체 컴포넌트

---

## 8단계: 반응형 디자인 정비

### 8-1. 브레이크포인트 체계화

**현재 문제:**
- `640px`, `768px`, `1024px` 세 개의 브레이크포인트가 혼재
- 미디어 쿼리가 `globals.css`, 인라인 `<style>`, JS `isMobile` 상태로 분산
- JS의 `isMobile` 판단 기준(`< 640px`)과 CSS 미디어 쿼리 기준이 상이

**개선 계획:**
- 브레이크포인트 표준화:
  ```
  Mobile:  < 640px   (sm)
  Tablet:  640-1023px (md)
  Desktop: >= 1024px  (lg)
  ```
- 모든 미디어 쿼리를 `globals.css`로 중앙 집중화
- JS의 `isMobile` 판단도 동일 기준으로 통일
- 각 브레이크포인트에서의 레이아웃 명시적 정의

**대상 파일:** `app/globals.css`, 반응형 관련 전체 컴포넌트

---

## 실행 우선순위 요약

| 순위 | 단계 | 영향도 | 이유 |
|------|------|--------|------|
| 1 | 2단계: 접근성 필수 개선 | 높음 | 법적 요건 + 전체 사용자 기본 사용성 보장 |
| 2 | 1단계: 디자인 시스템 기반 정비 | 높음 | 후속 모든 작업의 전제 조건 |
| 3 | 3단계: 로딩/에러/빈 상태 | 높음 | 체감 성능과 신뢰도에 직결 |
| 4 | 5단계: 핵심 페이지별 UX 개선 | 중간 | 주요 기능의 사용성 직접 개선 |
| 5 | 7단계: 타이포그래피 | 중간 | 가독성 일괄 향상 |
| 6 | 4단계: 네비게이션/레이아웃 | 중간 | 구조적 사용성 개선 |
| 7 | 6단계: 인터랙션 품질 | 낮음 | 폴리시 레벨의 개선 |
| 8 | 8단계: 반응형 정비 | 낮음 | 기존 동작에 문제 적으나 체계화 필요 |

---

## 주요 파일 변경 범위

| 파일 | 변경 규모 | 설명 |
|------|-----------|------|
| `app/globals.css` | 대규모 | 디자인 토큰, 미디어 쿼리, 포커스 스타일 집중화 |
| `app/layout.js` | 소규모 | `lang="ko"`, 폰트 폴백 |
| `components/Colors.js` | 삭제 | CSS 변수로 대체 |
| `components/ui/*.jsx` | 중규모 | ARIA, 포커스, 터치 타겟 개선 |
| `components/AppShell.jsx` | 중규모 | 인라인 style 제거, 네비게이션 ARIA |
| `components/Sidebar.jsx` | 중규모 | 레이아웃 순서, 포커스, 터치 타겟 |
| `components/Dashboard.jsx` | 대규모 | 스켈레톤, 빈 상태, 차트 통일, 폰트 크기 |
| `components/Students.jsx` | 중규모 | 액션 버튼, 모달 유효성 검증, 드롭 인디케이터 |
| `components/StudentDetail.jsx` | 대규모 | 컴포넌트 분할, 탭 교체, 페이지네이션 |
| `components/Schedule.jsx` | 중규모 | 컨텍스트 메뉴, 폰트, 이벤트 정리 |
| `components/Tuition.jsx` | 중규모 | 스티키 컬럼, 버튼 개선, 영수증 |
| `components/Login.jsx` | 소규모 | 비밀번호 토글, 에러 번역, 강도 표시기 |
| `lib/errorMessages.js` | 신규 | 에러 코드 한국어 매핑 |

---

*이 기획안은 코드베이스 전체 분석에 기반하여 작성됨. 각 항목은 실제 코드 라인 참조와 함께 구체적인 문제점을 식별하고 있으며, 실행 시 단계별로 독립적으로 진행 가능하도록 구성됨.*
