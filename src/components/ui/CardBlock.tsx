import styles from './CardBlock.module.css';

interface CardBlockProps {
  border?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CardBlock({ border, children, className }: CardBlockProps) {
  return (
    <div className={`${styles.block} ${border ? styles.bordered : ''} ${className ?? ''}`}>
      {children}
    </div>
  );
}
