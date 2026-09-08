import { Link } from "react-router-dom";
import styles from "./Certificate.module.css";

interface BrandBarProps {
  /** 우측에 놓을 동작 버튼들. styles.actionBtn 을 써서 모양을 통일한다. */
  children?: React.ReactNode;
}

/** 모든 화면 상단에 서비스명을 노출한다. 브랜드를 누르면 증서 목록으로 돌아간다. */
export function BrandBar({ children }: BrandBarProps) {
  return (
    <div className={styles.brandBar}>
      <Link to="/certificates" className={styles.brand}>
        {/*
          픽셀 아트라서 배율이 정수여야 흐려지지 않는다. 48px 원본을 24px로 쓰면
          일반 화면에서 2:1, 레티나에서 1:1 로 딱 맞는다.
        */}
        <img
          className={styles.brandMark}
          src="/favicons/favicon-48.png"
          width={24}
          height={24}
          alt=""
        />
        <span className={styles.brandName}>BloodPass</span>
      </Link>
      {children && <div className={styles.brandActions}>{children}</div>}
    </div>
  );
}
