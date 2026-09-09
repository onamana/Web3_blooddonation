const express = require('express');
const cors = require('cors');
const { 
  ISSUER_DID, 
  initMockStore, 
  matchCandidates, 
  issueBloodVC, 
  getStoredVCs 
} = require('./services/vcService');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'DID/VC Service', issuerDid: ISSUER_DID });
});

app.get('/vc', (req, res) => {
  res.json(getStoredVCs());
});

app.post('/vc/issue', async (req, res) => {
  try {
    const { holderAddress, bloodType, isEligible } = req.body;
    if (!holderAddress || !bloodType) {
      return res.status(400).json({ error: "holderAddress 및 bloodType이 필요합니다." });
    }

    const vc = await issueBloodVC(holderAddress, bloodType, isEligible ?? true);
    getStoredVCs().push(vc);

    res.status(201).json({ success: true, vc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// did/src/server.js의 app.post('/match', ...) 부분
app.post('/match', async (req, res) => {
  try {
    const { bloodType, recentDonationWithinDays, onlyEligible } = req.body;
    const matchedResults = await matchCandidates({ 
      bloodType, 
      recentDonationWithinDays,
      onlyEligible: onlyEligible !== undefined ? onlyEligible : true 
    });

    res.json({
      success: true,
      query: { bloodType: bloodType || "ALL", recentDonationWithinDays, onlyEligible: true },
      matchedCount: matchedResults.length,
      matches: matchedResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  await initMockStore();
  console.log(`[DID Module] Server running on http://localhost:${PORT}`);
});