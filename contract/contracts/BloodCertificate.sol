// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice 헌혈 증서 ERC-721. 필드/이벤트는 backend/contracts/BloodCertificate.sample.abi.json 과 1:1로 맞춘다.
contract BloodCertificate is ERC721, AccessControl, EIP712 {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 private constant TRANSFER_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferAuthorization(address from,address to,uint256 tokenId,bytes32 nonce,uint256 deadline)"
    );

    struct CertificateInfo {
        uint256 issuedAt;
        string issuer;
        bool used;
        uint256 usedAt;
        string usedBy;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => CertificateInfo) private _certificates;
    mapping(bytes32 => bool) public usedTransferAuthorizations;

    event CertificateUsed(uint256 indexed tokenId, string hospital, uint256 timestamp);
    event TransferAuthorizationUsed(bytes32 indexed authorizationHash, address indexed from, address indexed to, uint256 tokenId);

    error CertificateAlreadyUsed(uint256 tokenId);
    error CertificateDoesNotExist(uint256 tokenId);
    error UsedCertificateCannotBeTransferred(uint256 tokenId);
    error TransferAuthorizationExpired(uint256 deadline);
    error TransferAuthorizationAlreadyUsed(bytes32 authorizationHash);
    error InvalidTransferAuthorization();

    constructor(address admin) ERC721("BloodPass Certificate", "BPC") EIP712("BloodPass Certificate", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    function issue(address to, string calldata issuer)
        external
        onlyRole(ISSUER_ROLE)
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        _certificates[tokenId] = CertificateInfo({
            issuedAt: block.timestamp,
            issuer: issuer,
            used: false,
            usedAt: 0,
            usedBy: ""
        });
        _safeMint(to, tokenId);
    }

    /// @dev MVP 단계에서는 발급자(ISSUER_ROLE)와 동일한 relayer가 병원 검증 처리도 대행한다.
    /// 다중 혈액원/병원별 권한 분리가 필요해지면 별도 롤(예: HOSPITAL_ROLE)로 분리한다.
    function markUsed(uint256 tokenId, string calldata hospital) external onlyRole(ISSUER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert CertificateDoesNotExist(tokenId);

        CertificateInfo storage cert = _certificates[tokenId];
        if (cert.used) revert CertificateAlreadyUsed(tokenId);

        cert.used = true;
        cert.usedAt = block.timestamp;
        cert.usedBy = hospital;

        emit CertificateUsed(tokenId, hospital, block.timestamp);
    }

    function isUsed(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert CertificateDoesNotExist(tokenId);
        return _certificates[tokenId].used;
    }

    function certificateInfo(uint256 tokenId)
        external
        view
        returns (uint256 issuedAt, string memory issuer, bool used, uint256 usedAt, string memory usedBy)
    {
        if (_ownerOf(tokenId) == address(0)) revert CertificateDoesNotExist(tokenId);
        CertificateInfo storage cert = _certificates[tokenId];
        return (cert.issuedAt, cert.issuer, cert.used, cert.usedAt, cert.usedBy);
    }

    /// @notice 서명된 양도 의사를 누구나 릴레이할 수 있다. 호출자(백엔드 릴레이어)가 가스비를 지불한다.
    /// @dev 서명은 정확한 수신자, 토큰, 만료 시각, 일회성 nonce에만 유효하다.
    function transferWithAuthorization(
        address from,
        address to,
        uint256 tokenId,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        bytes32 authorizationHash = transferAuthorizationDigest(from, to, tokenId, nonce, deadline);
        if (block.timestamp > deadline) revert TransferAuthorizationExpired(deadline);
        if (usedTransferAuthorizations[authorizationHash]) revert TransferAuthorizationAlreadyUsed(authorizationHash);
        if (_ownerOf(tokenId) != from || ECDSA.recover(authorizationHash, signature) != from) {
            revert InvalidTransferAuthorization();
        }

        usedTransferAuthorizations[authorizationHash] = true;
        _safeTransfer(from, to, tokenId, "");
        emit TransferAuthorizationUsed(authorizationHash, from, to, tokenId);
    }

    function transferAuthorizationDigest(
        address from,
        address to,
        uint256 tokenId,
        bytes32 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            TRANSFER_AUTHORIZATION_TYPEHASH, from, to, tokenId, nonce, deadline
        )));
    }

    /// @notice 백엔드가 가스를 쓰기 전에 서명을 검증하는 읽기 전용 헬퍼.
    function isTransferAuthorizationValid(
        address from,
        address to,
        uint256 tokenId,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external view returns (bool) {
        bytes32 authorizationHash = transferAuthorizationDigest(from, to, tokenId, nonce, deadline);
        return block.timestamp <= deadline
            && !usedTransferAuthorizations[authorizationHash]
            && _ownerOf(tokenId) == from
            && ECDSA.recover(authorizationHash, signature) == from;
    }

    /// @dev 사용 처리된 증서는 이력 보존을 위해 이후 양도를 막는다 (민팅 자체는 막지 않는다).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0) && _certificates[tokenId].used) {
            revert UsedCertificateCannotBeTransferred(tokenId);
        }

        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
