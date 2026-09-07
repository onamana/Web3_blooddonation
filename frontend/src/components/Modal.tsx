import type { ReactNode } from "react";
import { useDialogBehavior } from "../hooks/useDialogBehavior";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const containerRef = useDialogBehavior(open, onClose);
  if (!open) return null;

  return (
    <div
      className={styles.scrim}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title} ref={containerRef}>
        {children}
      </div>
    </div>
  );
}

export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className={styles.xbtn} onClick={onClose}>
      닫기
    </button>
  );
}
