'use client';

import * as memory from './memoryRepository';
import { markNotificationReadSupabase } from './supabaseRepository';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function markNotificationRead(userId: string, notificationId: string) {
  if (isSupabaseConfigured()) {
    await markNotificationReadSupabase(userId, notificationId);
    return;
  }
  memory.markNotificationRead(userId, notificationId);
}

export async function markAllNotificationsRead(userId: string, notificationIds: string[]) {
  if (notificationIds.length === 0) return;
  if (isSupabaseConfigured()) {
    await Promise.all(notificationIds.map((id) => markNotificationReadSupabase(userId, id)));
    return;
  }
  notificationIds.forEach((id) => memory.markNotificationRead(userId, id));
}
