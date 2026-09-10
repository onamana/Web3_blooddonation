const fs = require("node:fs");
const path = require("node:path");

for (const name of ["BloodCertificate", "DonationRegistry"]) {
  const artifact = require(`../artifacts/contracts/${name}.sol/${name}.json`);
  const target = path.resolve(__dirname, `../../backend/contracts/${name}.sample.abi.json`);
  fs.writeFileSync(target, JSON.stringify(artifact.abi, null, 2) + "\n");
  console.log(`${name}: backend ABI synchronized`);
}
