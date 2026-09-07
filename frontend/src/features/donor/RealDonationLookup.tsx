import { useState } from "react";
import { ApiError } from "../../api/client";
import { getDonation, getDonationVerify } from "../../api/donation";
import type { DonationQueryResponse, DonationVerifyResponse } from "../../api/schemas";
import { Badge } from "../../components/Badge";
import styles from "./Donor.module.css";

/**
 * 실제 API 모드(VITE_DEMO_MODE=false) 전용 화면.
 *
 * 백엔드에는 "이 지갑이 헌혈한 이력 전체"를 돌려주는 엔드포인트가 아직 없고
 * (A의 스마트컨트랙트/온체인 인덱싱, B의 DID 매핑이 모두 필요) donation 해시 단위
 * 조회(GET /donation/:hash, GET /donation/verify/:hash)만 가능하다.
 * 그래서 이 화면은 헌혈 시 발급된 해시를 직접 입력해 조회하는 형태로 동작한다.
 *
 * TODO: "내 지갑 주소 → 헌혈 해시 목록"을 돌려주는 API가 생기면
 * DonorMainScreen의 헌혈 이력 목록(HistoryList)을 이 컴포넌트 대신 사용하도록 교체한다.
 */
export function RealDonationLookup() {
  const [hash, setHash] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);
  const [query, setQuery] = useState<DonationQueryResponse | null>(null);
  const [verify, setVerify] = useState<DonationVerifyResponse | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    setNotImplemented(false);
    setQuery(null);
    setVerify(null);

    try {
      const [queryResult, verifyResult] = await Promise.all([getDonation(hash), getDonationVerify(hash)]);
      setQuery(queryResult);
      setVerify(verifyResult);
      setStatus("success");
    } catch (err) {
      if (err instanceof ApiError) {
        setNotImplemented(err.notImplemented);
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
      setStatus("error");
    }
  };

  return (
    <div className={styles.sec} style={{ paddingTop: 20 }}>
      <div className={styles.t2}>헌혈 기록 조회 (실제 API)</div>
      <div className={styles.note}>
        헌혈 인증 시 발급받은 온체인 해시(0x...)를 입력하면 백엔드 API로 실제 조회/검증을 요청합니다.
      </div>

      <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="donation-hash" className="visually-hidden">
          헌혈 기록 해시
        </label>
        <input
          id="donation-hash"
          className="mono"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="0x로 시작하는 64자리 해시"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 13,
            minHeight: 44,
          }}
        />
        <button type="submit" className={styles.btn} disabled={!hash || status === "loading"}>
          {status === "loading" ? "조회 중..." : "조회하기"}
        </button>
      </form>

      {status === "error" && error && (
        <div className={styles.banner} role="alert">
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fail)" }}>
              {notImplemented ? "아직 연결되지 않은 기능" : "조회 실패"}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "#7c2d12" }}>{error}</div>
          </div>
        </div>
      )}

      {status === "success" && query && verify && (
        <div className={`${styles.card} ${styles.journeyCard}`}>
          <div className={styles.row}>
            <span style={{ color: "var(--mute)" }}>해시</span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {query.donationHash}
            </span>
          </div>
          <div className={styles.row}>
            <span style={{ color: "var(--mute)" }}>기록 시각</span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {new Date(query.timestamp * 1000).toLocaleString("ko-KR")}
            </span>
          </div>
          <div className={styles.row}>
            <span style={{ color: "var(--mute)" }}>혈액형 원시값</span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {String(query.bloodType)}
            </span>
          </div>
          <div className={styles.row}>
            <span style={{ color: "var(--mute)" }}>검증 상태</span>
            <Badge variant={verify.verified ? "ok" : "fail"}>{verify.verified ? "검증됨" : "검증 실패"}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
