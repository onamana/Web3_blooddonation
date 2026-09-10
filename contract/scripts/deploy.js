const hre = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");
const { preflight } = require("./preflight");

async function main() {
  if (hre.network.name !== "sepolia") throw new Error("Use deploy:sepolia for this deployment script.");
  await preflight();
  const [deployer] = await hre.ethers.getSigners();
  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;

  console.log("Deployer:", deployer.address);
  const deploymentDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(deploymentDir, { recursive: true });
  const manifestPath = path.join(deploymentDir, `sepolia-${Date.now()}.json`);
  const manifest = { chainId: 11155111, deployer: deployer.address, backendSigner: backendSignerAddress, rolesGranted: false };
  const checkpoint = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  const BloodCertificate = await hre.ethers.getContractFactory("BloodCertificate");
  const certificate = await BloodCertificate.deploy(deployer.address);
  const certificateReceipt = await certificate.deploymentTransaction().wait();
  console.log("BloodCertificate deployed:", await certificate.getAddress());
  console.log("BloodCertificate deploy block (set as backend CERTIFICATE_DEPLOY_BLOCK):", certificateReceipt.blockNumber);
  manifest.BloodCertificate = { address: await certificate.getAddress(), blockNumber: certificateReceipt.blockNumber, txHash: certificateReceipt.hash };
  checkpoint();

  const DonationRegistry = await hre.ethers.getContractFactory("DonationRegistry");
  const registry = await DonationRegistry.deploy(deployer.address);
  const registryReceipt = await registry.deploymentTransaction().wait();
  console.log("DonationRegistry deployed:", await registry.getAddress());
  manifest.DonationRegistry = { address: await registry.getAddress(), blockNumber: registryReceipt.blockNumber, txHash: registryReceipt.hash };
  checkpoint();

  if (backendSignerAddress) {
    const issuerRole = await certificate.ISSUER_ROLE();
    const issuerTx = await certificate.grantRole(issuerRole, backendSignerAddress);
    await issuerTx.wait();
    console.log("Granted ISSUER_ROLE on BloodCertificate to", backendSignerAddress);

    const recorderRole = await registry.RECORDER_ROLE();
    const recorderTx = await registry.grantRole(recorderRole, backendSignerAddress);
    await recorderTx.wait();
    console.log("Granted RECORDER_ROLE on DonationRegistry to", backendSignerAddress);
    manifest.rolesGranted = await certificate.hasRole(issuerRole, backendSignerAddress) && await registry.hasRole(recorderRole, backendSignerAddress);
    checkpoint();
  } else {
    console.log("BACKEND_SIGNER_ADDRESS not set — skipped role grants. Grant manually before backend can call issue()/record().");
  }
  console.log("Deployment manifest:", manifestPath);
}

main().catch((error) => {
  console.error(error.code ? `Deployment failed (${error.code}); inspect the deployment manifest before retrying.` : error.message);
  process.exitCode = 1;
});
