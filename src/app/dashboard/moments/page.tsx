'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flower2, ImagePlus, Loader2 } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CardBlock } from '@/components/ui/CardBlock';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { shareMoment } from '@/lib/repository/moments';
import { PRESET_IMAGES } from '@/lib/repository/seed';
import styles from './moments.module.css';

export default function MomentsPage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0]);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);
  const [showPremiumHint, setShowPremiumHint] = useState(false);

  const isPremium = state?.entitlement.is_premium ?? false;

  useEffect(() => {
    return () => {
      if (customFile && selectedImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [customFile, selectedImage]);

  if (!state || !user) return null;

  const resetForm = () => {
    if (customFile && selectedImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImage);
    }
    setCaption('');
    setSelectedImage(PRESET_IMAGES[0]);
    setCustomFile(null);
    setShowPremiumHint(false);
  };

  const openDialog = () => {
    setShowDialog(true);
    setMessage(null);
    setShowPremiumHint(false);
  };

  const selectPreset = (url: string) => {
    if (customFile && selectedImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImage);
    }
    setCustomFile(null);
    setSelectedImage(url);
    setShowPremiumHint(false);
  };

  const handleGalleryPick = (file: File | undefined) => {
    if (!file) return;
    if (!isPremium) {
      setShowPremiumHint(true);
      return;
    }
    if (selectedImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImage);
    }
    setCustomFile(file);
    setSelectedImage(URL.createObjectURL(file));
    setShowPremiumHint(false);
  };

  const handleShare = async () => {
    if (!caption.trim()) {
      setMessage({
        text: tInline(lang, 'Enter a caption.', 'Nhập chú thích trước khi chia sẻ.'),
        variant: 'error',
      });
      return;
    }

    setSharing(true);
    setMessage(null);
    try {
      await shareMoment(user.id, caption, selectedImage, state, customFile);
      await refresh();
      setShowDialog(false);
      resetForm();
      setMessage({
        text: tInline(lang, 'Moment shared with your circle.', 'Đã chia sẻ khoảnh khắc với vòng thân.'),
        variant: 'success',
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      if (raw === 'PREMIUM_REQUIRED') {
        setShowPremiumHint(true);
        setMessage({
          text: tInline(
            lang,
            'Upload your own photos with a premium plan.',
            'Tải ảnh của bạn cần gói premium.'
          ),
          variant: 'error',
        });
      } else {
        setMessage({
          text: raw || tInline(lang, 'Could not share moment.', 'Không thể chia sẻ khoảnh khắc.'),
          variant: 'error',
        });
      }
    }
    setSharing(false);
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'Moments', 'Khoảnh khắc')}
      subtitle={tInline(lang, 'Share warm moments with your circle.', 'Chia sẻ khoảnh khắc ấm áp với vòng thân.')}
    >
      {message && !showDialog && <InlineMessage text={message.text} variant={message.variant} />}

      <PrimaryButton
        text={tInline(lang, 'Share Moment', 'Chia sẻ khoảnh khắc')}
        icon={<Flower2 size={18} />}
        onClick={openDialog}
      />

      {showDialog && (
        <CardBlock border className={styles.dialogCard}>
          <div className={styles.dialogHeader}>
            <Flower2 size={18} />
            {tInline(lang, 'Share Moment', 'Chia sẻ khoảnh khắc')}
          </div>

          <EsmeryTextField
            value={caption}
            onChange={setCaption}
            label={tInline(lang, 'Caption', 'Chú thích')}
            placeholder={tInline(lang, 'What is this moment about?', 'Khoảnh khắc này là gì?')}
          />

          <p className={styles.sectionLabel}>{tInline(lang, 'Choose image', 'Chọn ảnh')}</p>
          <div className={styles.presetGrid}>
            {PRESET_IMAGES.map((url) => (
              <button
                key={url}
                type="button"
                className={`${styles.presetBtn} ${!customFile && selectedImage === url ? styles.presetActive : ''}`}
                onClick={() => selectPreset(url)}
              >
                <img src={url} alt="" />
              </button>
            ))}
            {customFile && (
              <button type="button" className={`${styles.presetBtn} ${styles.presetActive}`}>
                <img src={selectedImage} alt="" />
              </button>
            )}
          </div>

          <label className={styles.fileLabel}>
            <ImagePlus size={18} />
            {tInline(lang, 'Pick from gallery', 'Chọn từ thư viện')}
            {!isPremium && (
              <span className={styles.premiumBadge}>{tInline(lang, 'Premium', 'Premium')}</span>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleGalleryPick(e.target.files?.[0])}
            />
          </label>

          {showPremiumHint && !isPremium && (
            <InlineMessage
              text={tInline(
                lang,
                'Preset photos are free. Upgrade to upload your own photos.',
                'Ảnh mẫu miễn phí. Nâng cấp premium để tải ảnh của bạn.'
              )}
              variant="error"
            />
          )}

          {message && showDialog && <InlineMessage text={message.text} variant={message.variant} />}

          <div className={styles.actions}>
            <PrimaryButton
              text={sharing ? tInline(lang, 'Sharing...', 'Đang chia sẻ...') : tInline(lang, 'Share', 'Chia sẻ')}
              disabled={sharing}
              icon={sharing ? <Loader2 size={16} className={styles.spin} /> : undefined}
              onClick={handleShare}
            />
            <PrimaryButton
              text={tInline(lang, 'Cancel', 'Hủy')}
              variant="outline"
              disabled={sharing}
              onClick={() => {
                setShowDialog(false);
                resetForm();
              }}
            />
          </div>

          {!isPremium && (
            <Link href="/dashboard/plans" className={styles.upgradeLink}>
              {tInline(lang, 'Upgrade to share your photos', 'Nâng cấp để chia sẻ ảnh của bạn')}
            </Link>
          )}
        </CardBlock>
      )}

      {state.moments.length === 0 ? (
        <CardBlock>
          <p className={styles.empty}>
            {tInline(
              lang,
              'No moments yet. Share your first warm update with your circle.',
              'Chưa có khoảnh khắc. Hãy chia sẻ cập nhật đầu tiên với vòng thân.'
            )}
          </p>
        </CardBlock>
      ) : (
        <div className={styles.grid}>
          {state.moments.map((m) => (
            <CardBlock key={m.id}>
              <img src={m.image_url} alt={m.caption} className={styles.momentImg} />
              <p className={styles.caption}>{m.caption}</p>
              <span className={styles.time}>
                {tInline(lang, 'Shared to circle', 'Chia sẻ với vòng thân')}
              </span>
            </CardBlock>
          ))}
        </div>
      )}
    </ScreenLayout>
  );
}
