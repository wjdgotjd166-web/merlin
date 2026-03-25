# 멀린 (Merlin) - AI 사주팔자 웹앱

## 프로젝트 개요
AI(GPT-4o-mini) 기반 한국 사주팔자 리딩 웹앱. 무료 기본 리딩 + 유료 심화 리딩(Stripe) 구조.

## 기술 스택
- Backend: Node.js + Express
- Frontend: Vanilla HTML/CSS/JS (프레임워크 없음)
- AI: OpenAI API (gpt-4o-mini)
- 결제: Stripe
- 실행: `npm start` → localhost:3000

## 파일 구조
- `server.js` — Express 서버, OpenAI 프롬프트, API 엔드포인트
- `index.html` — 전체 UI (7개 페이지 단일 파일, 페이지 전환은 JS로 처리)
- `script.js` — 프론트엔드 로직, 페이지 네비게이션, API 호출, 결과 렌더링
- `style.css` — 전체 스타일링, 다크 테마, 애니메이션
- `.env` — OPENAI_API_KEY (절대 수정/노출 금지)

## API 엔드포인트
- `POST /api/reading` — 기본 사주 리딩 (birthDate, birthTime, birthPlace, gender)
- `POST /api/reading/:topic` — 심화 리딩 (love, career, wealth, bundle)

## 현재 응답 JSON 구조
```json
{
  "pillars": { "서버에서 계산 (saju-calc.js) — GPT 아닌 결정론적 계산" },
  "dominantElement": "지배 오행",
  "typeTitle": "타입 이름",
  "reading": {
    "dayMaster": "일간 중심 성향 — 기질, 강/약, 겉과 속 (2500자+)",
    "fiveElements": "오행 분포와 균형 — 과다/부족, 돕는/소모/제어 기운 (2500자+)",
    "tenGods": "십성 핵심 해석 — 비겁/식상/재성/관성/인성 현실 번역 (2500자+)",
    "relations": "천간/지지/지장간 관계 — 합충형해파, 숨은 동기 (2500자+)",
    "personality": "성격 종합 + 일/돈/관계 방향 + 반복 테마 (2500자+)",
    "timing": "시기별 성향 변화 — 10대/20대 대운 발현 + 현재 (2500자+)",
    "advice": "실용 조언 (2500자+)"
  },
  "hook": "자연스러운 심화 유도 (상담 톤, 공포/광고 금지)"
}
```

## 무료/유료 역할 분리
- 무료 = 사람의 구조 (성향, 감정, 패턴, 강점/약점) → 신뢰 확보
- 유료 = 구체적 문제 해결 (애정운, 재물운, 시기운 상세)

## UI 페이지 흐름
page-0~4: 튜토리얼/소개 → page-5: 생년월일 입력 → page-6: 결과 표시 + 심화 리딩 카드

## 주요 작업 규칙
- 모든 텍스트는 한국어
- 톤: 따뜻하고 신비로운 모닥불 옆 이야기 느낌
- 파일 읽을 때 필요한 부분만 offset/limit으로 읽기 (토큰 절약)
- 스타일은 다크 테마, CSS 변수 --ember(골드), --glass(반투명) 사용
