// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice 헌혈 이력 해시 등록 컨트랙트. backend/contracts/DonationRegistry.sample.abi.json 과 1:1로 맞춘다.
/// 온체인에는 불투명한 기록 식별자의 해시와 타임스탬프만 저장한다. 혈액형은 저장하지 않는다.
contract DonationRegistry is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    struct Donation {
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Donation) private _donations;

    event DonationRecorded(bytes32 indexed donationHash, uint256 timestamp);

    error DonationAlreadyRecorded(bytes32 donationHash);
    error DonationNotFound(bytes32 donationHash);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
    }

    function record(bytes32 donationHash, uint256 timestamp) external onlyRole(RECORDER_ROLE) {
        if (_donations[donationHash].exists) revert DonationAlreadyRecorded(donationHash);

        _donations[donationHash] = Donation({timestamp: timestamp, exists: true});

        emit DonationRecorded(donationHash, timestamp);
    }

    function verify(bytes32 donationHash) external view returns (bool) {
        return _donations[donationHash].exists;
    }

    function query(bytes32 donationHash) external view returns (uint256 timestamp) {
        Donation storage donation = _donations[donationHash];
        if (!donation.exists) revert DonationNotFound(donationHash);
        return donation.timestamp;
    }
}
