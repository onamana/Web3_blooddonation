// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice 헌혈 이력 해시 등록 컨트랙트. backend/contracts/DonationRegistry.sample.abi.json 과 1:1로 맞춘다.
/// 온체인에는 익명 해시/타임스탬프/혈액형만 올라가고 실명 등 개인정보는 올라가지 않는다 (루트 README "데이터 분리 원칙").
contract DonationRegistry is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    struct Donation {
        uint256 timestamp;
        uint8 bloodType;
        bool exists;
    }

    mapping(bytes32 => Donation) private _donations;

    event DonationRecorded(bytes32 indexed donationHash, uint256 timestamp, uint8 bloodType);

    error DonationAlreadyRecorded(bytes32 donationHash);
    error DonationNotFound(bytes32 donationHash);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
    }

    function record(bytes32 donationHash, uint256 timestamp, uint8 bloodType) external onlyRole(RECORDER_ROLE) {
        if (_donations[donationHash].exists) revert DonationAlreadyRecorded(donationHash);

        _donations[donationHash] = Donation({timestamp: timestamp, bloodType: bloodType, exists: true});

        emit DonationRecorded(donationHash, timestamp, bloodType);
    }

    function verify(bytes32 donationHash) external view returns (bool) {
        return _donations[donationHash].exists;
    }

    function query(bytes32 donationHash) external view returns (uint256 timestamp, uint8 bloodType) {
        Donation storage donation = _donations[donationHash];
        if (!donation.exists) revert DonationNotFound(donationHash);
        return (donation.timestamp, donation.bloodType);
    }
}
