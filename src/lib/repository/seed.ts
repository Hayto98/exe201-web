import type { EsmeryState } from './types';

export const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80',
];

export function emptyUserState(userId: string, displayName: string, email?: string | null): EsmeryState {
  const now = new Date().toISOString();
  return {
    profile: {
      id: userId,
      display_name: displayName,
      email: email ?? null,
      is_premium: false,
      last_safe_at: null,
    },
    circleMembers: [],
    friendRequests: [],
    checkIns: [],
    timelineEvents: [],
    notifications: [],
    moments: [],
    emergencyContacts: [],
    safetyRhythms: [],
    safetySettings: {
      user_id: userId,
      inactivity_hours: 4,
      escalation_delay_minutes: 30,
      location_sharing_enabled: false,
    },
    subscriptionStatus: { user_id: userId, plan: 'basic', is_active: true },
    notificationDeliveries: [],
    alertIncidents: [],
    locationShares: [],
    paymentOrders: [],
    entitlement: {
      user_id: userId,
      plan: 'basic',
      is_premium: false,
      source: 'basic',
      updated_at: now,
    },
  };
}

export function seedState(userId: string, displayName: string, email?: string | null): EsmeryState {
  const morning = '2026-05-27T08:00:00';
  return {
    ...emptyUserState(userId, displayName, email),
    profile: {
      id: userId,
      display_name: displayName,
      email: email ?? null,
      is_premium: false,
      last_safe_at: morning,
    },
    circleMembers: [
      {
        id: 'member-sarah',
        owner_user_id: userId,
        invited_contact: 'sarah@example.com',
        name: 'Sarah',
        relationship: 'Best friend',
        status: 'accepted',
        last_safe_at: morning,
      },
      {
        id: 'member-mom',
        owner_user_id: userId,
        invited_contact: '+84901234567',
        name: 'Mom',
        relationship: 'Family',
        status: 'accepted',
        last_safe_at: '2026-05-27T07:30:00',
      },
    ],
    friendRequests: [
      {
        id: 'request-lucas',
        sender_user_id: userId,
        receiver_contact: 'lucas@example.com',
        status: 'pending',
        created_at: morning,
      },
    ],
    checkIns: [{ id: 'checkin-seed', user_id: userId, status: 'safe', created_at: morning }],
    timelineEvents: [
      {
        id: 'event-checkin',
        user_id: userId,
        type: 'check_in',
        title: 'Morning check-in',
        body: 'Automatic safety heartbeat sent.',
        created_at: morning,
      },
      {
        id: 'event-moment',
        user_id: userId,
        type: 'moment',
        title: 'Moment shared',
        body: 'Morning coffee ritual',
        created_at: '2026-05-27T09:15:00',
      },
    ],
    notifications: [
      {
        id: 'notification-hug',
        user_id: userId,
        type: 'gentle_nudge',
        title: 'Sarah sent a hug',
        body: 'A gentle reminder from your circle.',
        is_read: false,
        created_at: '2026-05-27T09:30:00',
      },
    ],
    moments: [
      {
        id: 'moment-coffee',
        user_id: userId,
        caption: 'Morning coffee ritual',
        image_url: PRESET_IMAGES[0],
        visibility: 'circle',
        created_at: '2026-05-27T09:15:00',
      },
    ],
    emergencyContacts: [
      {
        id: 'contact-mom',
        user_id: userId,
        name: 'Mom',
        contact: '+84901234567',
        is_verified: true,
        auto_notify: true,
      },
    ],
    safetyRhythms: [
      { id: 'rhythm-wakeup', user_id: userId, label: 'Wakeup Check', check_time: '08:00', is_enabled: true },
      { id: 'rhythm-bedtime', user_id: userId, label: 'Bedtime Check', check_time: '22:00', is_enabled: true },
    ],
  };
}
