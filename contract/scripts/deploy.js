const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;

  console.log("Deployer:", deployer.address);

  const BloodCertificate = await hre.ethers.getContractFactory("BloodCertificate");
  const certificate = await BloodCertificate.deploy(deployer.address);
  await certificate.waitForDeployment();
  console.log("BloodCertificate deployed:", await certificate.getAddress());

  const DonationRegistry = await hre.ethers.getContractFactory("DonationRegistry");
  const registry = await DonationRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log("DonationRegistry deployed:", await registry.getAddress());

  if (backendSignerAddress) {
    const issuerRole = await certificate.ISSUER_ROLE();
    await certificate.grantRole(issuerRole, backendSignerAddress);
    console.log("Granted ISSUER_ROLE on BloodCertificate to", backendSignerAddress);

    const recorderRole = await registry.RECORDER_ROLE();
    await registry.grantRole(recorderRole, backendSignerAddress);
    console.log("Granted RECORDER_ROLE on DonationRegistry to", backendSignerAddress);
  } else {
    console.log("BACKEND_SIGNER_ADDRESS not set — skipped role grants. Grant manually before backend can call issue()/record().");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
