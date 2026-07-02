import { getSupabaseClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSepayQrUrl } from '@/lib/sepay';
import {
  extractSepayTransferCode,
  generateSepayTransferCode,
  isValidSepayTransferCode,
} from '@/lib/payment/sepayReference';
import { newId } from '@/lib/utils';
import type { CircleStatus, EmergencyContact, EsmeryState, PaymentOrder, Profile, SubscriptionPlan } from './types';
import { emptyUserState } from './seed';

async function fetchTable<T>(table: string, column: string, userId: string): Promise<T[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('*').eq(column, userId);
  if (error) {
    console.warn(`[supabase] ${table}:`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

async function fetchSingle<T>(table: string, column: string, userId: string): Promise<T | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select('*').eq(column, userId).maybeSingle();
  if (error) {
    console.warn(`[supabase] ${table}:`, error.message);
    return null;
  }
  return data as T | null;
}

export async function loadUserStateFromSupabase(
  userId: string,
  email?: string | null,
  displayName?: string | null
): Promise<EsmeryState> {
  const base = emptyUserState(userId, displayName ?? email?.split('@')[0] ?? 'ESMERY Friend', email);
  const supabase = getSupabaseClient();
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  const [
    profile,
    ownedCircleMembers,
    friendRequestsSent,
    checkIns,
    timelineEvents,
    notifications,
    moments,
    emergencyContacts,
    safetyRhythms,
    safetySettings,
    subscriptionStatus,
    notificationDeliveries,
    alertIncidents,
    alertJobs,
    locationShares,
    paymentOrders,
    entitlement,
    auditLogs,
  ] = await Promise.all([
    fetchSingle<typeof base.profile>('profiles', 'id', userId),
    fetchTable<typeof base.circleMembers[0]>('circle_members', 'owner_user_id', userId),
    fetchTable<typeof base.friendRequests[0]>('friend_requests', 'sender_user_id', userId),
    fetchTable<typeof base.checkIns[0]>('check_ins', 'user_id', userId),
    fetchTable<typeof base.timelineEvents[0]>('timeline_events', 'user_id', userId),
    fetchTable<typeof base.notifications[0]>('notifications', 'user_id', userId),
    fetchTable<typeof base.moments[0]>('moments', 'user_id', userId),
    fetchTable<typeof base.emergencyContacts[0]>('emergency_contacts', 'user_id', userId),
    fetchTable<typeof base.safetyRhythms[0]>('safety_rhythms', 'user_id', userId),
    fetchSingle<typeof base.safetySettings>('safety_settings', 'user_id', userId),
    fetchSingle<typeof base.subscriptionStatus>('subscription_status', 'user_id', userId),
    fetchTable<typeof base.notificationDeliveries[0]>('notification_deliveries', 'user_id', userId),
    fetchTable<typeof base.alertIncidents[0]>('alert_incidents', 'user_id', userId),
    fetchTable<typeof base.alertJobs[0]>('alert_jobs', 'user_id', userId),
    fetchTable<typeof base.locationShares[0]>('location_shares', 'user_id', userId),
    fetchTable<typeof base.paymentOrders[0]>('payment_orders', 'user_id', userId),
    fetchSingle<typeof base.entitlement>('entitlements', 'user_id', userId),
    fetchTable<typeof base.auditLogs[0]>('audit_logs', 'user_id', userId),
  ]);

  // --- Circle members from receiver side (Android: memberCircleRows) ---
  const memberCircleRows = await fetchTable<typeof base.circleMembers[0]>('circle_members', 'member_user_id', userId);
  const receivedCircleMembers: typeof base.circleMembers = [];
  for (const row of memberCircleRows) {
    if (row.owner_user_id === userId || row.status !== 'accepted') continue;
    const ownerProfile = await fetchSingle<Profile>('profiles', 'id', row.owner_user_id);
    receivedCircleMembers.push({
      id: row.id,
      owner_user_id: userId,
      member_user_id: row.owner_user_id,
      invited_contact: ownerProfile?.email ?? row.owner_user_id,
      name: ownerProfile?.display_name ?? row.name,
      relationship: row.relationship,
      status: row.status,
      last_safe_at: ownerProfile?.last_safe_at ?? row.last_safe_at,
    });
  }

  // --- Incoming friend requests (Android: receivedByUserId + receivedByContact) ---
  let friendRequestsReceived: typeof base.friendRequests = [];
  if (supabase) {
    const receivedByUserId = await fetchTable<typeof base.friendRequests[0]>('friend_requests', 'receiver_user_id', userId);
    let receivedByContact: typeof base.friendRequests = [];
    if (normalizedEmail) {
      const { data } = await supabase
        .from('friend_requests')
        .select('*')
        .ilike('receiver_contact', normalizedEmail);
      receivedByContact = (data ?? []) as typeof base.friendRequests;
    }
    friendRequestsReceived = [...receivedByUserId, ...receivedByContact].filter(
      (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i
    );
  }

  // Batch-fetch sender profiles for received requests
  const senderIds = [...new Set(friendRequestsReceived.map((r) => r.sender_user_id))];
  const senderProfiles: Record<string, Profile | null> = {};
  for (const senderId of senderIds) {
    senderProfiles[senderId] = await fetchSingle<Profile>('profiles', 'id', senderId);
  }

  // Virtual circle members from incoming friend requests (Android: requestCircleMembers)
  const requestCircleMembers: typeof base.circleMembers = friendRequestsReceived.map((request) => {
    const senderProfile = senderProfiles[request.sender_user_id] ?? null;
    let senderName = senderProfile?.display_name ?? 'Trusted contact';
    if (senderName.includes('@')) senderName = senderName.split('@')[0];
    return {
      id: request.id,
      owner_user_id: userId,
      member_user_id: request.sender_user_id,
      invited_contact: senderProfile?.email ?? request.sender_user_id,
      name: senderName,
      relationship: 'Trusted contact',
      status: request.status,
      last_safe_at: senderProfile?.last_safe_at ?? null,
    };
  });

  // Deduplicate circle members using connectionKeys pattern (matches Exw-Hai2)
  const circleMembers = dedupeCircleMembers([
    ...ownedCircleMembers,
    ...receivedCircleMembers,
    ...requestCircleMembers,
  ]);

  const friendRequests = [...friendRequestsSent, ...friendRequestsReceived].filter(
    (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i
  );

  const resolvedProfile = profile ?? base.profile;

  return {
    ...base,
    profile: {
      ...resolvedProfile,
      display_name: resolvedProfile.display_name || displayName || 'ESMERY Friend',
      email: resolvedProfile.email?.trim().toLowerCase() ?? normalizedEmail ?? undefined,
    },
    circleMembers,
    friendRequests: friendRequests.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    checkIns: checkIns.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    timelineEvents: timelineEvents.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    notifications: notifications.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    moments: moments.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    emergencyContacts: emergencyContacts.sort((a, b) => a.name.localeCompare(b.name)),
    safetyRhythms: safetyRhythms.sort((a, b) => a.check_time.localeCompare(b.check_time)),
    safetySettings: safetySettings ?? base.safetySettings,
    subscriptionStatus: subscriptionStatus ?? base.subscriptionStatus,
    notificationDeliveries: notificationDeliveries.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    alertIncidents: alertIncidents.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    alertJobs: alertJobs.sort((a, b) => b.run_at.localeCompare(a.run_at)),
    locationShares: locationShares.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    paymentOrders: paymentOrders.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    entitlement: entitlement ?? base.entitlement,
    auditLogs: auditLogs.sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** ConnectionKeys pattern — matches Exw-Hai2 deduplication */
function connectionKeys(m: { member_user_id?: string | null; invited_contact: string }): Set<string> {
  const keys = new Set<string>();
  if (m.member_user_id?.trim()) keys.add(`user:${m.member_user_id}`);
  const contact = m.invited_contact?.trim().toLowerCase();
  if (contact) keys.add(`contact:${contact}`);
  return keys;
}

function dedupeCircleMembers(items: EsmeryState['circleMembers']): EsmeryState['circleMembers'] {
  // Sort: accepted first, then those with member_user_id, then by last_safe_at
  const sorted = [...items].sort((a, b) => {
    const aAccepted = a.status === 'accepted' ? 1 : 0;
    const bAccepted = b.status === 'accepted' ? 1 : 0;
    if (bAccepted !== aAccepted) return bAccepted - aAccepted;
    const aHasId = a.member_user_id ? 1 : 0;
    const bHasId = b.member_user_id ? 1 : 0;
    if (bHasId !== aHasId) return bHasId - aHasId;
    return (b.last_safe_at ?? '').localeCompare(a.last_safe_at ?? '');
  });

  const result: typeof items = [];
  for (const item of sorted) {
    const keys = connectionKeys(item);
    const hasSameConnection = result.some((existing) => {
      const existingKeys = connectionKeys(existing);
      for (const k of keys) {
        if (existingKeys.has(k)) return true;
      }
      return false;
    });
    if (!hasSameConnection) result.push(item);
  }
  return result;
}

/**
 * Check-in: ghi vào Supabase tương tự Android SupabaseEsmeryRepository.checkIn().
 * Inserts: check_in, timeline_event, notification, và update profile.last_safe_at.
 */
export async function checkInSupabase(userId: string, note?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const ts = new Date().toISOString();
  const checkInId = newId();

  // 1. Insert check_in record
  const { error: checkInError } = await supabase.from('check_ins').insert({
    id: checkInId,
    user_id: userId,
    status: 'safe',
    note: note ?? null,
    created_at: ts,
  });
  if (checkInError) throw checkInError;

  // 2. Update profile.last_safe_at
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ last_safe_at: ts })
    .eq('id', userId);
  if (profileError) console.warn('[supabase] profile update:', profileError.message);

  // 3. Insert timeline_event (for the user)
  const { error: eventError } = await supabase.from('timeline_events').insert({
    id: newId(),
    user_id: userId,
    type: 'check_in',
    title: 'Check-in confirmed',
    body: 'Your circle has been notified.',
    related_entity_id: checkInId,
    created_at: ts,
  });
  if (eventError) console.warn('[supabase] timeline_events:', eventError.message);

  const { error: alertError } = await supabase
    .from('alert_incidents')
    .update({ status: 'resolved', resolved_at: ts })
    .eq('user_id', userId)
    .eq('status', 'active');
  if (alertError) console.warn('[supabase] alert_incidents:', alertError.message);

  // Notify circle members only — sender does not get a self notification.
  const { data: circleMembers } = await supabase
    .from('circle_members')
    .select('member_user_id')
    .eq('owner_user_id', userId)
    .eq('status', 'accepted');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();
  const displayName = (profileData as { display_name: string } | null)?.display_name ?? 'Someone';

  if (circleMembers && circleMembers.length > 0) {
    const memberEvents = circleMembers
      .filter((m: { member_user_id: string | null }) => m.member_user_id)
      .map((m: { member_user_id: string | null }) => ({
        id: newId(),
        user_id: m.member_user_id!,
        type: 'check_in',
        title: `${displayName} is safe`,
        body: 'A fresh safety check-in was sent.',
        related_entity_id: checkInId,
        created_at: ts,
      }));

    if (memberEvents.length > 0) {
      const { error: memberEventError } = await supabase
        .from('timeline_events')
        .insert(memberEvents);
      if (memberEventError) console.warn('[supabase] member timeline_events:', memberEventError.message);

      const memberNotifications = memberEvents.map((e: { user_id: string; title: string; body: string; related_entity_id: string; created_at: string }) => ({
        id: newId(),
        user_id: e.user_id,
        type: 'check_in_success',
        title: e.title,
        body: e.body,
        related_entity_id: checkInId,
        is_read: false,
        created_at: ts,
      }));
      const { error: memberNotifError } = await supabase
        .from('notifications')
        .insert(memberNotifications);
      if (memberNotifError) console.warn('[supabase] member notifications:', memberNotifError.message);
    }
  }
}

/**
 * SendNudge: timeline for sender; notification only for receiver.
 */
export async function sendNudgeSupabase(userId: string, memberId: string, state: EsmeryState) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const ts = new Date().toISOString();
  const member = state.circleMembers.find((m) => m.id === memberId);
  const memberName = member?.name ?? 'someone';

  // 1. Timeline event for sender
  const senderEvent = {
    id: newId(),
    user_id: userId,
    type: 'nudge',
    title: 'Gentle nudge sent',
    body: `A gentle reminder was sent to ${memberName}.`,
    related_entity_id: memberId,
    created_at: ts,
  };
  const { error: eventError } = await supabase.from('timeline_events').insert(senderEvent);
  if (eventError) console.warn('[supabase] timeline_events:', eventError.message);

  const receiverUserId = member?.member_user_id;
  if (receiverUserId) {
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();
    const senderName = (senderProfile as { display_name: string } | null)?.display_name ?? 'Someone';

    const { error: receiverEventError } = await supabase.from('timeline_events').insert({
      id: newId(),
      user_id: receiverUserId,
      type: 'nudge',
      title: 'Gentle nudge received',
      body: `${senderName} sent you a gentle nudge.`,
      related_entity_id: memberId,
      created_at: ts,
    });
    if (receiverEventError) console.warn('[supabase] receiver timeline_events:', receiverEventError.message);

    const { error: receiverNotifError } = await supabase.from('notifications').insert({
      id: newId(),
      user_id: receiverUserId,
      type: 'gentle_nudge',
      title: 'Gentle nudge received',
      body: `${senderName} sent you a gentle nudge.`,
      related_entity_id: memberId,
      is_read: false,
      created_at: ts,
    });
    if (receiverNotifError) console.warn('[supabase] receiver notifications:', receiverNotifError.message);
  }
}

/**
 * Remove a friend from the circle. Deletes circle_members for both sides
 * and updates related friend_requests to 'declined'.
 */
export async function removeFriendSupabase(userId: string, memberId: string, state: EsmeryState) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const member = state.circleMembers.find((m) => m.id === memberId);
  const memberUserId = member?.member_user_id;
  const memberContact = member?.invited_contact;
  const ts = new Date().toISOString();

  // 1. Delete the circle_member row
  const { error: delError } = await supabase
    .from('circle_members')
    .delete()
    .eq('id', memberId);
  if (delError) console.warn('[supabase] delete circle_member:', delError.message);

  // 2. If the member has a user_id, also delete any reciprocal circle_member
  if (memberUserId) {
    await supabase
      .from('circle_members')
      .delete()
      .eq('owner_user_id', memberUserId)
      .eq('member_user_id', userId);
  }

  // 3. Update related friend_requests to 'declined'
  if (memberContact) {
    // Requests user sent to this contact
    await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('sender_user_id', userId)
      .ilike('receiver_contact', memberContact.trim().toLowerCase());
  }
  if (memberUserId) {
    // Requests from the member to this user
    await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('sender_user_id', memberUserId)
      .eq('receiver_user_id', userId);
  }

  // 4. Insert timeline event
  const { error: eventError } = await supabase.from('timeline_events').insert({
    id: newId(),
    user_id: userId,
    type: 'friend_request',
    title: 'Circle member removed',
    body: `${member?.name ?? 'A member'} was removed from your circle.`,
    related_entity_id: memberId,
    created_at: ts,
  });
  if (eventError) console.warn('[supabase] timeline_events:', eventError.message);
}

const PLAN_AMOUNTS: Record<SubscriptionPlan, number> = {
  basic: 0,
  monthly: 49000,
  yearly: 499000,
};

function isMissingSepayReferenceColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42703' || (msg.includes('sepay_reference_code') && msg.includes('does not exist'));
}

function toPaymentError(error: { message?: string; code?: string }): Error {
  if (error.code === 'PGRST116' || error.message?.includes('multiple (or no) rows returned')) {
    return new Error('Có nhiều đơn thanh toán trùng. Vui lòng thử lại — hệ thống sẽ tự gom về một đơn.');
  }
  if (error.code === '23505') {
    return new Error(
      'Trùng mã thanh toán. Chạy migration Supabase (20260702_sepay_user_transfer_code.sql) để bỏ ràng buộc unique trên payment_orders.reference_code.'
    );
  }
  if (isMissingSepayReferenceColumn(error)) {
    return new Error('Thiếu cột sepay_reference_code trên profiles. Chạy migration Supabase.');
  }
  return new Error(error.message ?? 'Thanh toán thất bại');
}

async function loadTransferCodeFromOrders(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from('payment_orders')
    .select('reference_code')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    const raw = row.reference_code;
    if (!raw) continue;
    if (isValidSepayTransferCode(raw)) return raw.toUpperCase();
    const extracted = extractSepayTransferCode(String(raw));
    if (extracted) return extracted;
  }
  return null;
}

/** Một user chỉ giữ một đơn SePay pending; hủy các bản trùng (tránh lỗi maybeSingle). */
async function resolvePendingSepayOrder(userId: string): Promise<PaymentOrder | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const { data: pendingOrders, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'sepay')
    .eq('status', 'pending')
    .order('updated_at', { ascending: false });

  if (error) throw toPaymentError(error);
  if (!pendingOrders?.length) return null;

  const latest = pendingOrders[0] as PaymentOrder;
  const duplicateIds = pendingOrders.slice(1).map((o) => o.id as string);
  if (duplicateIds.length > 0) {
    const now = new Date().toISOString();
    const { error: cancelError } = await supabase
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: now })
      .in('id', duplicateIds);
    if (cancelError) {
      console.warn('[supabase] cancel duplicate pending orders:', cancelError.message);
    }
  }
  return latest;
}

export async function updateSubscriptionSupabase(userId: string, plan: SubscriptionPlan) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const now = new Date().toISOString();
  const isPremium = plan !== 'basic';

  if (plan === 'basic') {
    const { error: cancelError } = await supabase
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: now })
      .eq('user_id', userId)
      .eq('provider', 'sepay')
      .eq('status', 'pending');
    if (cancelError) throw toPaymentError(cancelError);
  }

  const { error: subError } = await supabase.from('subscription_status').upsert({
    user_id: userId,
    plan,
    is_active: true,
    updated_at: now,
  });
  if (subError) throw toPaymentError(subError);

  const { error: entError } = await supabase.from('entitlements').upsert({
    user_id: userId,
    plan,
    is_premium: isPremium,
    source: plan === 'basic' ? 'basic' : 'manual',
    updated_at: now,
  });
  if (entError) throw toPaymentError(entError);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', userId);
  if (profileError) throw toPaymentError(profileError);
}

/**
 * Mỗi user một mã CK cố định ESM###### — kiểm tra trùng trên profiles trước khi gán.
 */
export async function ensureUserSepayReferenceCode(userId: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const fromOrders = await loadTransferCodeFromOrders(userId);
  if (fromOrders) {
    await supabase.from('profiles').update({ sepay_reference_code: fromOrders }).eq('id', userId);
    return fromOrders;
  }

  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('sepay_reference_code')
    .eq('id', userId)
    .maybeSingle();
  const columnMissing = isMissingSepayReferenceColumn(readError);
  if (readError && !columnMissing) throw toPaymentError(readError);

  const existing = (profile as { sepay_reference_code?: string | null } | null)?.sepay_reference_code;
  if (existing && isValidSepayTransferCode(existing)) {
    return existing.toUpperCase();
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateSepayTransferCode();

    if (!columnMissing) {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('sepay_reference_code', code)
        .maybeSingle();
      if (taken && (taken as { id: string }).id !== userId) continue;
    }

    const { data: orderTaken } = await supabase
      .from('payment_orders')
      .select('user_id')
      .eq('reference_code', code)
      .neq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (orderTaken) continue;

    if (!columnMissing) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ sepay_reference_code: code })
        .eq('id', userId);
      if (!updateError) return code;
      if (updateError.code === '23505') continue;
      if (!isMissingSepayReferenceColumn(updateError)) throw toPaymentError(updateError);
    } else {
      return code;
    }
  }

  throw new Error('Không thể tạo mã chuyển khoản, vui lòng thử lại.');
}

export async function createPaymentOrderSupabase(
  userId: string,
  plan: SubscriptionPlan
): Promise<PaymentOrder> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const amount = PLAN_AMOUNTS[plan];
  const reference = await ensureUserSepayReferenceCode(userId);
  const now = new Date().toISOString();
  const qrUrl = buildSepayQrUrl(amount, reference);

  const existingPending = await resolvePendingSepayOrder(userId);

  if (existingPending) {
    const { data, error } = await supabase
      .from('payment_orders')
      .update({
        plan,
        amount_vnd: amount,
        reference_code: reference,
        qr_url: qrUrl,
        updated_at: now,
      })
      .eq('id', existingPending.id)
      .select()
      .single();
    if (error) throw toPaymentError(error);
    return data as PaymentOrder;
  }

  const orderId = newId();
  const { data, error } = await supabase
    .from('payment_orders')
    .insert({
      id: orderId,
      user_id: userId,
      provider: 'sepay',
      plan,
      amount_vnd: amount,
      status: 'pending',
      reference_code: reference,
      qr_url: qrUrl,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error?.code === '23505') {
    const { data: existingOrder } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('reference_code', reference)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrder && existingOrder.status !== 'paid') {
      const { data: revived, error: reviveError } = await supabase
        .from('payment_orders')
        .update({
          plan,
          amount_vnd: amount,
          status: 'pending',
          qr_url: qrUrl,
          updated_at: now,
        })
        .eq('id', existingOrder.id)
        .select()
        .single();
      if (reviveError) throw toPaymentError(reviveError);
      return revived as PaymentOrder;
    }
    throw toPaymentError(error);
  }

  if (error) throw toPaymentError(error);
  return data as PaymentOrder;
}

export async function upsertPaymentOrderToSupabase(
  userId: string,
  order: {
    id: string;
    provider: string;
    plan: string;
    amount_vnd: number;
    status: string;
    reference_code: string;
    qr_url: string | null;
    created_at: string;
    updated_at: string;
  }
) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from('payment_orders').upsert({ user_id: userId, ...order });
}

function normalizeContact(value: string) {
  return value.trim().toLowerCase();
}

async function findProfileByContact(contact: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const trimmed = normalizeContact(contact);
  if (!trimmed) return null;

  const { data: emailMatch } = await supabase.from('profiles').select('*').eq('email', trimmed).maybeSingle();
  if (emailMatch) return emailMatch as Profile;

  const { data: phoneMatch } = await supabase.from('profiles').select('*').eq('phone', trimmed).maybeSingle();
  return (phoneMatch as Profile) ?? null;
}

async function findProfileById(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('[supabase] profiles lookup:', error.message);
    return null;
  }
  return data as Profile | null;
}

export async function addFriendSupabase(
  userId: string,
  contact: string,
  name: string,
  relationship: string,
  state: EsmeryState
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const normalizedContact = normalizeContact(contact);
  if (!normalizedContact) throw new Error('Liên hệ không hợp lệ');

  const matchedProfile = await findProfileByContact(normalizedContact);
  if (matchedProfile?.id === userId) {
    throw new Error('Bạn không thể tự thêm chính mình vào vòng thân.');
  }

  // matchesConnection — check both contact AND profileId (Exw-Hai2 logic)
  const matchesFriendRequest = (r: typeof state.friendRequests[0]) => {
    if (r.status === 'declined') return false;
    const nc = normalizeContact(r.receiver_contact);
    const receiverMatches = (r.receiver_user_id && r.receiver_user_id === matchedProfile?.id) || nc === normalizedContact;
    const senderMatches = r.sender_user_id === matchedProfile?.id && r.sender_user_id !== userId;
    return receiverMatches || senderMatches;
  };

  const matchesCircleMember = (m: typeof state.circleMembers[0]) => {
    if (m.status === 'declined') return false;
    return (m.member_user_id && m.member_user_id === matchedProfile?.id) ||
      normalizeContact(m.invited_contact) === normalizedContact;
  };

  const existingRequest = state.friendRequests.find(matchesFriendRequest);
  if (existingRequest) return;

  const existingMember = state.circleMembers.find(matchesCircleMember);
  if (existingMember) return;

  const ts = new Date().toISOString();
  const requestId = newId();
  const memberName = name || (matchedProfile?.display_name ?? normalizedContact);
  const memberRelationship = relationship || 'Trusted contact';

  const member = {
    id: requestId,
    owner_user_id: userId,
    member_user_id: matchedProfile?.id ?? null,
    invited_contact: normalizedContact,
    name: matchedProfile && !name ? matchedProfile.display_name : memberName,
    relationship: memberRelationship,
    status: 'pending' as const,
  };

  const request = {
    id: requestId,
    sender_user_id: userId,
    receiver_user_id: matchedProfile?.id ?? null,
    receiver_contact: normalizedContact,
    status: 'pending' as const,
    created_at: ts,
  };

  const event = {
    id: newId(),
    user_id: userId,
    type: 'friend_request' as const,
    title: 'Circle invitation sent',
    body: `Invitation sent to ${member.name}.`,
    related_entity_id: requestId,
    created_at: ts,
  };

  const { error: reqError } = await supabase.from('friend_requests').insert(request);
  if (reqError) throw reqError;

  const { error: memberError } = await supabase.from('circle_members').insert(member);
  if (memberError) throw memberError;

  const { error: eventError } = await supabase.from('timeline_events').insert(event);
  if (eventError) throw eventError;

  // Send notification to receiver if they have a user account
  if (matchedProfile?.id) {
    await supabase.from('notifications').insert({
      id: newId(),
      user_id: matchedProfile.id,
      type: 'friend_request',
      title: 'Circle invitation received',
      body: 'Open Circle to accept or decline this invitation.',
      related_entity_id: requestId,
      is_read: false,
      created_at: ts,
    });
  }

  // Insert audit log
  await supabase.from('audit_logs').insert({
    id: newId(),
    user_id: userId,
    action: 'friend_request_sent',
    metadata: JSON.stringify({ contact: normalizedContact, receiver_id: matchedProfile?.id }),
    created_at: ts,
  });
}

export async function updateFriendRequestSupabase(
  userId: string,
  requestId: string,
  status: CircleStatus,
  state: EsmeryState
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const requestBefore = state.friendRequests.find((r) => r.id === requestId);
  const ts = new Date().toISOString();

  // 1. Update friend_request status
  const { error: reqError } = await supabase.from('friend_requests').update({ status }).eq('id', requestId);
  if (reqError) throw reqError;

  // 2. Update circle_member status
  // Try matching by id first (addFriendSupabase uses same id for both)
  const memberUpdate: { status: CircleStatus; member_user_id?: string } = { status };
  if (status === 'accepted') {
    memberUpdate.member_user_id = userId;
  }

  const { data: updatedById } = await supabase
    .from('circle_members')
    .update(memberUpdate)
    .eq('id', requestId)
    .select('id');

  // If no row matched by id, try by sender + contact
  if (!updatedById || updatedById.length === 0) {
    if (requestBefore) {
      const { error: memberError2 } = await supabase
        .from('circle_members')
        .update(memberUpdate)
        .eq('owner_user_id', requestBefore.sender_user_id)
        .ilike('invited_contact', requestBefore.receiver_contact.trim().toLowerCase());
      if (memberError2) console.warn('[supabase] circle_members fallback update:', memberError2.message);
    }
  }

  // 3. Create reciprocal circle_member when accepting an incoming request
  if (
    requestBefore &&
    requestBefore.sender_user_id !== userId &&
    status === 'accepted'
  ) {
    const senderProfile = await findProfileById(requestBefore.sender_user_id);
    const reciprocalMember = {
      id: newId(),
      owner_user_id: userId,
      member_user_id: requestBefore.sender_user_id,
      invited_contact: senderProfile?.email ?? requestBefore.sender_user_id,
      name: senderProfile?.display_name ?? 'Trusted contact',
      relationship: 'Trusted contact',
      status: 'accepted' as const,
      last_safe_at: senderProfile?.last_safe_at ?? null,
    };
    // Use upsert with onConflict to avoid duplicates
    const { error: reciprocalError } = await supabase.from('circle_members').upsert(reciprocalMember);
    if (reciprocalError) console.warn('[supabase] reciprocal member:', reciprocalError.message);

    // Also update the sender's circle_member to set member_user_id = userId if missing
    await supabase
      .from('circle_members')
      .update({ status: 'accepted', member_user_id: userId })
      .eq('owner_user_id', requestBefore.sender_user_id)
      .ilike('invited_contact', requestBefore.receiver_contact.trim().toLowerCase())
      .is('member_user_id', null);
  }

  // 4. Insert timeline event
  const { error: eventError } = await supabase.from('timeline_events').insert({
    id: newId(),
    user_id: userId,
    type: 'friend_request',
    title: status === 'accepted' ? 'Circle invitation accepted' : 'Circle invitation declined',
    body: 'Request status updated.',
    related_entity_id: requestId,
    created_at: ts,
  });
  if (eventError) console.warn('[supabase] timeline_events:', eventError.message);

  // 5. Insert audit log
  await supabase.from('audit_logs').insert({
    id: newId(),
    user_id: userId,
    action: status === 'accepted' ? 'friend_request_accepted' : 'friend_request_declined',
    metadata: JSON.stringify({ request_id: requestId }),
    created_at: ts,
  });
}

/**
 * Resolve an active alert incident (Exw-Hai2: resolveAlertIncident)
 */
export async function resolveAlertIncidentSupabase(userId: string, incidentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const ts = new Date().toISOString();

  // Update incident to resolved
  const { error: incidentError } = await supabase
    .from('alert_incidents')
    .update({ status: 'resolved', resolved_at: ts })
    .eq('id', incidentId)
    .eq('user_id', userId);
  if (incidentError) throw incidentError;

  // Cancel related alert jobs
  const { error: jobError } = await supabase
    .from('alert_jobs')
    .update({ status: 'cancelled' })
    .eq('incident_id', incidentId)
    .eq('status', 'scheduled');
  if (jobError) console.warn('[supabase] alert_jobs:', jobError.message);

  // Audit log
  await supabase.from('audit_logs').insert({
    id: newId(),
    user_id: userId,
    action: 'alert_incident_resolved',
    metadata: JSON.stringify({ incident_id: incidentId }),
    created_at: ts,
  });
}

/**
 * Trigger emergency alert (Exw-Hai2: triggerEmergencyAlert)
 */
export async function triggerEmergencyAlertSupabase(userId: string, state: EsmeryState) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const ts = new Date().toISOString();

  // Create timeline event
  const eventId = newId();
  await supabase.from('timeline_events').insert({
    id: eventId,
    user_id: userId,
    type: 'emergency',
    title: 'Emergency alert triggered',
    body: 'Your emergency contacts have been notified.',
    created_at: ts,
  });

  // Create notification
  const notifId = newId();
  await supabase.from('notifications').insert({
    id: notifId,
    user_id: userId,
    type: 'emergency_alert',
    title: 'Emergency alert triggered',
    body: 'Your emergency contacts have been notified.',
    is_read: false,
    created_at: ts,
  });

  // Create alert incident
  const incidentId = newId();
  await supabase.from('alert_incidents').insert({
    id: incidentId,
    user_id: userId,
    status: 'active',
    reason: 'user_triggered_emergency',
    last_safe_at: state.profile.last_safe_at ?? null,
    escalation_due_at: new Date(Date.now() + (state.safetySettings.escalation_delay_minutes ?? 30) * 60000).toISOString(),
    created_at: ts,
  });

  // Create notification deliveries for emergency contacts with autoNotify
  const autoNotifyContacts = state.emergencyContacts.filter((c) => c.auto_notify);
  for (const contact of autoNotifyContacts) {
    await supabase.from('notification_deliveries').insert({
      id: newId(),
      notification_id: notifId,
      user_id: userId,
      recipient_contact: contact.contact,
      channel: 'in_app',
      status: 'pending',
      created_at: ts,
      updated_at: ts,
    });
  }

  // Notify circle members
  const acceptedMemberIds = state.circleMembers
    .filter((m) => m.status === 'accepted' && m.member_user_id && m.member_user_id !== userId)
    .map((m) => m.member_user_id!);

  for (const receiverId of [...new Set(acceptedMemberIds)]) {
    await supabase.from('notifications').insert({
      id: newId(),
      user_id: receiverId,
      type: 'emergency_alert',
      title: `${state.profile.display_name} triggered an emergency alert`,
      body: 'Please check on them immediately.',
      related_entity_id: incidentId,
      is_read: false,
      created_at: ts,
    });
  }
}

/**
 * Upload ảnh khoảnh khắc lên Supabase Storage (bucket: moments).
 */
export async function uploadMomentImageSupabase(
  supabase: SupabaseClient,
  userId: string,
  file: Blob,
  fileName: string,
  contentType?: string
): Promise<string> {
  const path = `${userId}/${fileName}`;
  const { error } = await supabase.storage.from('moments').upload(path, file, {
    upsert: true,
    contentType: contentType ?? (file instanceof File ? file.type : 'image/jpeg'),
  });
  if (error) throw error;
  const { data } = supabase.storage.from('moments').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Share moment with delivery to circle (Exw-Hai2: shareMoment)
 */
export async function shareMomentSupabase(
  userId: string,
  caption: string,
  imageUrl: string,
  state: EsmeryState,
  client?: SupabaseClient | null
) {
  const supabase = client ?? getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const ts = new Date().toISOString();
  const momentId = newId();

  // Insert moment
  const { error: momentError } = await supabase.from('moments').insert({
    id: momentId,
    user_id: userId,
    caption,
    image_url: imageUrl,
    visibility: 'circle',
    created_at: ts,
  });
  if (momentError) throw momentError;

  // Insert timeline event
  await supabase.from('timeline_events').insert({
    id: newId(),
    user_id: userId,
    type: 'moment',
    title: 'Moment shared',
    body: caption || 'A new moment was shared with your circle.',
    related_entity_id: momentId,
    created_at: ts,
  });

  const recipientIds = state.circleMembers
    .filter((m) => m.status === 'accepted' && m.member_user_id && m.member_user_id !== userId)
    .map((m) => m.member_user_id!)
    .filter((id, i, arr) => arr.indexOf(id) === i);

  const displayName = state.profile.display_name ?? 'Someone';
  for (const receiverId of recipientIds) {
    const title = `${displayName} shared a moment`;
    await supabase.from('timeline_events').insert({
      id: newId(),
      user_id: receiverId,
      type: 'moment',
      title,
      body: caption,
      related_entity_id: momentId,
      created_at: ts,
    });
    await supabase.from('notifications').insert({
      id: newId(),
      user_id: receiverId,
      type: 'moment_shared',
      title,
      body: caption,
      related_entity_id: momentId,
      is_read: false,
      created_at: ts,
    });
  }

  return { id: momentId, user_id: userId, caption, image_url: imageUrl, visibility: 'circle', created_at: ts };
}

export async function saveEmergencyContactSupabase(
  userId: string,
  contact: { id?: string; name: string; contact: string; is_verified?: boolean; auto_notify?: boolean },
  client?: SupabaseClient | null
) {
  const supabase = client ?? getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const row = {
    id: contact.id ?? newId(),
    user_id: userId,
    name: contact.name.trim(),
    contact: contact.contact.trim(),
    is_verified: contact.is_verified ?? false,
    auto_notify: contact.auto_notify ?? true,
  };

  const { data, error } = await supabase.from('emergency_contacts').upsert(row).select().single();
  if (error) throw error;
  return data as EmergencyContact;
}

export async function deleteEmergencyContactSupabase(contactId: string, client?: SupabaseClient | null) {
  const supabase = client ?? getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId);
  if (error) throw error;
}

export async function toggleEmergencyContactVerifiedSupabase(
  userId: string,
  contactId: string,
  isVerified: boolean,
  client?: SupabaseClient | null
) {
  const supabase = client ?? getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const { error } = await supabase
    .from('emergency_contacts')
    .update({ is_verified: isVerified })
    .eq('id', contactId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function toggleEmergencyContactAutoNotifySupabase(
  userId: string,
  contactId: string,
  autoNotify: boolean,
  client?: SupabaseClient | null
) {
  const supabase = client ?? getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const { error } = await supabase
    .from('emergency_contacts')
    .update({ auto_notify: autoNotify })
    .eq('id', contactId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Update user profile (Exw-Hai2: updateProfile)
 */
export async function updateProfileSupabase(userId: string, displayName: string, avatarUrl?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const update: Record<string, unknown> = { display_name: displayName };
  if (avatarUrl !== undefined) update.avatar_url = avatarUrl;

  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) throw error;
}

/**
 * Evaluate missed check-ins (Exw-Hai2: evaluateMissedCheckIns)
 * Returns true if a missed check-in was detected
 */
export async function evaluateMissedCheckInsSupabase(userId: string, state: EsmeryState): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const lastSafeAt = state.profile.last_safe_at;
  if (!lastSafeAt) return false;

  const inactivityHours = state.safetySettings.inactivity_hours ?? 4;
  const lastSafeTime = new Date(lastSafeAt).getTime();
  const now = Date.now();
  const hoursSinceLastSafe = (now - lastSafeTime) / (1000 * 60 * 60);

  if (hoursSinceLastSafe < inactivityHours) return false;

  // Check if we already have an active incident for the same lastSafeAt
  const existingIncident = state.alertIncidents.find(
    (i) => (i.status === 'active' || i.status === 'escalated') && i.last_safe_at === lastSafeAt
  );
  if (existingIncident) return false;

  const ts = new Date().toISOString();
  const incidentId = newId();
  const escalationMinutes = state.safetySettings.escalation_delay_minutes ?? 30;

  // Create missed check-in timeline event
  await supabase.from('timeline_events').insert({
    id: newId(),
    user_id: userId,
    type: 'missed_check_in',
    title: 'Missed check-in detected',
    body: `No check-in for ${inactivityHours} hours.`,
    created_at: ts,
  });

  // Create notification
  const notifId = newId();
  await supabase.from('notifications').insert({
    id: notifId,
    user_id: userId,
    type: 'missed_check_in',
    title: 'Missed check-in',
    body: `It has been ${inactivityHours} hours since your last check-in.`,
    is_read: false,
    created_at: ts,
  });

  // Create alert incident
  await supabase.from('alert_incidents').insert({
    id: incidentId,
    user_id: userId,
    status: 'active',
    reason: 'missed_check_in',
    last_safe_at: lastSafeAt,
    escalation_due_at: new Date(now + escalationMinutes * 60000).toISOString(),
    created_at: ts,
  });

  // Create alert job
  await supabase.from('alert_jobs').insert({
    id: newId(),
    incident_id: incidentId,
    user_id: userId,
    run_at: new Date(now + escalationMinutes * 60000).toISOString(),
    status: 'scheduled',
    created_at: ts,
  });

  return true;
}


export async function shareEmergencyLocationSupabase(
  userId: string,
  latitude: number,
  longitude: number,
  accuracyMeters?: number
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const ts = new Date().toISOString();
  const shareId = newId();

  await supabase.from('location_shares').insert({
    id: shareId,
    user_id: userId,
    latitude,
    longitude,
    accuracy_meters: accuracyMeters,
    created_at: ts,
  });

  // Log audit event
  await supabase.from('audit_logs').insert({
    id: newId(),
    user_id: userId,
    action: 'location_shared',
    metadata: JSON.stringify({ latitude, longitude }),
    created_at: ts,
  });
}


export async function markNotificationReadSupabase(userId: string, notificationId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
  if (error) throw error;
}
