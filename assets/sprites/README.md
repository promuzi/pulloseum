# assets/sprites — 식물 스프라이트 드롭 위치

사용자가 직접 그린 식물 그림(PNG)을 **여기에 올린다.** 게임이 이 폴더의 PNG를 읽어 절차적 SVG 대신 띄운다.

## 올리는 법
1. **파일을 이 폴더(`assets/sprites/`)에 둔다.**
2. **파일 이름 = 등록 키 + `.png`** (아래 규칙).
3. `index.html`의 `SPRITE_OVERRIDES`에 한 줄 등록(직접 못 하면 Claude에게 "이 파일 등록해줘"라고 하면 됨).

## 스펙 (필수)
- **120 × 140 px, 배경 투명, 식물만** (화분·바닥·그림자 X — 게임이 화분을 자동으로 깔아준다).
- **밑동이 위에서 96px 지점(base y96)** 에 오게 정렬.
- 정렬·분홍 화분 제거는 **[../../tools/sprite-prep.html](../../tools/sprite-prep.html)** 도구가 자동으로 해준다.

## 파일 이름 = 등록 키 (우선순위 순)
| 이름 예 | 의미 |
|---|---|
| `carno_oak_mature.png` | 특정 개체(carno_oak)의 특정 단계(mature) |
| `carno_oak.png` | 그 개체 전 단계 공용 |
| `tree_mature_fire.png` | 타입_단계_속성 (광역, 같은 조건 전부) |

단계 키: `seed`(씨앗)·`sprout`(새싹)·`juvenile`(유체)·`growing`(성장체)·`mature`(성체)·`ripe`(완숙체) — 실제 키는 게임 코드 기준.

> 자세한 제작·삽입 흐름: [docs/sprite-art-motion-guide.md](../../docs/sprite-art-motion-guide.md)
