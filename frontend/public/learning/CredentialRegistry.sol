// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Educational example. No personal information or funds should be stored here.
contract CredentialRegistry {
    struct Credential {
        address issuer;
        uint64 expiresAt;
        bool revoked;
        bytes32 commitment;
    }
    address public immutable admin;
    mapping(address => bool) public issuers;
    mapping(bytes32 => Credential) private credentials;
    error Unauthorized();
    error InvalidInput();
    error AlreadyExists();
    error NotFound();
    error AlreadyRevoked();
    event IssuerUpdated(address indexed issuer, bool enabled);
    event Issued(bytes32 indexed id, address indexed issuer, bytes32 commitment, uint64 expiresAt);
    event Revoked(bytes32 indexed id);

    constructor() {
        admin = msg.sender;
        issuers[msg.sender] = true;
        emit IssuerUpdated(msg.sender, true);
    }
    function setIssuer(address issuer, bool enabled) external {
        if (msg.sender != admin) revert Unauthorized();
        if (issuer == address(0)) revert InvalidInput();
        issuers[issuer] = enabled;
        emit IssuerUpdated(issuer, enabled);
    }
    function issue(bytes32 id, bytes32 commitment, uint64 expiresAt) external {
        if (!issuers[msg.sender]) revert Unauthorized();
        if (id == bytes32(0) || commitment == bytes32(0) || expiresAt <= block.timestamp) revert InvalidInput();
        if (credentials[id].issuer != address(0)) revert AlreadyExists();
        credentials[id] = Credential(msg.sender, expiresAt, false, commitment);
        emit Issued(id, msg.sender, commitment, expiresAt);
    }
    // A disabled issuer can still revoke its own old credentials.
    function revoke(bytes32 id) external {
        Credential storage credential = credentials[id];
        if (credential.issuer == address(0)) revert NotFound();
        if (msg.sender != credential.issuer) revert Unauthorized();
        if (credential.revoked) revert AlreadyRevoked();
        credential.revoked = true;
        emit Revoked(id);
    }
    function isValid(bytes32 id) external view returns (bool) {
        Credential memory credential = credentials[id];
        return credential.issuer != address(0) && !credential.revoked && credential.expiresAt > block.timestamp;
    }
    function getCredential(bytes32 id) external view returns (Credential memory) {
        if (credentials[id].issuer == address(0)) revert NotFound();
        return credentials[id];
    }
}
