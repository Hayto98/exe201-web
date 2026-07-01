import styles from './InlineMessage.module.css';

interface InlineMessageProps {
  text: string;
  variant?: 'default' | 'error' | 'success';
}

export function InlineMessage({ text, variant = 'default' }: InlineMessageProps) {
  return (
    <div className={`${styles.message} ${variant === 'error' ? styles.error : ''} ${variant === 'success' ? styles.success : ''}`}>
      {text}
    </div>
  );
}
