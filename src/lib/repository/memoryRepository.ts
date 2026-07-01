import { newId } from '@/lib/utils';
import { buildSepayQrUrl } from '@/lib/sepay';
import type {
  CircleStatus,
  EsmeryState,
  EmergencyContact,
  FriendRequest,
  SafetyRhythm,
  SafetySettings,
  SubscriptionPlan,
} from './types';
import { emptyUserState, PRESET_IMAGES, seedState } from './seed';

const states = new Map<string, EsmeryState>();
const demoUsers = new Map<string, { email: string; password: string; display_name: string }>();

function id() {
  return newId();
}

function now() {
  return new Date().toISOString();
}

function normalizeContact(value: string) {
  return value.trim().toLowerCase();
}

function getState(userId: string): EsmeryState {
  return states.get(userId) ?? emptyUserState(userId, 'ESMERY Friend');
}

function setState(userId: string, state: EsmeryState) {
  states.set(userId, state);
}

function mutate(userId: string, fn: (s: EsmeryState) => EsmeryState) {
  const next = fn(getState(userId));
  setState(userId, next);
  return next;
}

export function isDemoMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return !url || url.includes('your-project');
}

export function registerDemoUser(email: string, password: string, displayName: string) {
  const userId = id();
  demoUsers.set(normalizeContact(email), { email: normalizeContact(email), password, display_name: displayName });
  setState(userId, emptyUserState(userId, displayName, email));
  return { id: userId, email: normalizeContact(email), display_name: displayName };
}

export function authenticateDemo(email: string, password: string) {
  const key = normalizeContact(email);
  const user = demoUsers.get(key);
  if (!user || user.password !== password) return null;
  const existing = [...states.entries()].find(([, s]) => s.profile.email === key);
  if (existing) return { id: existing[0], email: key, display_name: existing[1].profile.display_name };
  const userId = id();
  const displayName = user.display_name || key.split('@')[0];
  setState(userId, seedState(userId, displayName, key));
  return { id: userId, email: key, display_name: displayName };
}

export function loadUserState(userId: string, useSeed = false): EsmeryState {
  if (!states.has(userId)) {
    const s = useSeed ? seedState(userId, 'Demo User') : emptyUserState(userId, 'ESMERY Friend');
    setState(userId, s);
  }
  return getState(userId);
}

export function refreshState(userId: string): EsmeryState {
  return getState(userId);
}

export function checkIn(userId: string, note?: string) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    profile: { ...s.profile, last_safe_at: ts },
    checkIns: [{ id: id(), user_id: userId, status: 'safe', note, created_at: ts }, ...s.checkIns],
    timelineEvents: [
      {
        id: id(),
        user_id: userId,
        type: 'check_in',
        title: 'Check-in confirmed',
        body: 'Your circle has been notified.',
        created_at: ts,
      },
      ...s.timelineEvents,
    ],
    notifications: [
      {
        id: id(),
        user_id: userId,
        type: 'check_in_success',
        title: 'Check-in sent',
        body: 'Your circle has been notified that you are safe.',
        is_read: false,
        created_at: ts,
      },
      ...s.notifications,
    ],
    circleMembers: s.circleMembers.map((m) => ({ ...m, last_safe_at: ts })),
    alertIncidents: s.alertIncidents.map((i) =>
      i.status === 'active' ? { ...i, status: 'resolved' as const, resolved_at: ts } : i
    ),
  }));
}

export function addFriend(userId: string, contact: string, name: string, relationship: string) {
  const ts = now();
  const normalized = normalizeContact(contact);
  mutate(userId, (s) => {
    const request: FriendRequest = {
      id: id(),
      sender_user_id: userId,
      receiver_contact: normalized,
      status: 'pending',
      created_at: ts,
    };
    return {
      ...s,
      friendRequests: [request, ...s.friendRequests],
      circleMembers: [
        {
          id: request.id,
          owner_user_id: userId,
          invited_contact: normalized,
          name: name || normalized,
          relationship: relationship || 'Trusted contact',
          status: 'pending',
        },
        ...s.circleMembers,
      ],
      timelineEvents: [
        {
          id: id(),
          user_id: userId,
          type: 'friend_request',
          title: 'Circle invitation sent',
          body: `Invitation sent to ${name || normalized}.`,
          created_at: ts,
        },
        ...s.timelineEvents,
      ],
    };
  });
}

export function updateFriendRequest(userId: string, requestId: string, status: CircleStatus) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    friendRequests: s.friendRequests.map((r) => (r.id === requestId ? { ...r, status } : r)),
    circleMembers: s.circleMembers.map((m) => (m.id === requestId ? { ...m, status } : m)),
    timelineEvents: [
      {
        id: id(),
        user_id: userId,
        type: 'friend_request',
        title: status === 'accepted' ? 'Circle invitation accepted' : 'Circle invitation declined',
        body: 'Request status updated.',
        created_at: ts,
      },
      ...s.timelineEvents,
    ],
  }));
}

export function sendNudge(userId: string, memberId: string) {
  const ts = now();
  const member = getState(userId).circleMembers.find((m) => m.id === memberId);
  mutate(userId, (s) => ({
    ...s,
    timelineEvents: [
      {
        id: id(),
        user_id: userId,
        type: 'nudge',
        title: 'Gentle nudge sent',
        body: `A gentle reminder was sent to ${member?.name ?? 'your circle member'}.`,
        created_at: ts,
      },
      ...s.timelineEvents,
    ],
    notifications: [
      {
        id: id(),
        user_id: userId,
        type: 'gentle_nudge',
        title: 'Gentle nudge sent',
        body: `A gentle reminder was sent to ${member?.name ?? 'your circle member'}.`,
        is_read: false,
        created_at: ts,
      },
      ...s.notifications,
    ],
  }));
}

export function shareMoment(userId: string, caption: string, imageUrl: string) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    moments: [
      { id: id(), user_id: userId, caption, image_url: imageUrl, visibility: 'circle', created_at: ts },
      ...s.moments,
    ],
    timelineEvents: [
      {
        id: id(),
        user_id: userId,
        type: 'moment',
        title: 'Moment shared',
        body: caption,
        created_at: ts,
      },
      ...s.timelineEvents,
    ],
    notifications: [
      {
        id: id(),
        user_id: userId,
        type: 'moment_shared',
        title: 'Moment shared',
        body: caption,
        is_read: false,
        created_at: ts,
      },
      ...s.notifications,
    ],
  }));
}

export function markNotificationRead(userId: string, notificationId: string) {
  mutate(userId, (s) => ({
    ...s,
    notifications: s.notifications.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ),
  }));
}

export function saveEmergencyContact(userId: string, contact: Omit<EmergencyContact, 'id' | 'user_id'> & { id?: string }) {
  mutate(userId, (s) => {
    if (contact.id) {
      return {
        ...s,
        emergencyContacts: s.emergencyContacts.map((c) =>
          c.id === contact.id ? { ...c, ...contact, user_id: userId } : c
        ),
      };
    }
    return {
      ...s,
      emergencyContacts: [
        ...s.emergencyContacts,
        { id: id(), user_id: userId, ...contact, is_verified: contact.is_verified ?? false, auto_notify: contact.auto_notify ?? true },
      ],
    };
  });
}

export function deleteEmergencyContact(userId: string, contactId: string) {
  mutate(userId, (s) => ({
    ...s,
    emergencyContacts: s.emergencyContacts.filter((c) => c.id !== contactId),
  }));
}

export function toggleEmergencyVerified(userId: string, contactId: string) {
  mutate(userId, (s) => ({
    ...s,
    emergencyContacts: s.emergencyContacts.map((c) =>
      c.id === contactId ? { ...c, is_verified: !c.is_verified } : c
    ),
  }));
}

export function toggleEmergencyAutoNotify(userId: string, contactId: string) {
  mutate(userId, (s) => ({
    ...s,
    emergencyContacts: s.emergencyContacts.map((c) =>
      c.id === contactId ? { ...c, auto_notify: !c.auto_notify } : c
    ),
  }));
}

export function saveRhythm(userId: string, rhythm: Partial<SafetyRhythm> & { label: string; check_time: string }) {
  mutate(userId, (s) => {
    if (rhythm.id) {
      return {
        ...s,
        safetyRhythms: s.safetyRhythms.map((r) =>
          r.id === rhythm.id ? { ...r, label: rhythm.label, check_time: rhythm.check_time } : r
        ),
      };
    }
    return {
      ...s,
      safetyRhythms: [
        ...s.safetyRhythms,
        { id: id(), user_id: userId, label: rhythm.label, check_time: rhythm.check_time, is_enabled: true },
      ],
    };
  });
}

export function deleteRhythm(userId: string, rhythmId: string) {
  mutate(userId, (s) => ({
    ...s,
    safetyRhythms: s.safetyRhythms.filter((r) => r.id !== rhythmId),
  }));
}

export function toggleRhythm(userId: string, rhythmId: string) {
  mutate(userId, (s) => ({
    ...s,
    safetyRhythms: s.safetyRhythms.map((r) =>
      r.id === rhythmId ? { ...r, is_enabled: !r.is_enabled } : r
    ),
  }));
}

export function updateSafetySettings(userId: string, settings: Partial<SafetySettings>) {
  mutate(userId, (s) => ({
    ...s,
    safetySettings: { ...s.safetySettings, ...settings },
  }));
}

export function triggerEmergency(userId: string) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    alertIncidents: [
      {
        id: id(),
        user_id: userId,
        status: 'active',
        reason: 'Manual emergency alert',
        escalation_due_at: new Date(Date.now() + 30 * 60000).toISOString(),
        created_at: ts,
      },
      ...s.alertIncidents,
    ],
    timelineEvents: [
      {
        id: id(),
        user_id: userId,
        type: 'emergency',
        title: 'Emergency alert sent',
        body: 'Your emergency contacts have been notified.',
        created_at: ts,
      },
      ...s.timelineEvents,
    ],
    notifications: [
      {
        id: id(),
        user_id: userId,
        type: 'emergency_alert',
        title: 'Emergency alert sent',
        body: 'Your emergency contacts have been notified.',
        is_read: false,
        created_at: ts,
      },
      ...s.notifications,
    ],
  }));
}

export function shareLocation(userId: string, latitude: number, longitude: number) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    locationShares: [
      {
        id: id(),
        user_id: userId,
        latitude,
        longitude,
        status: 'active',
        created_at: ts,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      ...s.locationShares,
    ],
  }));
}

export function resolveIncident(userId: string, incidentId: string) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    alertIncidents: s.alertIncidents.map((i) =>
      i.id === incidentId ? { ...i, status: 'resolved', resolved_at: ts } : i
    ),
  }));
}

export function updateSubscription(userId: string, plan: SubscriptionPlan) {
  const ts = now();
  mutate(userId, (s) => ({
    ...s,
    subscriptionStatus: { user_id: userId, plan, is_active: true },
    profile: { ...s.profile, is_premium: plan !== 'basic' },
    entitlement: {
      user_id: userId,
      plan,
      is_premium: plan !== 'basic',
      source: 'manual',
      updated_at: ts,
    },
  }));
}

export function updateProfile(userId: string, displayName: string, avatarUrl?: string | null) {
  mutate(userId, (s) => ({
    ...s,
    profile: {
      ...s.profile,
      display_name: displayName,
      avatar_url: avatarUrl !== undefined ? avatarUrl : s.profile.avatar_url,
    },
  }));
}

export function createPaymentOrder(userId: string, plan: SubscriptionPlan) {
  const ts = now();
  const amounts = { basic: 0, monthly: 49000, yearly: 499000 };
  const ref = `ESM-${userId.slice(0, 8)}-${Date.now()}`;
  const amount = amounts[plan];
  const qrUrl = amount > 0 ? buildSepayQrUrl(amount, ref) : null;
  mutate(userId, (s) => ({
    ...s,
    paymentOrders: [
      {
        id: id(),
        user_id: userId,
        provider: 'sepay',
        plan,
        amount_vnd: amount,
        status: 'pending',
        reference_code: ref,
        qr_url: qrUrl,
        created_at: ts,
        updated_at: ts,
      },
      ...s.paymentOrders,
    ],
  }));
  return { reference: ref, qrUrl, amount };
}

export { PRESET_IMAGES };
