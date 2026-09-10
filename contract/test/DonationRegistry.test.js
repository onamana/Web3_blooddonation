const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DonationRegistry", function () {
  async function deploy() {
    const [admin, other] = await ethers.getSigners();
    const DonationRegistry = await ethers.getContractFactory("DonationRegistry");
    const registry = await DonationRegistry.deploy(admin.address);
    await registry.waitForDeployment();
    const donationHash = ethers.keccak256(ethers.toUtf8Bytes("donor-1:2026-09-10"));
    return { registry, admin, other, donationHash };
  }

  it("records a donation from an account with RECORDER_ROLE and emits DonationRecorded", async function () {
    const { registry, donationHash } = await deploy();
    const timestamp = Math.floor(Date.now() / 1000);

    await expect(registry.record(donationHash, timestamp, 1))
      .to.emit(registry, "DonationRecorded")
      .withArgs(donationHash, timestamp, 1);
  });

  it("verify() reflects whether a hash has been recorded", async function () {
    const { registry, donationHash } = await deploy();

    expect(await registry.verify(donationHash)).to.equal(false);
    await registry.record(donationHash, Math.floor(Date.now() / 1000), 1);
    expect(await registry.verify(donationHash)).to.equal(true);
  });

  it("query() returns the recorded timestamp and bloodType", async function () {
    const { registry, donationHash } = await deploy();
    const timestamp = Math.floor(Date.now() / 1000);

    await registry.record(donationHash, timestamp, 2);

    const result = await registry.query(donationHash);
    expect(result.timestamp).to.equal(timestamp);
    expect(result.bloodType).to.equal(2);
  });

  it("rejects recording the same hash twice", async function () {
    const { registry, donationHash } = await deploy();
    const timestamp = Math.floor(Date.now() / 1000);

    await registry.record(donationHash, timestamp, 0);
    await expect(registry.record(donationHash, timestamp, 0)).to.be.revertedWithCustomError(
      registry,
      "DonationAlreadyRecorded"
    );
  });

  it("rejects record() from an account without RECORDER_ROLE", async function () {
    const { registry, other, donationHash } = await deploy();

    await expect(registry.connect(other).record(donationHash, Math.floor(Date.now() / 1000), 0)).to.be.reverted;
  });

  it("rejects record() with an out-of-range blood type code", async function () {
    const { registry, donationHash } = await deploy();
    const timestamp = Math.floor(Date.now() / 1000);

    await expect(registry.record(donationHash, timestamp, 4))
      .to.be.revertedWithCustomError(registry, "InvalidBloodType")
      .withArgs(4);
    await expect(registry.record(donationHash, timestamp, 255))
      .to.be.revertedWithCustomError(registry, "InvalidBloodType")
      .withArgs(255);
  });

  it("rejects query() for a hash that was never recorded", async function () {
    const { registry, donationHash } = await deploy();

    await expect(registry.query(donationHash)).to.be.revertedWithCustomError(registry, "DonationNotFound");
  });
});
