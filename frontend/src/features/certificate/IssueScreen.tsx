import { Fragment, useEffect, useState } from "react";
import { issueCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { DEMO_BLOOD_CENTER_NAME, DEMO_MODE } from "../../api/env";
import { DEMO_WALLET_ADDRESS } from "../../data/demoWallet";
import type { Certificate, DonationType } from "../../types/certificate";
import { shortenAddress } from "../../utils/address";
import { formatOnchainDateTime } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { Button } from "./Button";
import { formatTokenId } from "./certificateLabels";
import { OnchainProof } from "./OnchainProof";
import styles from "./Certificate.module.css";

const DONATION_TYPES: { value: DonationType; label: string }[] = [
  { value: "WHOLE_BLOOD", label: "전혈" },
  { value: "PLASMA", label: "혈장" },
  { value: "PLATELETS", label: "혈소판" },
  { value: "PLATELETS_PLASMA", label: "혈소판·혈장" },
];

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/** 혈액원 담당자가 검사가 끝난 헌혈 건을 헌혈자 지갑으로 발급하는 데모 화면. */
export function IssueScreen() {
  const [to, setTo] = useState("");
  const [donationType, setDonationType] = useState<DonationType>("WHOLE_BLOOD");
  const [volumeMl, setVolumeMl] = useState<320 | 400>(320);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; notImplemented: boolean } | null>(null);
  const [issued, setIssued] = useState<{ txHash: string; certificate: Certificate } | null>(null);

  useEffect(() => {
    document.body.dataset.screen = "issue";
    return () => {
      delete document.body.dataset.screen;
    };
  }, []);

  const trimmedTo = to.trim();
  const addressValid = ADDRESS_PATTERN.test(trimmedTo);
  const issuedVolumeMl = donationType === "WHOLE_BLOOD" ? volumeMl : undefined;
  const donationTypeLabel = DONATION_TYPES.find(({ value }) => value === donationType)?.label;

  const handleReset = () => {
    setTo("");
    setDonationType("WHOLE_BLOOD");
    setVolumeMl(320);
    setError(null);
    setIssued(null);
  };

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addressValid) return;

    setPending(true);
    setError(null);
    setIssued(null);
    try {
      setIssued(
        await issueCertificate({
          to: trimmedTo,
          donationType,
          volumeMl: issuedVolumeMl,
        }),
      );
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
    <div className={`${styles.shell} ${styles.issueShell}`}>
      <BrandBar />


      {!issued ? (
        <form className={styles.issueComposer} onSubmit={handleIssue}>
          <section className={`${styles.issueInputSection} ${styles.issueWalletSection}`}>
              <div className={styles.issueInputHead}>
                <span>01</span>
                <div>
                  <h2>헌혈증서 발급 대상 지갑</h2>
                  <p>검사정보가 등록된 헌혈자의 지갑 주소를 입력합니다.</p>
                </div>
              </div>

              <label className={styles.srOnly} htmlFor="issue-to">헌혈자 지갑 주소</label>
              <div className={styles.issueAddressBox} data-valid={addressValid}>
                <span className={styles.issueAddressPrefix}>ID</span>
                <input
                  id="issue-to"
                  type="text"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  placeholder="EVM 지갑 주소를 입력하세요"
                  spellCheck={false}
                  autoComplete="off"
                  disabled={pending}
                />
                {to !== "" && (
                  <button
                    type="button"
                    className={styles.issueAddressClear}
                    aria-label="입력한 지갑 주소 지우기"
                    onClick={() => setTo("")}
                    disabled={pending}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className={styles.issueAddressAssist}>
                <span>
                  {trimmedTo !== "" && !addressValid
                    ? "올바른 이더리움 주소 형식이 아닙니다."
                    : "주소는 증서의 최초 소유자로 기록됩니다."}
                </span>
                {DEMO_MODE && (
                  <button type="button" onClick={() => setTo(DEMO_WALLET_ADDRESS)} disabled={pending}>
                    데모 주소 불러오기
                  </button>
                )}
              </div>
            </section>

          <section className={`${styles.issueInputSection} ${styles.issueDonationSection}`}>
              <div className={styles.issueInputHead}>
                <span>02</span>
                <div>
                  <h2>헌혈 종류</h2>
                  <p>이번 증서에 연결할 헌혈 종류를 선택합니다.</p>
                </div>
              </div>

              <div className={styles.issueTypeGrid} role="radiogroup" aria-label="헌혈 종류">
                {DONATION_TYPES.map(({ value, label }) => (
                  <Fragment key={value}>
                    <label
                      className={styles.issueTypeOption}
                      data-active={donationType === value}
                      data-disabled={pending}
                    >
                      <input
                        type="checkbox"
                        role="radio"
                        aria-checked={donationType === value}
                        className={styles.issueTypeCheck}
                        checked={donationType === value}
                        onChange={() => setDonationType(value)}
                        disabled={pending}
                      />
                      <strong>{label}</strong>
                    </label>

                    {value === "WHOLE_BLOOD" && donationType === "WHOLE_BLOOD" && (
                      <div className={styles.issueVolumeBlock}>
                        <div className={styles.issueVolumeChoices} role="group" aria-label="전혈 헌혈량">
                          {([320, 400] as const).map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              data-active={volumeMl === amount}
                              aria-pressed={volumeMl === amount}
                              aria-label={`${amount}mL`}
                              onClick={() => setVolumeMl(amount)}
                              disabled={pending}
                            >
                              <strong>{amount}</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </section>

          <aside className={styles.issuePreview}>
            <div className={styles.issuePreviewTop}>
              <span>발급 미리보기</span>
              <small>PREVIEW</small>
            </div>

            <div className={styles.issuePreviewBody}>
              <div className={styles.issuePreviewMark}>BP</div>
              <span className={styles.issuePreviewToken}>TOKEN ID · AUTO</span>
              <h2>{donationTypeLabel} 헌혈증서</h2>
              {issuedVolumeMl && <div className={styles.issuePreviewVolume}>{issuedVolumeMl} mL</div>}

              <div className={styles.issuePreviewRows}>
                <div>
                  <span>수령 지갑</span>
                  <strong className="mono">
                    {addressValid ? shortenAddress(trimmedTo) : "주소 입력 대기"}
                  </strong>
                </div>
                <div>
                  <span>발급기관</span>
                  <strong>{DEMO_BLOOD_CENTER_NAME}</strong>
                </div>
                <div>
                  <span>발급 시각</span>
                  <strong>블록 확정 시 자동 기록</strong>
                </div>
                <div>
                  <span>초기 상태</span>
                  <strong className={styles.issueReadyText}>사용 가능</strong>
                </div>
              </div>
            </div>

            <div className={styles.issuePrivacyStrip}>
              <span>PRIVATE</span>
              혈액형은 오프체인 검사정보에서 확인하며 증서에 공개하지 않습니다.
            </div>

            {error && (
              <div className={error.notImplemented ? styles.bannerWarn : styles.banner} role="alert">
                <span className={styles.bannerHead}>
                  {error.notImplemented ? "증서 컨트랙트 연결 대기 중" : "발급할 수 없습니다"}
                </span>
                {error.notImplemented ? "외부 모듈 연결 상태를 확인해 주세요." : error.message}
              </div>
            )}

            <Button type="submit" className={styles.issueIssueButton} disabled={!addressValid || pending}>
              {pending ? "발급 중..." : "증서 발급하기"}
            </Button>
            <p className={styles.issueSubmitNote}>발급 후 소유자와 발급 이력이 온체인에 기록됩니다.</p>
          </aside>
        </form>
      ) : (
        <section className={`${styles.issuePanel} ${styles.issueSuccessPanel}`}>
          <div className={styles.issueSuccessMark}>✓</div>
          <span className={styles.issueStep}>ISSUE COMPLETE</span>
          <h2>헌혈증서가 발급되었습니다</h2>
          <p className={styles.issueSuccessSummary}>
            {formatTokenId(issued.certificate.tokenId)} · {donationTypeLabel}
            {issuedVolumeMl ? ` ${issuedVolumeMl}mL` : ""}
          </p>
          <OnchainProof txHash={issued.txHash} />

          <div className={styles.issueReceipt}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>소유자</span>
              <span className={styles.rowValue}><AddressDisplay address={issued.certificate.owner} /></span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>헌혈 종류</span>
              <span className={styles.rowValue}>{donationTypeLabel}</span>
            </div>
            {issuedVolumeMl && (
              <div className={styles.row}>
                <span className={styles.rowLabel}>헌혈량</span>
                <span className={styles.rowValue}>{issuedVolumeMl}mL</span>
              </div>
            )}
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

          <div className={styles.issueSuccessActions}>
            <Button variant="arrow" onClick={handleReset}>새 증서 발급</Button>
            <Button to={`/certificates/${issued.certificate.tokenId}`}>증서 상세 보기</Button>
          </div>
        </section>
      )}

    </div>
  );
}
