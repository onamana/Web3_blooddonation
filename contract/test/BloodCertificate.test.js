const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("BloodCertificate", function () {
  async function deploy() {
    const [admin, donor, other, backendSigner] = await ethers.getSigners();
    const BloodCertificate = await ethers.getContractFactory("BloodCertificate");
    const certificate = await BloodCertificate.deploy(admin.address);
    await certificate.waitForDeployment();
    return { certificate, admin, donor, other, backendSigner };
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

  it("returns every certificateInfo field correctly", async function () {
    const { certificate, donor } = await deploy();
    await certificate.issue(donor.address, 2, "대전혈액원");

    const info = await certificate.certificateInfo(0);
    expect(info.bloodType).to.equal(2);
    expect(info.issuer).to.equal("대전혈액원");
    expect(info.used).to.equal(false);
    expect(info.usedAt).to.equal(0);
    expect(info.usedBy).to.equal("");

    const useTx = await certificate.markUsed(0, "충남대병원");
    const useReceipt = await useTx.wait();
    const block = await ethers.provider.getBlock(useReceipt.blockNumber);

    const usedInfo = await certificate.certificateInfo(0);
    expect(usedInfo.used).to.equal(true);
    expect(usedInfo.usedAt).to.equal(block.timestamp);
    expect(usedInfo.usedBy).to.equal("충남대병원");
  });

  it("rejects issue() from an account without ISSUER_ROLE", async function () {
    const { certificate, donor, other } = await deploy();

    await expect(certificate.connect(other).issue(donor.address, 0, "대전혈액원")).to.be.reverted;
  });

  it("rejects issue() with an out-of-range blood type code", async function () {
    const { certificate, donor } = await deploy();

    await expect(certificate.issue(donor.address, 4, "대전혈액원"))
      .to.be.revertedWithCustomError(certificate, "InvalidBloodType")
      .withArgs(4);
    await expect(certificate.issue(donor.address, 255, "대전혈액원"))
      .to.be.revertedWithCustomError(certificate, "InvalidBloodType")
      .withArgs(255);
  });

  it("blocks double use and emits CertificateUsed with hospital/timestamp", async function () {
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

  it("rejects markUsed() from an account without ISSUER_ROLE", async function () {
    const { certificate, donor, other } = await deploy();
    await certificate.issue(donor.address, 0, "대전혈액원");

    await expect(certificate.connect(other).markUsed(0, "서울병원")).to.be.reverted;
  });

  it("reverts markUsed()/isUsed()/certificateInfo() for a token that does not exist", async function () {
    const { certificate } = await deploy();

    await expect(certificate.markUsed(99, "서울병원")).to.be.revertedWithCustomError(
      certificate,
      "CertificateDoesNotExist"
    );
    await expect(certificate.isUsed(99)).to.be.revertedWithCustomError(certificate, "CertificateDoesNotExist");
    await expect(certificate.certificateInfo(99)).to.be.revertedWithCustomError(
      certificate,
      "CertificateDoesNotExist"
    );
  });

  it("transfers an unused certificate and emits Transfer", async function () {
    const { certificate, donor, other } = await deploy();
    await certificate.issue(donor.address, 0, "대전혈액원");

    await expect(certificate.connect(donor).transferFrom(donor.address, other.address, 0))
      .to.emit(certificate, "Transfer")
      .withArgs(donor.address, other.address, 0);

    expect(await certificate.ownerOf(0)).to.equal(other.address);
  });

  it("blocks transferFrom() of a used certificate (backend policy enforced on-chain)", async function () {
    const { certificate, donor, other } = await deploy();
    await certificate.issue(donor.address, 0, "대전혈액원");
    await certificate.markUsed(0, "서울병원");

    await expect(
      certificate.connect(donor).transferFrom(donor.address, other.address, 0)
    ).to.be.revertedWithCustomError(certificate, "UsedCertificateCannotBeTransferred");
  });

  it("allows a backend relayer signer to issue()/markUsed() once granted ISSUER_ROLE", async function () {
    const { certificate, admin, donor, backendSigner } = await deploy();
    const issuerRole = await certificate.ISSUER_ROLE();
    await certificate.connect(admin).grantRole(issuerRole, backendSigner.address);

    await expect(certificate.connect(backendSigner).issue(donor.address, 0, "대전혈액원"))
      .to.emit(certificate, "Transfer")
      .withArgs(ethers.ZeroAddress, donor.address, 0);

    await expect(certificate.connect(backendSigner).markUsed(0, "서울병원"))
      .to.emit(certificate, "CertificateUsed")
      .withArgs(0, "서울병원", anyValue);
  });
});
