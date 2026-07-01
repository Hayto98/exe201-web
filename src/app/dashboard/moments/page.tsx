'use client';

import { useState } from 'react';
import { Flower2, ImagePlus } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CardBlock } from '@/components/ui/CardBlock';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';
import { PRESET_IMAGES } from '@/lib/repository/seed';
import styles from './moments.module.css';

export default function MomentsPage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0]);

  if (!state || !user) return null;

  const share = async () => {
    memory.shareMoment(user.id, caption || 'Shared moment', selectedImage);
    await refresh();
    setShowDialog(false);
    setCaption('');
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'Moments', 'Khoảnh khắc')}
      subtitle={tInline(lang, 'Share warm moments with your circle.', 'Chia sẻ khoảnh khắc ấm áp với vòng thân.')}
    >
      <PrimaryButton text={tInline(lang, 'Share Moment', 'Chia sẻ khoảnh khắc')} icon={<Flower2 size={18} />} onClick={() => setShowDialog(true)} />

      {showDialog && (
        <CardBlock border>
          <EsmeryTextField value={caption} onChange={setCaption} label={tInline(lang, 'Caption', 'Chú thích')} />
          <p style={{ fontWeight: 700, margin: '12px 0 8px', fontSize: '0.875rem' }}>{tInline(lang, 'Choose image', 'Chọn ảnh')}</p>
          <div className={styles.presetGrid}>
            {PRESET_IMAGES.map((url) => (
              <button key={url} type="button" className={`${styles.presetBtn} ${selectedImage === url ? styles.presetActive : ''}`} onClick={() => setSelectedImage(url)}>
                <img src={url} alt="" />
              </button>
            ))}
          </div>
          <label className={styles.fileLabel}>
            <ImagePlus size={18} />
            {tInline(lang, 'Pick from gallery', 'Chọn từ thư viện')}
            <input type="file" accept="image/*" hidden onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedImage(URL.createObjectURL(file));
            }} />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <PrimaryButton text={tInline(lang, 'Share', 'Chia sẻ')} onClick={share} />
            <PrimaryButton text={tInline(lang, 'Cancel', 'Hủy')} variant="outline" onClick={() => setShowDialog(false)} />
          </div>
        </CardBlock>
      )}

      <div className={styles.grid}>
        {state.moments.map((m) => (
          <CardBlock key={m.id}>
            <img src={m.image_url} alt={m.caption} className={styles.momentImg} />
            <p className={styles.caption}>{m.caption}</p>
            <span className={styles.time}>{tInline(lang, 'Shared to circle', 'Chia sẻ với vòng thân')}</span>
          </CardBlock>
        ))}
      </div>
    </ScreenLayout>
  );
}
