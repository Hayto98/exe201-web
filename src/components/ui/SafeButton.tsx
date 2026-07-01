'use client';

import { useCallback, useState } from 'react';
import { Check, Heart } from 'lucide-react';
import styles from './SafeButton.module.css';

interface SafeButtonProps {
  label: string;
  successLabel?: string;
  onClick: () => void | Promise<void>;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  angle: number;
  delay: number;
  kind: 'heart' | 'dot';
}

export function SafeButton({ label, successLabel, onClick }: SafeButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (phase !== 'idle') return;

      const rect = e.currentTarget.getBoundingClientRect();
      const rippleId = Date.now();
      setRipples((prev) => [
        ...prev,
        { id: rippleId, x: e.clientX - rect.left, y: e.clientY - rect.top },
      ]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== rippleId)), 700);

      setPhase('loading');
      try {
        await onClick();
        const burst: Particle[] = Array.from({ length: 14 }, (_, i) => ({
          id: rippleId + i,
          angle: (360 / 14) * i + Math.random() * 20,
          delay: i * 0.04,
          kind: i % 3 === 0 ? 'heart' : 'dot',
        }));
        setParticles(burst);
        setPhase('success');
        setTimeout(() => {
          setPhase('idle');
          setParticles([]);
        }, 2400);
      } catch {
        setPhase('idle');
        setParticles([]);
      }
    },
    [onClick, phase]
  );

  return (
    <div className={styles.scene}>
      {phase === 'success' && (
        <div className={styles.rings} aria-hidden>
          <span className={styles.ring} />
          <span className={`${styles.ring} ${styles.ringDelay}`} />
          <span className={`${styles.ring} ${styles.ringDelay2}`} />
        </div>
      )}

      <button
        type="button"
        className={`${styles.safeButton} ${styles[phase]}`}
        onClick={handleClick}
        disabled={phase !== 'idle'}
        aria-busy={phase === 'loading'}
      >
        {ripples.map((r) => (
          <span
            key={r.id}
            className={styles.ripple}
            style={{ left: r.x, top: r.y }}
            aria-hidden
          />
        ))}

        {particles.map((p) => (
          <span
            key={p.id}
            className={p.kind === 'heart' ? styles.particleHeart : styles.particleDot}
            style={
              {
                '--angle': `${p.angle}deg`,
                '--delay': `${p.delay}s`,
              } as React.CSSProperties
            }
            aria-hidden
          >
            {p.kind === 'heart' ? '♥' : ''}
          </span>
        ))}

        <span className={styles.iconWrap}>
          {phase === 'loading' && <span className={styles.spinner} />}
          {phase === 'success' && (
            <Heart size={52} fill="white" strokeWidth={0} className={styles.heartPop} />
          )}
          {phase === 'idle' && <Check size={54} strokeWidth={2.5} className={styles.checkIcon} />}
        </span>

        <span className={`${styles.label} ${phase === 'success' ? styles.labelSuccess : ''}`}>
          {phase === 'success' ? (successLabel ?? label) : label}
        </span>
      </button>

      {phase === 'success' && (
        <p className={styles.successHint} aria-live="polite">
          ✨
        </p>
      )}
    </div>
  );
}
