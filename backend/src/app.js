import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import healthRouter from "./routes/health.js";
import donationRouter from "./routes/donation.js";
import certificateRouter from "./routes/certificate.js";
import matchRouter from "./routes/match.js";
import { generateOpenApiDocument } from "./openapi/document.js";
import credentialRouter from './routes/credential.js';
import { installDemoAccess } from './middleware/demoAccess.js';

export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(value => value.trim());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '64kb', verify: (req, res, buffer) => { req.hasJsonBody = buffer.length > 0; } }));
  app.use(healthRouter);
  installDemoAccess(app);
  const document = generateOpenApiDocument();
  app.get("/openapi.json", (req, res) => res.json(document));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(document));
  app.use("/donation", donationRouter);
  app.use("/certificate", certificateRouter);
  app.use("/match", matchRouter);
  app.use('/credentials', credentialRouter);
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(err.status).json({ error: 'JSON 요청 형식 또는 크기를 확인하세요.' });
    if (err.code === "PENDING_ISSUANCE") return res.status(409).json({ error: err.message });
    const name = err.revert?.name;
    if (name === "ERC721NonexistentToken" || name === "CertificateDoesNotExist") {
      return res.status(404).json({ error: "certificate not found" });
    }
    if (name === "CertificateAlreadyUsed") return res.status(409).json({ error: "already used" });
    // Do not expose signed transactions, RPC URLs or provider credentials.
    console.error("API error:", err.code || err.name);
    res.status(500).json({ error: "요청을 처리하지 못했습니다. 연결 상태를 확인하고 같은 요청을 재시도하세요." });
  });
  return app;
}
