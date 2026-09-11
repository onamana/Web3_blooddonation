import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { credentialIssueSchema, credentialVerifySchema, credentialRevokeSchema } from '../schemas/credential.js';
import { forwardDid } from '../services/didClient.js';
const router = Router();
router.post('/issue', validateBody(credentialIssueSchema), (req, res) => forwardDid(req, res, '/vc/issue'));
router.post('/verify', validateBody(credentialVerifySchema), (req, res) => forwardDid(req, res, '/vc/verify'));
router.post('/revoke', validateBody(credentialRevokeSchema), (req, res) => forwardDid(req, res, '/vc/revoke'));
export default router;
