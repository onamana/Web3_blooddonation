// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice 헌혈 증서 ERC-721. 필드/이벤트는 backend/contracts/BloodCertificate.sample.abi.json 과 1:1로 맞춘다.
contract BloodCertificate is ERC721, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct CertificateInfo {
        uint256 issuedAt;
        string issuer;
        bool used;
        uint256 usedAt;
        string usedBy;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => CertificateInfo) private _certificates;

    event CertificateUsed(uint256 indexed tokenId, string hospital, uint256 timestamp);

    error CertificateAlreadyUsed(uint256 tokenId);
    error CertificateDoesNotExist(uint256 tokenId);
    error UsedCertificateCannotBeTransferred(uint256 tokenId);

    constructor(address admin) ERC721("BloodPass Certificate", "BPC") {
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
