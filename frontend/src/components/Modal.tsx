import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  /** 배경 클릭 · Esc · 닫기 버튼에서 모두 호출된다. */
  onClose: () => void;
  title: string;
  /** 제목 아래 본문 */
  children: ReactNode;
  /** 하단 동작 버튼들 */
  actions?: ReactNode;
  /** 제목 왼쪽에 놓을 아이콘 (경고 표시 등) */
  icon?: ReactNode;
}

/**
 * 네이티브 <dialog>를 쓰는 모달.
 *
 * 직접 오버레이를 만들지 않고 <dialog>.showModal()을 쓰면 포커스 가둠, Esc 닫기,
 * top-layer 배치(다른 요소의 z-index와 싸울 필요 없음)를 브라우저가 해준다.
 *
 * 배경 클릭으로 닫으려면 ::backdrop 이 아니라 dialog 자신이 화면을 덮어야 한다
 * (::backdrop 은 별도 의사요소라 클릭 이벤트가 dialog로 오지 않는다).
 * 그래서 dialog를 전체 화면으로 깔고 그 위에 패널을 얹었다.
 */
export function Modal({ open, onClose, title, children, actions, icon }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="modal-title"
      // Esc 는 기본 동작으로 닫히지만, 상태를 우리가 들고 있으므로 직접 처리한다.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // 패널이 아니라 배경(dialog 자신)을 눌렀을 때만 닫는다.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title} id="modal-title">
            {icon}
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </dialog>
  );
}
