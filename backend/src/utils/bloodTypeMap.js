// A(스마트컨트랙트)·C(백엔드) 협의 결정: 혈액형 문자열 <-> 컨트랙트 uint8 매핑
// A=0, B=1, AB=2, O=3 (README 참고)
export const BLOOD_TYPE_TO_CODE = { A: 0, B: 1, AB: 2, O: 3 };

export const CODE_TO_BLOOD_TYPE = Object.fromEntries(
  Object.entries(BLOOD_TYPE_TO_CODE).map(([type, code]) => [code, type])
);
