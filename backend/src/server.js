import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import healthRouter from "./routes/health.js";
import donationRouter from "./routes/donation.js";
import certificateRouter from "./routes/certificate.js";
import matchRouter from "./routes/match.js";
import { generateOpenApiDocument } from "./openapi/document.js";

const app = express();
app.use(cors());
app.use(express.json());

const openApiDocument = generateOpenApiDocument();
app.get("/openapi.json", (req, res) => res.json(openApiDocument));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(healthRouter);
app.use("/donation", donationRouter);
app.use("/certificate", certificateRouter);
app.use("/match", matchRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});
