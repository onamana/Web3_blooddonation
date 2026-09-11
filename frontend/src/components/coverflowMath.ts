/**
 * 21st.dev @ruixen.ui/coverflow-carousel 의 배치를 실측해서 옮긴 값들.
 * 프리뷰에서 오프셋 1~6의 transform 을 읽어 역산했고, 깊이/회전 곡선은
 * n^0.56 이 여섯 지점 모두 소수 4자리까지 일치했다.
 *
 * CoverflowCarousel(메인 화면 소개)과 CertificateCarousel(내 증서)이 같은 기하학을 쓴다.
 */
export const STEP_RATIO = 1.05; // x = 카드폭 * 1.05 * offset (원본 gap 0.05)
export const DEPTH_RATIO = 0.6; // z = -카드폭 * 0.6 * curve
export const CURVE_EXP = 0.56; // curve = |offset| ^ 0.56
export const ROT_BASE = 44; // offset 1 에서 44deg
export const ROT_MAX = 82; // 그 이상은 82deg 에서 잘린다
export const OPACITY_STEP = 0.1;
export const OPACITY_MIN = 0.5;
/** 좌우로 이만큼까지만 보여주고 나머지는 투명하게 둔다. */
export const VISIBLE = 3;
/**
 * 이만큼(px) 움직이기 전까지는 드래그로 보지 않는다.
 *
 * pointerdown 에서 바로 setPointerCapture 를 걸면 이후 click 이 캡처한 요소(뷰포트)로
 * 재타겟돼서, 옆 카드의 클릭이 영영 도착하지 않는다. 그래서 실제로 움직인 뒤에야
 * 드래그를 시작한다.
 */
export const DRAG_THRESHOLD = 4;

/** i번째 카드가 index에서 몇 칸 떨어져 있는지 (좌우 방향 포함, 최단 경로) */
export function relativeOffset(i: number, index: number, n: number) {
  const raw = (i - index + n) % n;
  return raw > n / 2 ? raw - n : raw;
}

/**
 * 분수 오프셋(드래그 중)도 그대로 받는다.
 *
 * x·z 를 px 로 계산하지 않고 카드 폭(--cf-card)의 배수로 넘긴다.
 * 카드 폭을 JS로 재서 넣으면, 기울어진 카드의 투영 폭이 섞여 들어가
 * 부채가 스스로 접히는 문제가 생긴다. CSS 가 직접 곱하게 두면 그 고리가 끊긴다.
 */
export function transformFor(pos: number) {
  const mag = Math.abs(pos);
  const curve = mag === 0 ? 0 : Math.pow(mag, CURVE_EXP);
  const xMul = (STEP_RATIO * pos).toFixed(4);
  const zMul = (-DEPTH_RATIO * curve).toFixed(4);
  const rotateY = -Math.sign(pos) * Math.min(ROT_BASE * curve, ROT_MAX);
  return {
    transform: `translateX(calc(-50% + var(--cf-card) * ${xMul})) translateZ(calc(var(--cf-card) * ${zMul})) rotateY(${rotateY.toFixed(2)}deg)`,
    opacity: mag > VISIBLE + 0.5 ? 0 : Math.max(OPACITY_MIN, 1 - OPACITY_STEP * mag),
    zIndex: 100 - Math.round(mag),
  };
}

/**
 * 포인터 아래에 실제로 보이는 최상단 카드를 찾는다.
 *
 * 카드를 3D로 겹쳐 놓으면 카드마다 클릭 영역을 얹어도 옆 카드에 가려져
 * 클릭이 엉뚱한 곳으로 간다. elementsFromPoint 는 실제 그려진 순서(위→아래)를
 * 돌려주므로, 사용자가 눈으로 보고 누른 그 카드를 그대로 집어낼 수 있다.
 */
export function cardIndexAtPoint(x: number, y: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const card = (el as HTMLElement).closest?.("[data-card-index]");
    if (card) return Number(card.getAttribute("data-card-index"));
  }
  return null;
}

/**
 * 카드 안쪽의 버튼/링크/입력 등 자체 클릭 동작을 가진 요소, 그리고 `data-scrollable`을 단
 * 스크롤 영역 위에서는 캐러셀이 끼어들지 않는다.
 *
 * data-scrollable이 없으면: 스크롤 영역 안에서 세로로 드래그해도(예: 스크롤바를 손으로 끌기)
 * 가로로 몇 px만 흔들려도 DRAG_THRESHOLD를 넘겨 캐러셀이 "드래그 시작"으로 오인하고,
 * 뒤집힌 카드를 앞면으로 되돌려버린다(플립 상태가 드래그 시작 시 즉시 리셋되기 때문).
 */
export function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a, input, textarea, select, [data-scrollable]");
}
