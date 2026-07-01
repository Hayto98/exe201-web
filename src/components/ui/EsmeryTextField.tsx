import styles from './EsmeryTextField.module.css';

interface EsmeryTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  type?: string;
  password?: boolean;
  placeholder?: string;
}

export function EsmeryTextField({
  value,
  onChange,
  label,
  type = 'text',
  password,
  placeholder,
}: EsmeryTextFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={password ? 'password' : type}
        placeholder={placeholder}
      />
    </div>
  );
}
