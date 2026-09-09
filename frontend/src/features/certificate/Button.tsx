import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons";
import styles from "./Certificate.module.css";

/** 클릭 지점에서 번져 나가는 원 하나. 애니메이션이 끝나면 지운다(원본과 동일). */
interface Ripple {
  key: number;
  x: number;
  y: number;
  size: number;
}

/**
 * 앱 전체 공용 버튼.
 *
 * 원본: 21st.dev @moumensoliman/native-button (shadcn Button 기반).
 * 실제 프리뷰에서 측정한 동작을 그대로 옮겼다 — 호버에서 배경 알파 0.9 + 그림자 md→lg,
 * `:active`는 호버와 완전히 동일(커스텀 클릭 연출 없음).
 *
 * 원본과 다르게 한 것은 두 가지뿐이다:
 * - 색: 원본의 거의 검정 대신 브랜드 레드(--pri)
 * - 크기: 원본 h-48/px-28/14px 대신 배치에 맞춘 40px(md) / 34px(sm)
 */
interface ButtonBaseProps {
  children: React.ReactNode;
  /**
   * solid  — 기본. 위에 설명한 native-button.
   * arrow  — 21st.dev @jakobhoeg/button. 그림자가 없고, 호버하면 오른쪽에서 화살표가 밀려 들어온다.
   * ripple — 21st.dev @dillionverma/ripple-button. 클릭 전엔 아이보리, 클릭하면 레드가 번지며 물든다.
   * push   — 두 겹 3D 버튼. 호버하면 들리고 누르면 눌러앉는다.
   */
  variant?: "solid" | "arrow" | "ripple" | "push";
  /** sm은 상단 바의 이동 버튼용. */
  size?: "md" | "sm";
  /** 폼 안에서 전체 폭을 차지해야 할 때 */
  block?: boolean;
  className?: string;
}

interface ButtonLinkProps extends ButtonBaseProps {
  /** 주면 react-router Link로, 없으면 button으로 렌더한다. */
  to: string;
  href?: never;
  type?: never;
  onClick?: never;
  disabled?: never;
}

/** 앱 밖으로 나가는 링크 (새 탭). */
interface ButtonHrefProps extends ButtonBaseProps {
  href: string;
  to?: never;
  type?: never;
  onClick?: never;
  disabled?: never;
}

interface ButtonActionProps extends ButtonBaseProps {
  to?: never;
  href?: never;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}

export type ButtonProps = ButtonLinkProps | ButtonHrefProps | ButtonActionProps;

export function Button(props: ButtonProps) {
  const { children, variant = "solid", size = "md", block = false, className = "" } = props;

  const [ripples, setRipples] = useState<Ripple[]>([]);
  // 한 번 클릭하면 레드로 물든 상태를 유지한다.
  const [filled, setFilled] = useState(false);

  /** 원본 계산식: size = max(너비, 높이), 클릭 지점을 원의 중심으로 둔다. */
  const spawnRipple = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    setRipples((prev) => [
      ...prev,
      {
        key: Date.now(),
        size,
        x: e.clientX - rect.left - size / 2,
        y: e.clientY - rect.top - size / 2,
      },
    ]);
    setFilled(true);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "ripple") spawnRipple(e);
    props.onClick?.();
  };

  const classes = [
    styles.btn,
    variant === "arrow" ? styles.btnArrow : "",
    variant === "ripple" ? styles.btnRipple : "",
    variant === "push" ? styles.btnPush : "",
    variant === "ripple" && filled ? styles.btnRippleFilled : "",
    size === "sm" ? styles.btnSm : "",
    block ? styles.btnBlock : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // 원본의 내부 span. 나중에 아이콘을 넣어도 라벨과 간격이 맞는다.
  // arrow 변형은 원본과 같이 아이콘 칸을 라벨의 형제로 둔다(라벨 안이 아니다).
  const label = (
    <>
      <span className={styles.btnLabel}>{children}</span>
      {variant === "arrow" && (
        <span className={styles.btnIcon}>
          <ArrowRightIcon size={16} />
        </span>
      )}
      {variant === "ripple" && (
        <span className={styles.btnRippleLayer} aria-hidden="true">
          {ripples.map((ripple) => (
            <span
              key={ripple.key}
              className={styles.btnRippleDot}
              style={{
                width: ripple.size,
                height: ripple.size,
                left: ripple.x,
                top: ripple.y,
              }}
              onAnimationEnd={() =>
                setRipples((prev) => prev.filter((r) => r.key !== ripple.key))
              }
            />
          ))}
        </span>
      )}
    </>
  );

  if (props.to !== undefined) {
    return (
      <Link className={classes} to={props.to}>
        {label}
      </Link>
    );
  }

  if (props.href !== undefined) {
    return (
      <a className={classes} href={props.href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type={props.type ?? "button"}
      onClick={handleClick}
      disabled={props.disabled}
    >
      {label}
    </button>
  );
}
