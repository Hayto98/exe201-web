import styles from './PrimaryButton.module.css';

interface PrimaryButtonProps {
  text: string;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  variant?: 'primary' | 'outline';
  size?: 'default' | 'small';
}

export function PrimaryButton({
  text,
  icon,
  loading,
  disabled,
  onClick,
  type = 'button',
  fullWidth = true,
  variant = 'primary',
  size = 'default',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${fullWidth ? styles.fullWidth : ''} ${variant === 'outline' ? styles.outline : ''} ${size === 'small' ? styles.small : ''}`}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
