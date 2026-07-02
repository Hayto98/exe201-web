'use client';

import * as memory from './memoryRepository';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { EsmeryState } from './types';

async function postShareMoment(payload: FormData | { caption: string; imageUrl: string }) {
  const res = await fetch('/api/moments/share', {
    method: 'POST',
    credentials: 'same-origin',
    ...(payload instanceof FormData
      ? { body: payload }
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
  });

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? 'Không thể chia sẻ khoảnh khắc.');
  }
}

export async function shareMoment(
  userId: string,
  caption: string,
  imageUrl: string,
  state: EsmeryState,
  customFile?: File | null
) {
  const trimmedCaption = caption.trim();
  if (!trimmedCaption) {
    throw new Error('CAPTION_REQUIRED');
  }

  if (isSupabaseConfigured()) {
    if (customFile) {
      const form = new FormData();
      form.append('caption', trimmedCaption);
      form.append('file', customFile);
      await postShareMoment(form);
      return;
    }
    if (!imageUrl) {
      throw new Error('IMAGE_REQUIRED');
    }
    await postShareMoment({ caption: trimmedCaption, imageUrl });
    return;
  }

  memory.shareMoment(userId, trimmedCaption, imageUrl);
}
