const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;

  console.log("Deployer:", deployer.address);

  const BloodCertificate = await hre.ethers.getContractFactory("BloodCertificate");
  const certificate = await BloodCertificate.deploy(deployer.address);
  const certificateReceipt = await certificate.deploymentTransaction().wait();
  console.log("BloodCertificate deployed:", await certificate.getAddress());
  console.log("BloodCertificate deploy block (set as backend CERTIFICATE_DEPLOY_BLOCK):", certificateReceipt.blockNumber);

  const DonationRegistry = await hre.ethers.getContractFactory("DonationRegistry");
  const registry = await DonationRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log("DonationRegistry deployed:", await registry.getAddress());

  if (backendSignerAddress) {
    const issuerRole = await certificate.ISSUER_ROLE();
    const issuerTx = await certificate.grantRole(issuerRole, backendSignerAddress);
    await issuerTx.wait();
    console.log("Granted ISSUER_ROLE on BloodCertificate to", backendSignerAddress);

    const recorderRole = await registry.RECORDER_ROLE();
    const recorderTx = await registry.grantRole(recorderRole, backendSignerAddress);
    await recorderTx.wait();
    console.log("Granted RECORDER_ROLE on DonationRegistry to", backendSignerAddress);
  } else {
    console.log("BACKEND_SIGNER_ADDRESS not set — skipped role grants. Grant manually before backend can call issue()/record().");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
