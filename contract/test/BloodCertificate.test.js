const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("BloodCertificate", function () {
  async function deploy() {
    const [admin, donor, other] = await ethers.getSigners();
    const BloodCertificate = await ethers.getContractFactory("BloodCertificate");
    const certificate = await BloodCertificate.deploy(admin.address);
    await certificate.waitForDeployment();
    return { certificate, admin, donor, other };
  }

  it("issues a certificate and emits Transfer(0x0 -> to)", async function () {
    const { certificate, admin, donor } = await deploy();

    await expect(certificate.issue(donor.address, 0, "대전혈액원"))
      .to.emit(certificate, "Transfer")
      .withArgs(ethers.ZeroAddress, donor.address, 0);

    expect(await certificate.ownerOf(0)).to.equal(donor.address);

    const info = await certificate.certificateInfo(0);
    expect(info.bloodType).to.equal(0);
    expect(info.issuer).to.equal("대전혈액원");
    expect(info.used).to.equal(false);
  });

  it("rejects issue() from an account without ISSUER_ROLE", async function () {
    const { certificate, donor, other } = await deploy();

    await expect(certificate.connect(other).issue(donor.address, 0, "대전혈액원")).to.be.reverted;
  });

  it("blocks double use", async function () {
    const { certificate, donor } = await deploy();
    await certificate.issue(donor.address, 0, "대전혈액원");

    await expect(certificate.markUsed(0, "서울병원"))
      .to.emit(certificate, "CertificateUsed")
      .withArgs(0, "서울병원", anyValue);

    expect(await certificate.isUsed(0)).to.equal(true);
    await expect(certificate.markUsed(0, "다른병원")).to.be.revertedWithCustomError(
      certificate,
      "CertificateAlreadyUsed"
    );
  });
});
