import { useState } from "react";
import { issueCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { DEMO_BLOOD_CENTER_NAME, DEMO_MODE } from "../../api/env";
import { DEMO_WALLET_ADDRESS } from "../../data/demoWallet";
import type { BloodType } from "../../types/common";
import type { Certificate } from "../../types/certificate";
import { formatOnchainDateTime } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { formatTokenId } from "./certificateLabels";
import { OnchainProof } from "./OnchainProof";
import { Button } from "./Button";
import styles from "./Certificate.module.css";

const BLOOD_TYPES: BloodType[] = ["A", "B", "AB", "O"];
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/**
 * 화면 5: 혈액원 발급 — 헌혈자 지갑으로 새 증서(ERC-721)를 민팅한다.
 *
 * 이 흐름의 세 번째 주체(혈액원)가 쓰는 화면이다. 발급이 있어야 발급 → 양도 → 검증 →
 * 이중사용 차단까지 증서 한 장의 생애 전체가 한 자리에서 실연된다.
 *
 * 입력은 두 개뿐이다. 나머지는 일부러 받지 않는다:
 * - `issuer`(발급기관): 클라이언트가 정할 수 있으면 검증 화면의 "OO혈액원 발급"이 의미를 잃는다
 * - `issuedAt`, `tokenId`: 컨트랙트(block.timestamp / 자동 증가)가 정한다
 */
export function IssueScreen() {
  const [to, setTo] = useState("");
  const [bloodType, setBloodType] = useState<BloodType>("A");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; notImplemented: boolean } | null>(null);
  const [issued, setIssued] = useState<{ txHash: string; certificate: Certificate } | null>(null);

  const trimmedTo = to.trim();
  const addressValid = ADDRESS_PATTERN.test(trimmedTo);

  const handleReset = () => {
    setTo("");
    setBloodType("A");
    setError(null);
    setIssued(null);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressValid) return;

    setPending(true);
    setError(null);
    setIssued(null);
    try {
      setIssued(await issueCertificate({ to: trimmedTo, bloodType }));
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "발급에 실패했습니다.",
        notImplemented: err instanceof ApiError && err.notImplemented,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.shell}>
      <BrandBar />

      <div className={styles.sessionStrip}>
        <span className={styles.sessionDot} />
        <span className={styles.sessionHospital}>{DEMO_BLOOD_CENTER_NAME}</span>
        <span className={styles.sessionSep}>·</span>
        <span>발급 담당자 화면</span>
        <span className={styles.sessionNetwork}>
          {DEMO_MODE ? "데모 모드 · 온체인 미연결" : "Sepolia 연결됨"}
        </span>
      </div>

      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>증서 발급 · {DEMO_BLOOD_CENTER_NAME}</div>
          <div className={styles.subtitle}>
            헌혈자의 지갑 주소로 증서를 발급합니다. 혈액형은 헌혈자 신고값이 아니라 검사 결과를
            입력하세요.
          </div>
        </div>
      </div>

      {/*
        발급 권한이 아직 컨트랙트/서버 어디에도 없다는 사실을 화면에서 숨기지 않는다.
        발급자 롤(onlyIssuer)이 붙기 전까지는 데모 전용 화면이다.
      */}
      <div className={styles.explain}>
        <div className={styles.explainTitle}>이 화면은 혈액원 직원용입니다</div>
        <p className={styles.explainBody}>
          발급은 양도·사용과 달리 소유자 지갑 서명으로 권한을 증명할 수 없습니다(아직 소유자가
          없습니다). 실제 운영에서는 컨트랙트의 발급자 롤과 직원 인증이 필요하며, 현재 데모에는
          둘 다 없습니다.
        </p>
      </div>

      {!issued && (
        <form className={styles.form} onSubmit={handleIssue}>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>발급기관</span>
              <span className={styles.rowValue}>{DEMO_BLOOD_CENTER_NAME}</span>
            </div>
            <div className={styles.inputHint}>
              발급기관과 발급일시는 입력하지 않습니다 — 서버 설정과 컨트랙트가 정합니다.
            </div>
          </div>

          <label className={styles.fieldLabel} htmlFor="issue-to">
            헌혈자 지갑 주소
          </label>
          <input
            id="issue-to"
            className={`${styles.input} mono`}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x + 40자리"
            spellCheck={false}
          />
          {DEMO_MODE && (
            <div className={styles.recentChips}>
              <span className={styles.recentLabel}>데모</span>
              <button
                type="button"
                className={styles.recentChip}
                onClick={() => setTo(DEMO_WALLET_ADDRESS)}
                disabled={pending}
              >
                데모 지갑 주소 채우기
              </button>
            </div>
          )}
          {trimmedTo !== "" && !addressValid && (
            <div className={styles.inputHint}>이더리움 주소 형식(0x + 40자리 hex)이 아닙니다.</div>
          )}

          <label className={styles.fieldLabel} htmlFor="issue-blood-type">
            혈액형 (검사 결과)
          </label>
          <select
            id="issue-blood-type"
            className={styles.input}
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value as BloodType)}
          >
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}형
              </option>
            ))}
          </select>

          <Button type="submit" block disabled={!addressValid || pending}>
            {pending ? "발급 중..." : "발급하기"}
          </Button>
        </form>
      )}

      {error && (
        <div className={error.notImplemented ? styles.bannerWarn : styles.banner} role="alert">
          <span className={styles.bannerHead}>
            {error.notImplemented ? "증서 컨트랙트 연결 대기 중" : "발급할 수 없습니다"}
          </span>
          {error.notImplemented
            ? "스마트컨트랙트가 배포되면 별도 작업 없이 정상 동작합니다. 입력 문제가 아닙니다."
            : error.message}
        </div>
      )}

      {issued && (
        <>
          <div className={`${styles.verdict} ${styles.verdictOk}`}>
            <div className={`${styles.verdictMark} ${styles.verdictMarkOk}`}>✓</div>
            <div className={`${styles.verdictTitle} ${styles.verdictTitleOk}`}>발급 완료</div>
            <div className={`${styles.verdictDesc} ${styles.verdictDescOk}`}>
              {formatTokenId(issued.certificate.tokenId)} · {issued.certificate.bloodType}형
            </div>
            <OnchainProof txHash={issued.txHash} />
            <div className={styles.verdictMeta}>
              이 번호를 헌혈자에게 전달하면 병원 검증에서 바로 조회됩니다.
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>소유자</span>
              <span className={styles.rowValue}>
                <AddressDisplay address={issued.certificate.owner} />
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>발급기관</span>
              <span className={styles.rowValue}>{issued.certificate.issuer}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>발급 시각</span>
              <span className={`${styles.rowValue} mono`}>
                {formatOnchainDateTime(issued.certificate.issuedAt)}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <Button onClick={handleReset}>새 증서 발급</Button>
            <Button to={`/certificates/${issued.certificate.tokenId}`}>
              증서 상세 보기
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
