export interface Profile {
  id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_premium: boolean;
  last_safe_at?: string | null;
  /** Mã CK SePay cố định: ESM + 6 số */
  sepay_reference_code?: string | null;
}

export type CircleStatus = 'pending' | 'accepted' | 'declined';

export interface CircleMember {
  id: string;
  owner_user_id: string;
  member_user_id?: string | null;
  invited_contact: string;
  name: string;
  relationship: string;
  status: CircleStatus;
  last_safe_at?: string | null;
}

export interface FriendRequest {
  id: string;
  sender_user_id: string;
  receiver_user_id?: string | null;
  receiver_contact: string;
  status: CircleStatus;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  status: string;
  note?: string | null;
  created_at: string;
}

export type TimelineEventType =
  | 'check_in'
  | 'moment'
  | 'nudge'
  | 'friend_request'
  | 'safety_rhythm'
  | 'missed_check_in'
  | 'emergency';

export interface TimelineEvent {
  id: string;
  user_id: string;
  type: TimelineEventType;
  title: string;
  body: string;
  related_entity_id?: string | null;
  created_at: string;
}

export type NotificationType =
  | 'check_in_success'
  | 'friend_request'
  | 'gentle_nudge'
  | 'missed_check_in'
  | 'emergency_alert'
  | 'moment_shared';

export interface EsmeryNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Moment {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  visibility: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  contact: string;
  is_verified: boolean;
  auto_notify: boolean;
}

export interface SafetyRhythm {
  id: string;
  user_id: string;
  label: string;
  check_time: string;
  is_enabled: boolean;
}

export interface SafetySettings {
  user_id: string;
  inactivity_hours: number;
  escalation_delay_minutes: number;
  location_sharing_enabled: boolean;
}

export type SubscriptionPlan = 'basic' | 'monthly' | 'yearly';

export interface SubscriptionStatus {
  user_id: string;
  plan: SubscriptionPlan;
  is_active: boolean;
}

export type AlertIncidentStatus = 'active' | 'escalated' | 'resolved' | 'cancelled';

export interface AlertIncident {
  id: string;
  user_id: string;
  status: AlertIncidentStatus;
  reason: string;
  last_safe_at?: string | null;
  escalation_due_at: string;
  resolved_at?: string | null;
  created_at: string;
}

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  user_id: string;
  recipient_user_id?: string | null;
  recipient_contact?: string | null;
  channel: string;
  status: DeliveryStatus;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationShare {
  id: string;
  user_id: string;
  incident_id?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  provider: string;
  plan: SubscriptionPlan;
  amount_vnd: number;
  status: string;
  checkout_url?: string | null;
  qr_url?: string | null;
  reference_code: string;
  created_at: string;
  updated_at: string;
}

export interface Entitlement {
  user_id: string;
  plan: SubscriptionPlan;
  is_premium: boolean;
  source: string;
  valid_until?: string | null;
  updated_at: string;
}

export type AlertJobStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed';

export interface AlertJob {
  id: string;
  incident_id: string;
  user_id: string;
  run_at: string;
  status: AlertJobStatus;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  actor_user_id?: string | null;
  action: string;
  metadata?: string | null;
  created_at: string;
}

export interface EsmeryState {
  profile: Profile;
  circleMembers: CircleMember[];
  friendRequests: FriendRequest[];
  checkIns: CheckIn[];
  timelineEvents: TimelineEvent[];
  notifications: EsmeryNotification[];
  moments: Moment[];
  emergencyContacts: EmergencyContact[];
  safetyRhythms: SafetyRhythm[];
  safetySettings: SafetySettings;
  subscriptionStatus: SubscriptionStatus;
  notificationDeliveries: NotificationDelivery[];
  alertIncidents: AlertIncident[];
  alertJobs: AlertJob[];
  locationShares: LocationShare[];
  paymentOrders: PaymentOrder[];
  entitlement: Entitlement;
  auditLogs: AuditLog[];
}

export interface DemoUser {
  id: string;
  email: string;
  display_name: string;
  password: string;
}
