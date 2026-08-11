'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Target,
  Coffee,
  Trees,
  CloudRain,
  Waves,
  CheckCircle2,
  Flame,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { CardBlock } from '@/components/ui/CardBlock';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import styles from './focus.module.css';

type Mode = 'focus' | 'shortBreak' | 'longBreak';
type AmbientSound = 'none' | 'rain' | 'waves' | 'forest' | 'coffee';

interface FocusSessionRecord {
  id: string;
  task: string;
  durationMinutes: number;
  completedAt: string;
  mode: Mode;
}

const DEFAULT_DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

// Web Audio chime on timer completion
function playCompletionChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + index * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 1.25);
    });
  } catch (err) {
    console.warn('[CompletionChime]', err);
  }
}

// Synthesized Ambient Sound Generator using Web Audio API
class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;

  start(type: AmbientSound) {
    this.stop();
    if (type === 'none') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      this.filterNode = this.ctx.createBiquadFilter();
      this.gainNode = this.ctx.createGain();

      if (type === 'rain') {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 800;
        this.gainNode.gain.value = 0.15;
      } else if (type === 'waves') {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 400;
        this.gainNode.gain.value = 0.12;

        this.lfoNode = this.ctx.createOscillator();
        this.lfoNode.frequency.value = 0.15;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;
        this.lfoNode.connect(lfoGain);
        lfoGain.connect(this.filterNode.frequency);
        this.lfoNode.start();
      } else if (type === 'forest') {
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.value = 1200;
        this.filterNode.Q.value = 3;
        this.gainNode.gain.value = 0.08;
      } else if (type === 'coffee') {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 600;
        this.gainNode.gain.value = 0.1;
      }

      whiteNoise.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      whiteNoise.start();
      this.noiseNode = whiteNoise;
    } catch (err) {
      console.warn('[AmbientSoundEngine]', err);
    }
  }

  stop() {
    try {
      if (this.lfoNode) {
        this.lfoNode.stop();
        this.lfoNode.disconnect();
        this.lfoNode = null;
      }
      if (this.noiseNode) {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
      }
    } catch {
      // ignore
    }
  }
}

const ambientEngine = new AmbientSoundEngine();

export default function PomodoroFocusPage() {
  const { lang } = useLanguage();
  const [mode, setMode] = useState<Mode>('focus');
  const [targetDuration, setTargetDuration] = useState<number>(DEFAULT_DURATIONS.focus);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [taskName, setTaskName] = useState<string>('');
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('none');
  const [history, setHistory] = useState<FocusSessionRecord[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('esmery_pomodoro_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Update browser tab title
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, '0');
    const modeName =
      mode === 'focus'
        ? tInline(lang, 'Focus', 'Tập trung')
        : mode === 'shortBreak'
          ? tInline(lang, 'Short Break', 'Nghỉ ngắn')
          : tInline(lang, 'Long Break', 'Nghỉ dài');

    if (isRunning) {
      document.title = `(${mins}:${secs}) ${modeName} - ESMERY`;
    } else {
      document.title = 'ESMERY - ' + tInline(lang, 'Focus (Pomodoro)', 'Tập trung (Pomodoro)');
    }
    return () => {
      document.title = 'ESMERY';
    };
  }, [timeLeft, isRunning, mode, lang]);

  // Main countdown effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, taskName, targetDuration]);

  // Ambient sound management
  useEffect(() => {
    if (isRunning && ambientSound !== 'none') {
      ambientEngine.start(ambientSound);
    } else {
      ambientEngine.stop();
    }
    return () => {
      ambientEngine.stop();
    };
  }, [isRunning, ambientSound]);

  const handleComplete = () => {
    setIsRunning(false);
    playCompletionChime();

    if (mode === 'focus') {
      const newRecord: FocusSessionRecord = {
        id: String(Date.now()),
        task: taskName.trim() || tInline(lang, 'Focus Session', 'Phiên tập trung'),
        durationMinutes: Math.round(targetDuration / 60),
        completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        mode: 'focus',
      };
      setHistory((prev) => {
        const updated = [newRecord, ...prev];
        try {
          localStorage.setItem('esmery_pomodoro_history', JSON.stringify(updated.slice(0, 50)));
        } catch {}
        return updated;
      });
    }
  };

  const changeMode = (newMode: Mode, minutes?: number) => {
    setIsRunning(false);
    setMode(newMode);
    const dur = (minutes ?? (DEFAULT_DURATIONS[newMode] / 60)) * 60;
    setTargetDuration(dur);
    setTimeLeft(dur);
  };

  const handleTogglePlay = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(targetDuration);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      changeMode('shortBreak');
    } else {
      changeMode('focus');
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const progressPercent = Math.min(100, Math.max(0, ((targetDuration - timeLeft) / targetDuration) * 100));

  // Circle SVG math
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const totalFocusMinutesToday = history
    .filter((h) => h.mode === 'focus')
    .reduce((acc, cur) => acc + cur.durationMinutes, 0);

  const totalCompletedSessions = history.filter((h) => h.mode === 'focus').length;

  const PRESET_TASKS = [
    tInline(lang, 'Reading & Research', 'Đọc sách & Nghiên cứu'),
    tInline(lang, 'Deep Work & Coding', 'Làm việc sâu & Lập trình'),
    tInline(lang, 'Writing & Planning', 'Viết lách & Lập kế hoạch'),
    tInline(lang, 'Meditation & Calm', 'Thiền định & Thư giãn'),
  ];

  return (
    <ScreenLayout
      title={tInline(lang, 'Focus (Pomodoro)', 'Tập trung (Pomodoro)')}
      subtitle={tInline(
        lang,
        'Boost concentration with timed focus sessions & soothing ambient soundscapes.',
        'Tăng cường khả năng tập trung với đồng hồ Pomodoro & âm thanh thư giãn.'
      )}
    >
      <div className={styles.container}>
        {/* Mode Selector */}
        <div className={styles.modeBar}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'focus' ? styles.modeActive : ''}`}
            onClick={() => changeMode('focus')}
          >
            <Target size={18} />
            {tInline(lang, 'Focus Work', '🎯 Tập trung')}
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'shortBreak' ? styles.modeActive : ''}`}
            onClick={() => changeMode('shortBreak')}
          >
            <Coffee size={18} />
            {tInline(lang, 'Short Break', '☕ Nghỉ ngắn')}
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'longBreak' ? styles.modeActive : ''}`}
            onClick={() => changeMode('longBreak')}
          >
            <Trees size={18} />
            {tInline(lang, 'Long Break', '🌿 Nghỉ dài')}
          </button>
        </div>

        {/* Timer Card */}
        <CardBlock border className={styles.timerCard}>
          {mode === 'focus' && (
            <div className={styles.customTimeBar}>
              {[15, 25, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.timePresetBtn} ${targetDuration === m * 60 ? styles.timePresetActive : ''}`}
                  onClick={() => changeMode('focus', m)}
                >
                  {m} {tInline(lang, 'min', 'phút')}
                </button>
              ))}
            </div>
          )}

          <div className={styles.timerCircleWrap}>
            <svg className={styles.svgRing} viewBox="0 0 240 240">
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b9d" />
                  <stop offset="100%" stopColor="#ff4081" />
                </linearGradient>
              </defs>
              <circle className={styles.bgRing} cx="120" cy="120" r={radius} />
              <circle
                className={styles.progressRing}
                cx="120"
                cy="120"
                r={radius}
                style={{
                  strokeDasharray: `${circumference} ${circumference}`,
                  strokeDashoffset,
                }}
              />
            </svg>
            <div className={styles.timerCenter}>
              <span className={styles.timeDisplay}>
                {minutes}:{seconds}
              </span>
              <span className={styles.modeLabel}>
                {mode === 'focus'
                  ? tInline(lang, 'Focus Time', 'Khung tập trung')
                  : mode === 'shortBreak'
                    ? tInline(lang, 'Short Break', 'Nghỉ ngắn 5 phút')
                    : tInline(lang, 'Long Break', 'Nghỉ dài 15 phút')}
              </span>
            </div>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleReset}
              title={tInline(lang, 'Reset timer', 'Đặt lại đồng hồ')}
            >
              <RotateCcw size={20} />
            </button>

            <button
              type="button"
              className={styles.mainActionBtn}
              onClick={handleTogglePlay}
            >
              {isRunning ? (
                <>
                  <Pause size={22} />
                  {tInline(lang, 'Pause', 'Tạm dừng')}
                </>
              ) : (
                <>
                  <Play size={22} fill="currentColor" />
                  {tInline(lang, 'Start Focus', 'Bắt đầu tập trung')}
                </>
              )}
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleSkip}
              title={tInline(lang, 'Skip session', 'Bỏ qua phiên này')}
            >
              <SkipForward size={20} />
            </button>
          </div>
        </CardBlock>

        {/* Focus Task Intention */}
        <CardBlock className={styles.taskSection}>
          <div className={styles.sectionHeader}>
            <Sparkles size={18} />
            {tInline(lang, 'Focus Intention & Task', 'Mục tiêu phiên tập trung')}
          </div>
          <div className={styles.taskInputWrap}>
            <input
              type="text"
              className={styles.taskInput}
              placeholder={tInline(
                lang,
                'What are you working on? (e.g. Reading book, Coding)',
                'Bạn muốn hoàn thành việc gì? (Ví dụ: Đọc sách, Soạn báo cáo...)'
              )}
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>
          <div className={styles.taskPresets}>
            {PRESET_TASKS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={styles.presetTag}
                onClick={() => setTaskName(preset)}
              >
                + {preset}
              </button>
            ))}
          </div>
        </CardBlock>

        {/* Ambient Soundscapes Generator */}
        <CardBlock className={styles.ambientSection}>
          <div className={styles.sectionHeader}>
            <Volume2 size={18} />
            {tInline(lang, 'Soothing Ambient Soundscapes', 'Âm thanh nền thư giãn')}
          </div>
          <div className={styles.soundGrid}>
            <button
              type="button"
              className={`${styles.soundCard} ${ambientSound === 'none' ? styles.soundActive : ''}`}
              onClick={() => setAmbientSound('none')}
            >
              <VolumeX size={24} />
              <span className={styles.soundTitle}>{tInline(lang, 'Mute', 'Tắt âm')}</span>
            </button>

            <button
              type="button"
              className={`${styles.soundCard} ${ambientSound === 'rain' ? styles.soundActive : ''}`}
              onClick={() => setAmbientSound('rain')}
            >
              <CloudRain size={24} />
              <span className={styles.soundTitle}>{tInline(lang, 'Gentle Rain', 'Mưa nhẹ')}</span>
            </button>

            <button
              type="button"
              className={`${styles.soundCard} ${ambientSound === 'waves' ? styles.soundActive : ''}`}
              onClick={() => setAmbientSound('waves')}
            >
              <Waves size={24} />
              <span className={styles.soundTitle}>{tInline(lang, 'Ocean Waves', 'Sóng biển')}</span>
            </button>

            <button
              type="button"
              className={`${styles.soundCard} ${ambientSound === 'forest' ? styles.soundActive : ''}`}
              onClick={() => setAmbientSound('forest')}
            >
              <Trees size={24} />
              <span className={styles.soundTitle}>{tInline(lang, 'Soft Forest', 'Rừng xanh')}</span>
            </button>

            <button
              type="button"
              className={`${styles.soundCard} ${ambientSound === 'coffee' ? styles.soundActive : ''}`}
              onClick={() => setAmbientSound('coffee')}
            >
              <Coffee size={24} />
              <span className={styles.soundTitle}>{tInline(lang, 'Coffee Shop', 'Quán Cafe')}</span>
            </button>
          </div>
        </CardBlock>

        {/* Focus Stats & Today History */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className={styles.statValue}>{totalCompletedSessions}</div>
              <div className={styles.statLabel}>{tInline(lang, 'Completed Sessions', 'Phiên hoàn thành')}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Zap size={24} />
            </div>
            <div>
              <div className={styles.statValue}>{totalFocusMinutesToday} {tInline(lang, 'mins', 'phút')}</div>
              <div className={styles.statLabel}>{tInline(lang, 'Total Focus Time', 'Tổng thời gian tập trung')}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Flame size={24} />
            </div>
            <div>
              <div className={styles.statValue}>
                {totalCompletedSessions >= 4
                  ? tInline(lang, 'Master', 'Thượng thừa')
                  : totalCompletedSessions >= 1
                    ? tInline(lang, 'Active', 'Tích cực')
                    : tInline(lang, 'Ready', 'Sẵn sàng')}
              </div>
              <div className={styles.statLabel}>{tInline(lang, 'Focus Streak', 'Trạng thái tập trung')}</div>
            </div>
          </div>
        </div>

        {/* Recent Session History */}
        <CardBlock>
          <div className={styles.sectionHeader}>
            <Target size={18} />
            {tInline(lang, 'Session History Today', 'Nhật ký tập trung hôm nay')}
          </div>

          {history.length === 0 ? (
            <p className={styles.emptyHistory}>
              {tInline(
                lang,
                'No focus sessions completed yet today. Start your first session above!',
                'Chưa có phiên tập trung nào hôm nay. Hãy bắt đầu phiên đầu tiên ở trên!'
              )}
            </p>
          ) : (
            <div className={styles.historyList}>
              {history.map((record) => (
                <div key={record.id} className={styles.historyItem}>
                  <div>
                    <span className={styles.historyTask}>🎯 {record.task}</span>
                  </div>
                  <span className={styles.historyMeta}>
                    {record.durationMinutes} {tInline(lang, 'mins', 'phút')} · {record.completedAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBlock>
      </div>
    </ScreenLayout>
  );
}
