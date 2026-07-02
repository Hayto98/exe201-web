'use client';

import * as memory from './memoryRepository';
import { addFriendSupabase, updateFriendRequestSupabase } from './supabaseRepository';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { CircleStatus, EsmeryState } from './types';

export async function addFriend(
  userId: string,
  contact: string,
  name: string,
  relationship: string,
  state?: EsmeryState
) {
  if (isSupabaseConfigured()) {
    if (!state) throw new Error('State required');
    await addFriendSupabase(userId, contact, name, relationship, state);
    return;
  }
  memory.addFriend(userId, contact, name, relationship);
}

export async function updateFriendRequest(
  userId: string,
  requestId: string,
  status: CircleStatus,
  state?: EsmeryState
) {
  if (isSupabaseConfigured()) {
    if (!state) throw new Error('State required');
    await updateFriendRequestSupabase(userId, requestId, status, state);
    return;
  }
  memory.updateFriendRequest(userId, requestId, status);
}
