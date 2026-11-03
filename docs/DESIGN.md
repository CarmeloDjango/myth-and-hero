# 영웅 도감 디자인 가이드

> 그림책 교실: 흰 종이 위의 통통한 글씨와 누르고 싶은 스티커 버튼

- **방향:** Duolingo 스타일을 참고한 B안으로 확정
- **시안:** https://claude.ai/artifact/Axf4rMnwnAk2zoGKw9j7hh (B1 홈, B2 도감 목록, B3 인물 상세)
- **대상:** 초등학교 2학년 (태블릿 우선)

---

## 1. 원칙

1. **흰 종이 위에서 초록이 이끈다.** 배경은 흰색이고, 큰 제목과 주요 버튼만 초록색입니다. 본문은 회색으로 차분하게 둡니다.
2. **모든 버튼과 카드는 눌리는 스티커처럼 보인다.** 2px 테두리에 아래쪽만 4px로 두껍게 하고, 누르면 2px 내려가게 합니다. 그림자는 쓰지 않습니다.
3. **알록달록한 색은 그림 안에만 쓴다.** 주황, 보라, 분홍, 노랑은 일러스트, 마스코트, 능력치 막대에만 씁니다. 버튼이나 내비 같은 UI에는 쓰지 않습니다.
4. **아이가 읽고 누르기 쉽게 한다.** 본문은 17px 이상(열전은 20px), 터치 영역은 최소 48px, 글자는 대비 4.5:1 이상으로 맞춥니다.
5. **그라데이션, 그림자, 유리 효과는 쓰지 않는다.**

---

## 2. 색상

### UI 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `green` | `#58cc02` | 주요 버튼 배경, 푸터 배경, 진행 막대 |
| `green-dark` | `#58a700` | 버튼 아래 테두리, **큰 제목 글자색** (흰 배경 대비 약 3.3:1, 24px 이상에서만 사용) |
| `green-ink` | `#3f7f00` | 작은 초록 글자 (태그, 진영 이름) |
| `green-soft` | `#d7ffb8` | 연두 배경 (촉 진영 카드, 태그 배경, 푸터 칩) |
| `blue` | `#1cb0f6` | 선택된 칩 테두리, 보조 강조 면 |
| `blue-ink` | `#0b7bb3` | 링크, 보조 버튼 글자 (원본 `#1cb0f6`은 글자로 쓰기엔 대비가 부족해서 따로 둠) |
| `blue-soft` | `#ddf4ff` | 선택된 칩 배경, 카드 뒷면 배경 |
| `ink` | `#4b4b4b` | 제목, 열전 본문 |
| `muted` | `#737373` | 보조 본문, 라벨 (원본 `#777`은 대비 4.48:1이라 살짝 진하게 조정) |
| `line` | `#e5e5e5` | 카드와 버튼 테두리, 구분선, 진행 막대 바탕 |
| `line-strong` | `#afafaf` | 비활성 상태, 빈 하트 아이콘 |
| `night` | `#000437` | 초록 배경 위의 글자 |
| `paper` | `#ffffff` | 페이지와 카드 배경 |
| `paper-dim` | `#f7f7f7` | 검색창 배경, 버튼 hover 상태 |

### 일러스트와 데이터 색상 (UI에는 쓰지 않음)

| 토큰 | 값 | 용도 |
|---|---|---|
| `orange` | `#ff9600` | 무력 막대, 마스코트 몸통 |
| `purple` | `#ce82ff` | 지력 막대, 마스코트 투구 |
| `pink` | `#ff86d0` | 매력 막대, 마스코트 볼 |
| `yellow` | `#ffc800` | 별 등급 테두리, 스티커 |
| `red` | `#ff4b4b` | 채운 하트(수집함), 마스코트 깃털 |

### 진영 색상 (카드 일러스트 영역 배경과 진영 이름 글자색)

| 진영 | 배경 | 글자 |
|---|---|---|
| 촉 | `#d7ffb8` | `#3f7f00` |
| 위 | `#ddf4ff` | `#0b7bb3` |
| 오 | `#ffe2cc` | `#a35200` |
| 기타 | `#fff4cc` | `#806500` |
| 그리스신화 | `#f3e1ff` | (정할 예정) |

다른 세계관의 진영 색은 `Faction.color`에 배경색을 저장하고, 글자색은 그 배경에 맞는 진한 색으로 짝지어 둡니다.

### 능력치 막대 색상

| 능력치 | 색 |
|---|---|
| 통솔 | `blue` |
| 무력 | `orange` |
| 지력 | `purple` |
| 정치 | `green` |
| 매력 | `pink` |

---

## 3. 타이포그래피

| 역할 | 폰트 | 굵기 | 크기 / 줄간격 | 비고 |
|---|---|---|---|---|
| 디스플레이 | **Jua** | 400 | 64px / 1.2, 자간 -0.02em | 섹션 제목. 색은 `green-dark` |
| 인물 이름 (상세) | Jua | 400 | 96px / 1.1 | |
| 인물 이름 (카드) | Jua | 400 | 36~44px | 색은 `ink` |
| 히어로 제목 | Noto Sans KR | 700 | 32px / 1.35 | 색은 `ink` |
| 소제목 | Noto Sans KR | 700 | 19~32px | |
| 본문 | Noto Sans KR | 500 | 17~19px / 1.5~1.6 | 색은 `muted` |
| 열전 본문 | Noto Sans KR | 500 | 20px / 1.8 | 읽기 편하도록 색은 `ink` |
| 라벨, 내비, 칩 | Noto Sans KR | 700 | 13~15px, 자간 0.053em | |
| 숫자 | Noto Sans KR | 900 | | `font-variant-numeric: tabular-nums` |

- 원본의 feather와 duolingo-sans는 한글이 없어서 대체했습니다.
  - feather 대신 **Jua**: 둥글고 통통한 디스플레이용
  - duolingo-sans 대신 **Noto Sans KR**: 본문용
- Jua는 32px 미만에서 쓰지 않습니다. 그보다 작은 글씨는 Noto Sans KR 700을 씁니다.
- Next.js에서는 `next/font/google`으로 불러옵니다. `Jua`는 `weight: "400"`, `Noto_Sans_KR`는 `weight: ["500","700","900"]`입니다.

---

## 4. 모양과 간격

- **기본 단위:** 4px. 간격은 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 96 단계로 씁니다.
- **페이지 최대 너비:** 1200px, 좌우 여백 24px
- **섹션 간격:** 80~96px. 섹션 사이는 `line` 색 2px 선으로 구분합니다.
- **모서리 둥글기:**
  - 버튼, 칩, 태그: 12px
  - 카드, 입력창, 패널: 16px
  - 진행 막대: 높이의 절반
- **테두리:** `2px solid line` + `border-bottom-width: 4px`

---

## 5. 컴포넌트

### 버튼
| 종류 | 스타일 |
|---|---|
| **Primary** | 배경 `green`, 아래 테두리 `4px green-dark`, 흰 글자 700 15~17px, 자간 0.053em, 높이 52~56px |
| **Secondary** | 배경 흰색, 테두리 `2px line` + 아래 4px, 글자 `blue-ink` 700 |
| **Nav** | Secondary와 같지만 글자는 `muted`. 현재 페이지는 선택된 칩 스타일 |

- 누를 때(`:active`)는 `translateY(2px)`로 내리고 아래 테두리를 2px로 줄입니다.
- 주의: 초록 배경 위 흰 글자는 대비가 낮습니다(약 2.2:1). 글자를 굵고 크게(700, 17px 이상) 유지하고, 필요하면 배경을 `green-dark`로 조정합니다.

### 칩 (필터, 탭)
- **기본:** 흰 배경, `line` 테두리, 글자 `muted`
- **선택됨:** `blue-soft` 배경, `blue` 테두리, 글자 `blue-ink`, `aria-pressed="true"`

### 인물 카드
- **겉모양:** 16px 모서리, 스티커 테두리
- **위쪽 일러스트 영역:** 높이 220px, 진영 배경색
  - 별 등급 배지: 흰 배경 + `yellow` 테두리
  - 수집 하트 버튼: 오른쪽 위, 48×48
- **아래쪽 정보:** 진영·역할 라벨(진영 글자색) → 이름(Jua) → 칭호(`muted`) → 능력치 막대 3개(무력, 지력, 통솔)
- **hover:** 위로 4px 떠오름

### 능력치 막대
- 바탕은 `line`, 채움은 능력치 색
- 채움 위쪽에 흰색 35% 하이라이트 줄
- 높이: 카드 안 16px, 상세 페이지 24px
- 오른쪽에 숫자 (900, tabular-nums)

### 검색창
- `paper-dim` 배경, 16px 모서리, `line` 2px 테두리
- 돋보기 아이콘
- 높이 54px 이상, 글자 18px
- 이름, 별명, 초성 검색을 안내하는 placeholder

### 상태 표시
- **로딩 (무한 스크롤):** 초록 점 세 개가 통통 튀는 애니메이션 + "다음 카드 불러오는 중", `role="status"`
- **결과 없음:** 마스코트 + "앗, 못 찾았어요!"(Jua, `green-dark`) + 안내 문구

### 푸터
- `green` 배경, 로고는 흰색 Jua
- 그 밖의 글자는 `night`, 링크 칩은 `green-soft` 배경

---

## 6. 마스코트: 꼬마 장군 "토리" (가칭)

- 주황색 동그란 몸통, 보라 투구, 빨간 깃털, 분홍 볼
- 테두리는 `ink` 색 4~5px
- **쓰는 곳:** 홈 히어로, 결과 없음 화면, "알고 있었나요?" 안내, 앞으로 만들 퀴즈와 칭찬 화면
- 지금 시안의 SVG는 임시 그림이고, 최종 일러스트는 따로 만들 예정입니다.

---

## 7. 아이콘과 일러스트

- **아이콘:** 굵은 선(2.2~2.8px) 아웃라인 SVG. 모서리와 끝은 둥글게(`round`) 합니다. 이모지는 쓰지 않습니다.
- **인물 일러스트:**
  - 플랫 2D, 둥근 형태, `ink` 색 외곽선
  - 진영 배경색 위에 캐릭터만 그립니다.
  - 모든 인물이 같은 화풍이어야 합니다 (AI로 만든다면 스타일 프롬프트를 고정).

---

## 8. Tailwind v4 토큰

```css
@theme {
  --color-green: #58cc02;
  --color-green-dark: #58a700;
  --color-green-ink: #3f7f00;
  --color-green-soft: #d7ffb8;
  --color-blue: #1cb0f6;
  --color-blue-ink: #0b7bb3;
  --color-blue-soft: #ddf4ff;
  --color-ink: #4b4b4b;
  --color-muted: #737373;
  --color-line: #e5e5e5;
  --color-line-strong: #afafaf;
  --color-night: #000437;
  --color-paper: #ffffff;
  --color-paper-dim: #f7f7f7;

  --color-orange: #ff9600;
  --color-purple: #ce82ff;
  --color-pink: #ff86d0;
  --color-yellow: #ffc800;
  --color-red: #ff4b4b;

  --font-display: var(--font-jua), sans-serif;
  --font-sans: var(--font-noto-sans-kr), system-ui, sans-serif;

  --radius-button: 12px;
  --radius-card: 16px;
}
```

```css
/* 스티커 테두리 유틸리티 */
@utility sticker {
  border: 2px solid var(--color-line);
  border-bottom-width: 4px;
}
@utility pressable {
  &:active { transform: translateY(2px); border-bottom-width: 2px; }
}
```
