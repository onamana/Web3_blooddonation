import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { matchConditionsSchema } from "../schemas/match.js";
import { forwardDid } from '../services/didClient.js';

const router = Router();

router.post('/', validateBody(matchConditionsSchema), (req, res) => forwardDid(req, res, '/match'));

export default router;
