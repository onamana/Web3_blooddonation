import { useState } from "react";
import { Button } from "./Button";
import styles from "./Certificate.module.css";

interface TransferFormProps {
  pending: boolean;
  onSubmit: (to: string) => void;
  onCancel: () => void;
}

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function TransferForm({ pending, onSubmit, onCancel }: TransferFormProps) {
  const [to, setTo] = useState("");
  const valid = ADDRESS_PATTERN.test(to.trim());

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(to.trim());
      }}
    >
      <input
        className={`${styles.input} mono`}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="받는 지갑 주소 (0x…)"
        aria-label="받는 지갑 주소"
      />
      <div className={styles.actions}>
        <Button type="submit" disabled={!valid || pending}>
          {pending ? "양도 중..." : "양도 확인"}
        </Button>
        <Button onClick={onCancel} disabled={pending}>
          취소
        </Button>
      </div>
    </form>
  );
}
