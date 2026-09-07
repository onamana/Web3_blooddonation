import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { matchConditionsSchema } from "../schemas/match.js";

const router = Router();

// 병원 매칭: 프론트가 조건(혈액형, 최근 헌혈일 등)을 보내면
// B(DID 모듈)로 중계해서 오프체인·익명 필터링 결과만 돌려준다.
// TODO: B 담당과 요청/응답 스펙 맞추고 실제 엔드포인트로 교체
router.post("/", validateBody(matchConditionsSchema), async (req, res) => {
  const conditions = req.body;
  const baseUrl = process.env.DID_MODULE_BASE_URL;

  if (!baseUrl) {
    return res.status(501).json({ error: "DID_MODULE_BASE_URL not configured yet — waiting on B's module" });
  }

  try {
    const response = await fetch(`${baseUrl}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conditions),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "DID module request failed" });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "DID module unreachable", detail: err.message });
  }
});

export default router;
