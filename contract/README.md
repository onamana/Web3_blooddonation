# contract

Hardhat 2 + Solidity 0.8.24 + OpenZeppelin ERC-721/AccessControl.
현재 버전은 두 컨트랙트 모두 혈액형 필드를 사용하지 않습니다.

## 함수

- BloodCertificate: `issue(address to, string issuer)`, `certificateInfo(tokenId)`, `isUsed(tokenId)`, `markUsed(tokenId, hospital)`.
- DonationRegistry: `record(bytes32 donationHash, uint256 timestamp)`, `verify(hash)`, `query(hash)`.
- 발급/사용: ISSUER_ROLE. 기록: RECORDER_ROLE. 배포자는 관리자와 해당 롤을 갖습니다.
- 소유자가 직접 safeTransferFrom으로 양도합니다. 사용된 증서는 transferFrom/safeTransferFrom 모두 차단됩니다.
- 헌혈 종류·헌혈량은 백엔드 SQLite에 보관하고, 혈액형/Rh는 온체인에 올리지 않습니다.

## 컴파일과 테스트

```powershell
npm ci
npm run compile
npm test
npm run sync:abi
```

sync:abi는 실제 artifact의 abi 배열로 backend/contracts의 두 ABI를 갱신합니다.
ABI 변경 후에는 백엔드 호출/응답과 프론트 통합 테스트도 검증해야 합니다.

## 배포 (Sepolia)

처음 환경 설정은 `.env.example` 참고.
새 컴퓨터에서 기존 환경파일이 전혀 없으면 `npm run setup:demo`로 임시 지갑과 공개 RPC 설정을 만들 수 있습니다.
개인키는 출력하지 않고 .env에만 저장합니다. 무료 Sepolia 테스트 ETH는 별도로 받아야 합니다.

```powershell
npm run preflight:sepolia
npm run deploy:sepolia
```

preflight는 두 RPC의 체인, 백엔드 지갑 일치, 가스 예산을 검사합니다.
배포 스크립트는 두 컨트랙트를 새로 생성하고 백엔드 signer에 롤을 부여합니다.
진행 상태는 deployments/sepolia-*.json에 기록합니다. 부분 실패 시 기록을 확인하고 이어서 처리해야 합니다.

## 현재 배포 (2026-09-10)

| 항목 | 값 |
| --- | --- |
| BloodCertificate | 0x622bC4B23a5e13CA4d5208b578c38e8d360944fB |
| DonationRegistry | 0x689390A0D4aD3F0e5ae49a0362785035507CbFb4 |
| 증서 배포 블록 | 11675549 |
| 배포자/백엔드 relayer | 0x3B79f76063e251dd5C46422936dfDA169e509A63 |

[배포/권한 manifest](deployments/sepolia-1789050854974.json).
[실제 Sepolia 발급·양도·사용 및 차단 검증](deployments/sepolia-smoke-1789050986200.json) 완료.
`npm run check:deployment`로 배포 bytecode와 ABI/권한/프론트 주소 일치를 다시 확인할 수 있다.
이전 혈액형 포함 버전의 두 주소는 이 ABI와 호환되지 않습니다.
기존 온체인 기록 삭제나 증서 자동 이전은 수행하지 않습니다.

## 소스 검증

Etherscan API 키를 설정한 경우 각 주소에 대해 실행합니다.

```powershell
npm run verify:sepolia -- <새주소> <배포지갑주소>
```

Etherscan 키가 없으면 이 단계는 별도로 남습니다. 배포/실거래 검증과 소스 공개 검증은 다릅니다.
환경변수 연결과 전체 실행 절차는 [통합 가이드](../docs/contract-integration.md)를 참고하세요.
