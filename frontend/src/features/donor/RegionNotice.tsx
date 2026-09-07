import { PinIcon } from "../../components/icons";
import styles from "./Donor.module.css";

export function RegionNotice({ region }: { region: string }) {
  return (
    <div className={styles.sec} style={{ paddingBottom: 24 }}>
      <div className={`${styles.card} ${styles.regionCard}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "var(--pri)", display: "flex" }}>
            <PinIcon />
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>내 혈액이 사용된 지역: {region}</span>
        </div>
        <div className={styles.note}>환자 정보와 병원별 사용 내역은 공개되지 않습니다. 지역 단위까지만 확인할 수 있습니다.</div>
      </div>
      <div className={`${styles.footNote} mono`}>모든 수치는 가상 데모 데이터입니다.</div>
    </div>
  );
}
