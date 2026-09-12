import { Fragment, useEffect, useRef, useState } from "react";
import { issueCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { DEMO_BLOOD_CENTER_NAME, DEMO_MODE } from "../../api/env";
import { DEMO_WALLET_ADDRESS } from "../../data/demoWallet";
import type { Certificate, DonationType } from "../../types/certificate";
import { formatOnchainDateTime } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { BlockingLoader } from "./BlockingLoader";
import { Button } from "./Button";
import { FlipCertificateCard } from "./FlipCertificateCard";
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
// 이전 버전은 성공한 키도 남겨 동일 payload의 발급을 재사용했다. v2부터 성공 시 즉시 지운다.
const PENDING_ISSUE_KEY = "bloodpass.pendingIssue.v2";

/** 혈액원 담당자가 검사가 끝난 헌혈 건을 헌혈자 지갑으로 발급하는 데모 화면. */
export function IssueScreen() {
  const request = useRef<{ payload: string; id: string } | null>(null);
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
  const previewCertificate: Certificate = {
    tokenId: "—",
    owner: addressValid ? trimmedTo : "0x0000000000000000000000000000000000000000",
    donationType,
    volumeMl: issuedVolumeMl,
    issuedAt: Math.floor(Date.now() / 1000),
    issuer: DEMO_BLOOD_CENTER_NAME,
    status: "active",
    usedAt: null,
    usedBy: null,
    history: [],
  };

  const handleReset = () => {
    request.current = null;
    sessionStorage.removeItem(PENDING_ISSUE_KEY);
    setTo("");
    setDonationType("WHOLE_BLOOD");
    setVolumeMl(320);
    setError(null);
    setIssued(null);
  };

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addressValid || pending) return;

    const payload = JSON.stringify({ to: trimmedTo.toLowerCase(), donationType, volumeMl: issuedVolumeMl });
    if (!request.current) {
      try { request.current = JSON.parse(sessionStorage.getItem(PENDING_ISSUE_KEY) || "null"); }
      catch { request.current = null; }
    }
    if (!request.current || request.current.payload !== payload) {
      request.current = { payload, id: crypto.randomUUID() };
    }
    sessionStorage.setItem(PENDING_ISSUE_KEY, JSON.stringify(request.current));

    setPending(true);
    setError(null);
    setIssued(null);
    try {
      const result = await issueCertificate({
        to: trimmedTo,
        donationType,
        volumeMl: issuedVolumeMl,
        requestId: request.current.id,
      });
      // 성공한 발급 키는 재사용하면 같은 온체인 증서를 다시 돌려준다. 응답을 받은
      // 시점에는 재시도 보호가 끝났으므로 비워 다음 발급에서 새 tokenId를 만들게 한다.
      request.current = null;
      sessionStorage.removeItem(PENDING_ISSUE_KEY);
      setIssued(result);
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
      {pending && <BlockingLoader message="증서를 발급 중입니다..." />}


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
                        <div className={styles.issueVolumeChoices} role="radiogroup" aria-label="전혈 헌혈량">
                          {([320, 400] as const).map((amount) => (
                            <Fragment key={amount}>
                              <input
                                className={styles.issueVolumeRadio}
                                type="radio"
                                id={`issue-volume-${amount}`}
                                name="issue-volume"
                                value={amount}
                                checked={volumeMl === amount}
                                onChange={() => setVolumeMl(amount)}
                                disabled={pending}
                              />
                              <label className={styles.issueVolumeTab} htmlFor={`issue-volume-${amount}`}>
                                {amount}
                              </label>
                            </Fragment>
                          ))}
                          <span className={styles.issueVolumeGlider} aria-hidden="true" />
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

            <div className={styles.issuePreviewCard} aria-label="발급될 혈액증서 미리보기">
              <FlipCertificateCard
                certificate={previewCertificate}
                previewOnly
                flipped={false}
                tiltActive={false}
                transferOpen={false}
                transferPending={false}
                onOpenTransfer={() => {}}
                onCancelTransfer={() => {}}
                onTransfer={() => {}}
              />
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
