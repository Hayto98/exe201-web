import { getSupabaseClient } from '@/lib/supabase/client';
import { buildSepayQrUrl } from '@/lib/sepay';
import { newId } from '@/lib/utils';
import type { EsmeryState, PaymentOrder, SubscriptionPlan } from './types';
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

  const [
    profile,
    circleMembers,
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
    locationShares,
    paymentOrders,
    entitlement,
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
    fetchTable<typeof base.locationShares[0]>('location_shares', 'user_id', userId),
    fetchTable<typeof base.paymentOrders[0]>('payment_orders', 'user_id', userId),
    fetchSingle<typeof base.entitlement>('entitlements', 'user_id', userId),
  ]);

  // Incoming friend requests by contact
  let friendRequestsReceived: typeof base.friendRequests = [];
  if (email) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from('friend_requests')
        .select('*')
        .ilike('receiver_contact', email.trim().toLowerCase());
      friendRequestsReceived = (data ?? []) as typeof base.friendRequests;
    }
  }

  const friendRequests = [...friendRequestsSent, ...friendRequestsReceived].filter(
    (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i
  );

  return {
    ...base,
    profile: profile ?? base.profile,
    circleMembers,
    friendRequests,
    checkIns: checkIns.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    timelineEvents: timelineEvents.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    notifications: notifications.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    moments: moments.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    emergencyContacts,
    safetyRhythms,
    safetySettings: safetySettings ?? base.safetySettings,
    subscriptionStatus: subscriptionStatus ?? base.subscriptionStatus,
    notificationDeliveries,
    alertIncidents,
    locationShares,
    paymentOrders: paymentOrders.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    entitlement: entitlement ?? base.entitlement,
  };
}

const PLAN_AMOUNTS: Record<SubscriptionPlan, number> = {
  basic: 0,
  monthly: 49000,
  yearly: 499000,
};

export async function updateSubscriptionSupabase(userId: string, plan: SubscriptionPlan) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const now = new Date().toISOString();
  const isPremium = plan !== 'basic';

  const { error: subError } = await supabase.from('subscription_status').upsert({
    user_id: userId,
    plan,
    is_active: true,
    updated_at: now,
  });
  if (subError) throw subError;

  const { error: entError } = await supabase.from('entitlements').upsert({
    user_id: userId,
    plan,
    is_premium: isPremium,
    source: plan === 'basic' ? 'basic' : 'manual',
    updated_at: now,
  });
  if (entError) throw entError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', userId);
  if (profileError) throw profileError;
}

export async function createPaymentOrderSupabase(
  userId: string,
  plan: SubscriptionPlan
): Promise<PaymentOrder> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const amount = PLAN_AMOUNTS[plan];
  const reference = `ESM-${userId.slice(0, 8).replace(/-/g, '')}-${Date.now()}`;
  const qrUrl = buildSepayQrUrl(amount, reference);
  const now = new Date().toISOString();
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

  if (error) throw error;
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
