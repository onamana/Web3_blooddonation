import type { ReactNode } from "react";
import { useDialogBehavior } from "../hooks/useDialogBehavior";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const containerRef = useDialogBehavior(open, onClose);
  if (!open) return null;

  return (
    <>
      <button type="button" className={styles.scrim} aria-label="닫기" onClick={onClose} />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={containerRef}
      >
        <div className={styles.handle} aria-hidden="true" />
        {children}
      </div>
    </>
  );
}
