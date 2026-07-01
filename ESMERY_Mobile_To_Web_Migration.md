# ESMERY — Hướng dẫn chuyển đổi Mobile (Android Kotlin/Compose) sang Web

> **Tài liệu tham chiếu đầy đủ**: Dựa trên source code Exw-Hai (Android Kotlin + Jetpack Compose + Supabase) để xây dựng phiên bản Web tương đương.

---

## Mục lục

1. [Tổng quan kiến trúc Mobile hiện tại](#1-tổng-quan-kiến-trúc-mobile-hiện-tại)
2. [Kiến trúc Web đề xuất](#2-kiến-trúc-web-đề-xuất)
3. [Bảng ánh xạ Technology Stack](#3-bảng-ánh-xạ-technology-stack)
4. [Cấu trúc thư mục Web](#4-cấu-trúc-thư-mục-web)
5. [Data Models — Chuyển đổi chi tiết](#5-data-models--chuyển-đổi-chi-tiết)
6. [Supabase Client — Khởi tạo cho Web](#6-supabase-client--khởi-tạo-cho-web)
7. [Repository Pattern — Chuyển đổi](#7-repository-pattern--chuyển-đổi)
8. [Authentication — Chuyển đổi chi tiết](#8-authentication--chuyển-đổi-chi-tiết)
9. [Routing & Navigation](#9-routing--navigation)
10. [Theme & Design System](#10-theme--design-system)
11. [I18n (Đa ngôn ngữ)](#11-i18n-đa-ngôn-ngữ)
12. [Reusable Components — Chuyển đổi](#12-reusable-components--chuyển-đổi)
13. [Screens — Chuyển đổi từng màn hình](#13-screens--chuyển-đổi-từng-màn-hình)
14. [State Management](#14-state-management)
15. [Realtime & Notifications](#15-realtime--notifications)
16. [Android-only Features — Xử lý trên Web](#16-android-only-features--xử-lý-trên-web)
17. [Database Schema — Dùng chung](#17-database-schema--dùng-chung)
18. [Edge Functions — Dùng chung](#18-edge-functions--dùng-chung)
19. [Payment — Thay đổi cho Web](#19-payment--thay-đổi-cho-web)
20. [Testing Strategy](#20-testing-strategy)
21. [Deployment Checklist](#21-deployment-checklist)
22. [Phụ lục: Mapping file-by-file](#phụ-lục-mapping-file-by-file)

---

## 1. Tổng quan kiến trúc Mobile hiện tại

### Cây thư mục chính (Android)

```
Exw-Hai/app/src/main/java/com/example/
├── MainActivity.kt                    # Entry point, NavHost, Routes
├── EsmeryServices.kt                  # Service locator (repository singleton)
├── SupabaseClient.kt                  # Supabase client init
├── AuthGateway                        # (trong EsmeryServices.kt)
│
├── automation/
│   ├── DeviceTokenBootstrap.kt        # FCM token registration
│   ├── EsmeryMessagingService.kt      # FCM message handler
│   ├── EsmeryNotificationChannels.kt  # Android notification channels
│   ├── SafetyAutomationScheduler.kt   # WorkManager periodic schedule
│   └── SafetyCheckWorker.kt          # Background safety check worker
│
├── core/
│   ├── i18n/
│   │   └── AppLanguage.kt            # I18n: EN/VI toggle, t(), tr(), appString()
│   ├── ui/
│   │   └── EsmeryComponents.kt       # Reusable UI: ScreenList, InfoCard, CardBlock, etc.
│   └── viewmodel/
│       └── EsmeryViewModelFactory.kt  # ViewModel factory
│
├── data/
│   ├── EsmeryModels.kt               # 20+ data classes & enums
│   ├── EsmeryRepository.kt           # Repository interface (40+ methods)
│   ├── InMemoryEsmeryRepository.kt   # In-memory implementation + seed data
│   ├── SupabaseEsmeryRepository.kt   # Supabase production implementation
│   ├── ResilientEsmeryRepository.kt  # Wrapper with fallback
│   ├── BillingManager.kt             # Google Play Billing
│   ├── EsmeryRealtime.kt             # Supabase Realtime
│   └── EsmeryStorage.kt              # Supabase Storage
│
├── feature/
│   ├── auth/
│   │   └── AuthScreens.kt            # WelcomeScreen, SignUpScreen
│   ├── onboarding/
│   │   └── OnboardingScreens.kt      # OnboardingPager, CircleSetup, RhythmSetup
│   ├── home/
│   │   └── HomeScreen.kt             # Main container + bottom nav (8 tabs)
│   ├── hearth/
│   │   ├── HearthScreen.kt           # Home tab: "I'm Safe", status, notifications
│   │   └── HearthViewModel.kt
│   ├── circle/
│   │   ├── CircleScreen.kt           # Circle management, friend requests
│   │   ├── CircleViewModel.kt
│   │   └── QrScannerScreen.kt        # QR scanner (camera)
│   ├── timeline/
│   │   ├── TimelineScreen.kt         # Activity history
│   │   └── TimelineViewModel.kt
│   ├── moments/
│   │   ├── MomentsScreen.kt          # Share moments with circle
│   │   └── MomentsViewModel.kt
│   ├── safety/
│   │   ├── SafetyScreen.kt           # Safety rhythm, settings
│   │   └── SafetyViewModel.kt
│   ├── crisis/
│   │   ├── CrisisScreen.kt           # Emergency contacts, alert, location
│   │   └── CrisisViewModel.kt
│   ├── plans/
│   │   ├── PlansScreen.kt            # Subscription plans, payment
│   │   └── PlansViewModel.kt
│   └── profile/
│       ├── ProfileScreen.kt          # Profile edit, avatar, password, delete
│       └── ProfileViewModel.kt
│
└── ui/theme/
    ├── Color.kt                       # Color palette
    ├── Theme.kt                       # Material theme
    └── Type.kt                        # Typography
```

### Kiến trúc tổng quan

```
┌─────────────────────────────────────────┐
│           Jetpack Compose UI            │
│  (Screens + Reusable Components)        │
├─────────────────────────────────────────┤
│         ViewModels (per feature)        │
├─────────────────────────────────────────┤
│    EsmeryRepository (interface)         │
│    ├── InMemoryEsmeryRepository         │
│    ├── SupabaseEsmeryRepository         │
│    └── ResilientEsmeryRepository        │
├─────────────────────────────────────────┤
│      Supabase Client (Kotlin SDK)       │
│  Auth | Postgrest | Storage | Realtime  │
├─────────────────────────────────────────┤
│        Android Platform Services        │
│  WorkManager | FCM | GPS | Billing      │
└─────────────────────────────────────────┘
```

---

## 2. Kiến trúc Web đề xuất

```
┌─────────────────────────────────────────┐
│         Next.js (React) Pages           │
│   (Pages/Components + CSS Modules)      │
├─────────────────────────────────────────┤
│   React Context / Zustand (State)       │
│   Custom Hooks (per feature)            │
├─────────────────────────────────────────┤
│    Supabase JS Client (@supabase/ssr)   │
│  Auth | Postgrest | Storage | Realtime  │
├─────────────────────────────────────────┤
│     Browser APIs (thay thế Android)     │
│  Web Push | Geolocation | File Input    │
│  Stripe/SePay (thay Google Play)        │
└─────────────────────────────────────────┘
```

---

## 3. Bảng ánh xạ Technology Stack

| Thành phần | Mobile (Android) | Web (đề xuất) |
|---|---|---|
| **UI Framework** | Jetpack Compose | React (Next.js 14+ App Router) |
| **Language** | Kotlin | TypeScript |
| **Styling** | Material3 + Custom Colors | CSS Modules / Vanilla CSS |
| **Routing** | NavHost + composable routes | Next.js App Router (`/app/...`) |
| **State Management** | StateFlow + ViewModel | React Context + `useState`/`useReducer` hoặc Zustand |
| **Backend Client** | Supabase Kotlin SDK | `@supabase/supabase-js` + `@supabase/ssr` |
| **Auth** | Supabase Auth (Kotlin) | Supabase Auth (JS) + middleware SSR |
| **Database** | Supabase Postgrest (Kotlin) | Supabase Postgrest (JS) — cùng schema |
| **Storage** | Supabase Storage (Kotlin) | Supabase Storage (JS) — cùng bucket |
| **Realtime** | Supabase Realtime (Kotlin) | Supabase Realtime (JS) |
| **Push Notification** | FCM + WorkManager | Web Push API + Service Worker |
| **Background Job** | WorkManager | Supabase Cron / Edge Functions |
| **Location** | Android GPS (FusedLocationProvider) | Browser Geolocation API |
| **Payment** | Google Play Billing + SePay | Stripe / SePay (web checkout) |
| **Image Loading** | Coil `AsyncImage` | `<img>` / `next/image` |
| **Image Upload** | Android `ActivityResultContracts.GetContent` | `<input type="file">` |
| **QR Scanner** | CameraX + Barcode | `html5-qrcode` hoặc `@zxing/browser` |
| **I18n** | Custom `t(en, vi)` + `appString()` | `next-intl` hoặc custom i18n tương tự |
| **Serialization** | Kotlinx Serialization | TypeScript interfaces (JSON native) |
| **Testing** | JUnit + Compose UI Test | Jest/Vitest + React Testing Library |
| **Build** | Gradle + AGP | Next.js build / Vercel |

---

## 4. Cấu trúc thư mục Web

```
Web/
├── .env.local                          # SUPABASE_URL, SUPABASE_ANON_KEY
├── next.config.js
├── package.json
├── tsconfig.json
│
├── public/
│   └── icons/                          # App icons
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout (theme, font, providers)
│   │   ├── page.tsx                    # Redirect → /auth/signin
│   │   ├── globals.css                 # Global CSS variables (theme)
│   │   │
│   │   ├── auth/
│   │   │   ├── signin/page.tsx         # ← WelcomeScreen
│   │   │   ├── signup/page.tsx         # ← SignUpScreen
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   ├── onboarding/
│   │   │   ├── page.tsx               # ← OnboardingPagerScreen
│   │   │   ├── circle-setup/page.tsx  # ← CircleSetupScreen
│   │   │   └── rhythm-setup/page.tsx  # ← RhythmSetupScreen
│   │   │
│   │   └── dashboard/                 # ← HomeScreen (sau login)
│   │       ├── layout.tsx             # Sidebar/Bottom nav + auth guard
│   │       ├── page.tsx               # ← HearthScreen (default tab)
│   │       ├── circle/page.tsx        # ← CircleScreen
│   │       ├── timeline/page.tsx      # ← TimelineScreen
│   │       ├── moments/page.tsx       # ← MomentsScreen
│   │       ├── safety/page.tsx        # ← SafetyScreen
│   │       ├── crisis/page.tsx        # ← CrisisScreen
│   │       ├── plans/page.tsx         # ← PlansScreen
│   │       └── profile/page.tsx       # ← ProfileScreen
│   │
│   ├── components/                    # Reusable UI components
│   │   ├── ui/
│   │   │   ├── InfoCard.tsx           # ← InfoCard composable
│   │   │   ├── CardBlock.tsx          # ← CardBlock composable
│   │   │   ├── PrimaryButton.tsx      # ← PrimaryButton composable
│   │   │   ├── EsmeryTextField.tsx     # ← EsmeryTextField composable
│   │   │   ├── InlineMessage.tsx      # ← InlineMessage composable
│   │   │   ├── AvatarInitial.tsx      # ← AvatarInitial composable
│   │   │   ├── LanguageButton.tsx     # ← LanguageButton composable
│   │   │   └── ScreenLayout.tsx       # ← ScreenList composable (page wrapper)
│   │   │
│   │   ├── navigation/
│   │   │   ├── Sidebar.tsx            # Desktop sidebar nav (8 tabs)
│   │   │   └── BottomNav.tsx          # Mobile bottom nav (8 tabs)
│   │   │
│   │   └── dialogs/
│   │       ├── AddFriendDialog.tsx     # ← AddFriendDialog
│   │       ├── MomentDialog.tsx        # ← MomentDialog
│   │       └── EmergencyContactDialog.tsx # ← EmergencyContactDialog
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # ← SupabaseClient.kt
│   │   │   ├── server.ts             # SSR supabase client
│   │   │   └── middleware.ts          # Auth middleware
│   │   │
│   │   ├── repository/
│   │   │   ├── types.ts              # ← EsmeryModels.kt (TypeScript interfaces)
│   │   │   ├── repository.ts         # ← EsmeryRepository.kt (functions)
│   │   │   └── seed.ts              # ← InMemoryEsmeryRepository.seedState()
│   │   │
│   │   └── i18n/
│   │       ├── translations.ts       # ← AppLanguage.kt (all translations)
│   │       └── useLanguage.ts        # Hook for language toggle
│   │
│   ├── hooks/
│   │   ├── useAuth.ts               # ← AuthGateway
│   │   ├── useEsmeryState.ts        # ← ViewModel.esmeryState
│   │   ├── useCheckin.ts            # ← HearthViewModel
│   │   ├── useCircle.ts             # ← CircleViewModel
│   │   ├── useMoments.ts            # ← MomentsViewModel
│   │   ├── useSafety.ts             # ← SafetyViewModel
│   │   ├── useCrisis.ts             # ← CrisisViewModel
│   │   ├── usePlans.ts              # ← PlansViewModel
│   │   ├── useProfile.ts            # ← ProfileViewModel
│   │   └── useRealtime.ts           # ← EsmeryRealtime
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Auth state provider
│   │   ├── EsmeryContext.tsx         # App state provider (≈ repository state)
│   │   └── LanguageContext.tsx       # I18n context provider
│   │
│   └── styles/
│       ├── variables.css             # CSS custom properties (colors, spacing)
│       ├── components.module.css     # Component-level styles
│       └── pages.module.css          # Page-level styles
```

---

## 5. Data Models — Chuyển đổi chi tiết

### Mobile (Kotlin data classes — `EsmeryModels.kt`)

Tất cả model sử dụng `@Serializable` với `@SerialName` để map snake_case từ Supabase.

### Web (TypeScript interfaces — `src/lib/repository/types.ts`)

```typescript
// ===== Profile =====
export interface Profile {
  id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_premium: boolean;
  last_safe_at?: string | null;
}

// ===== Circle =====
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

// ===== Friend Request =====
export interface FriendRequest {
  id: string;
  sender_user_id: string;
  receiver_user_id?: string | null;
  receiver_contact: string;
  status: CircleStatus;
  created_at: string;
}

// ===== Check-in =====
export interface CheckIn {
  id: string;
  user_id: string;
  status: string; // default 'safe'
  note?: string | null;
  created_at: string;
}

// ===== Timeline =====
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

// ===== Notification =====
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

// ===== Moment =====
export interface Moment {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  visibility: string; // default 'circle'
  created_at: string;
}

// ===== Emergency Contact =====
export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  contact: string;
  is_verified: boolean;
  auto_notify: boolean;
}

// ===== Safety Rhythm =====
export interface SafetyRhythm {
  id: string;
  user_id: string;
  label: string;
  check_time: string;
  is_enabled: boolean;
}

// ===== Safety Settings =====
export interface SafetySettings {
  user_id: string;
  inactivity_hours: number;      // 2 | 4 | 12
  escalation_delay_minutes: number; // 15 | 30 | 60
  location_sharing_enabled: boolean;
}

// ===== Subscription =====
export type SubscriptionPlan = 'basic' | 'monthly' | 'yearly';

export interface SubscriptionStatus {
  user_id: string;
  plan: SubscriptionPlan;
  is_active: boolean;
}

// ===== Device Token =====
export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  provider: string;     // 'fcm' | 'web_push'
  platform: string;     // 'android' | 'web'
  app_version?: string | null;
  is_active: boolean;
  created_at: string;
  last_seen_at: string;
}

// ===== Notification Delivery =====
export type DeliveryChannel = 'in_app' | 'push' | 'sms' | 'email' | 'call';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  user_id: string;
  recipient_user_id?: string | null;
  recipient_contact?: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Alert Incident =====
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

// ===== Alert Job =====
export type AlertJobStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed';

export interface AlertJob {
  id: string;
  incident_id: string;
  user_id: string;
  run_at: string;
  status: AlertJobStatus;
  created_at: string;
}

// ===== Location Share =====
export type LocationShareStatus = 'active' | 'expired' | 'revoked';

export interface LocationShare {
  id: string;
  user_id: string;
  incident_id?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  status: LocationShareStatus;
  created_at: string;
  expires_at: string;
}

// ===== Payment =====
export type PaymentProvider = 'google_play' | 'sepay' | 'stripe';
export type PaymentOrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed';

export interface PaymentOrder {
  id: string;
  user_id: string;
  provider: PaymentProvider;
  plan: SubscriptionPlan;
  amount_vnd: number;
  status: PaymentOrderStatus;
  checkout_url?: string | null;
  qr_url?: string | null;
  reference_code: string;
  created_at: string;
  updated_at: string;
}

// ===== Entitlement =====
export type EntitlementSource = 'basic' | 'google_play' | 'sepay' | 'stripe' | 'manual';

export interface Entitlement {
  user_id: string;
  plan: SubscriptionPlan;
  is_premium: boolean;
  source: EntitlementSource;
  valid_until?: string | null;
  updated_at: string;
}

// ===== Audit Log =====
export interface AuditLog {
  id: string;
  user_id: string;
  actor_user_id?: string | null;
  action: string;
  metadata?: string | null;
  created_at: string;
}

// ===== App State (tổng hợp) =====
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
  deviceTokens: DeviceToken[];
  notificationDeliveries: NotificationDelivery[];
  alertIncidents: AlertIncident[];
  alertJobs: AlertJob[];
  locationShares: LocationShare[];
  paymentOrders: PaymentOrder[];
  entitlement: Entitlement;
  auditLogs: AuditLog[];
}
```

> **Lưu ý quan trọng**: Web dùng trực tiếp snake_case từ Supabase (không cần `@SerialName`). TypeScript interfaces map 1:1 với schema SQL.

---

## 6. Supabase Client — Khởi tạo cho Web

### Mobile (SupabaseClient.kt)

```kotlin
val supabase = createSupabaseClient(
  supabaseUrl = BuildConfig.SUPABASE_URL,
  supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
) {
  install(Auth)
  install(Postgrest)
  install(Storage)
  install(Realtime)
  install(Functions)
}
```

### Web (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Web SSR (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 7. Repository Pattern — Chuyển đổi

### Mobile: Interface `EsmeryRepository` (42 methods)

```kotlin
interface EsmeryRepository {
  val state: StateFlow<EsmeryState>
  suspend fun loadForUser(userId, email, displayName)
  suspend fun refresh()
  suspend fun clearLocalSession()
  suspend fun checkIn(note?)
  suspend fun addFriendRequest(contact, name, relationship)
  suspend fun updateFriendRequest(requestId, status)
  suspend fun sendNudge(memberId)
  suspend fun shareMoment(caption, imageUrl)
  suspend fun markNotificationRead(notificationId)
  suspend fun saveEmergencyContact(contact)
  suspend fun deleteEmergencyContact(contactId)
  suspend fun toggleEmergencyContactVerified(contactId)
  suspend fun toggleEmergencyContactAutoNotify(contactId)
  suspend fun saveSafetyRhythm(rhythm)
  suspend fun deleteSafetyRhythm(rhythmId)
  suspend fun toggleSafetyRhythm(rhythmId)
  suspend fun updateSafetySettings(settings)
  suspend fun evaluateMissedCheckIns()
  suspend fun triggerEmergencyAlert()
  suspend fun updateSubscription(plan)
  suspend fun registerDeviceToken(token, provider)
  suspend fun unregisterDeviceToken(token)
  suspend fun resolveAlertIncident(incidentId)
  suspend fun shareEmergencyLocation(latitude, longitude, accuracy?)
  suspend fun createPaymentOrder(plan, provider)
  suspend fun markPaymentOrderPaid(referenceCode)
  suspend fun updateProfile(displayName, avatarUrl?)
  suspend fun changePassword(newPassword)
  suspend fun deleteAccount()
  suspend fun uploadMomentImage(imageBytes, fileName)
  suspend fun uploadAvatarImage(imageBytes, fileName)
  suspend fun startNotificationRealtime(onNewNotification)
  suspend fun stopNotificationRealtime()
}
```

### Web: Chuyển thành module functions (`src/lib/repository/repository.ts`)

Trên web **KHÔNG dùng class + interface** mà dùng **exported functions** (hoặc custom hooks). Mỗi function gọi thẳng Supabase JS.

```typescript
// Ví dụ cho checkIn
export async function checkIn(userId: string, note?: string): Promise<CheckIn> {
  const now = new Date().toISOString();
  const { data: checkInData } = await supabase
    .from('check_ins')
    .insert({ user_id: userId, status: 'safe', note, created_at: now })
    .select()
    .single();

  // Cập nhật profile.last_safe_at
  await supabase
    .from('profiles')
    .update({ last_safe_at: now })
    .eq('id', userId);

  // Tạo timeline event
  await supabase.from('timeline_events').insert({
    user_id: userId,
    type: 'check_in',
    title: 'Check-in confirmed',
    body: 'Your circle has been notified.',
    related_entity_id: checkInData.id,
    created_at: now,
  });

  // Tạo notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'check_in_success',
    title: 'Check-in sent',
    body: 'Your circle has been notified that you are safe.',
    related_entity_id: checkInData.id,
    created_at: now,
  });

  // Tạo delivery records cho accepted circle members
  const { data: members } = await supabase
    .from('circle_members')
    .select('member_user_id')
    .eq('owner_user_id', userId)
    .eq('status', 'accepted');

  if (members?.length) {
    const deliveries = members
      .filter(m => m.member_user_id)
      .map(m => ({
        notification_id: checkInData.id,
        user_id: userId,
        recipient_user_id: m.member_user_id,
        channel: 'in_app',
        status: 'pending',
        created_at: now,
        updated_at: now,
      }));
    await supabase.from('notification_deliveries').insert(deliveries);
  }

  return checkInData;
}
```

> **Pattern áp dụng cho tất cả 40+ repository methods**: Mỗi `suspend fun` trong Kotlin → 1 `async function` trong TypeScript, gọi trực tiếp `supabase.from(...)`.

### Bảng ánh xạ Repository Methods → Web Functions

| Mobile Method | Web Function | Supabase Tables |
|---|---|---|
| `loadForUser()` | `loadUserState()` | profiles, circle_members, friend_requests, check_ins, timeline_events, notifications, moments, emergency_contacts, safety_rhythms, safety_settings, subscription_status, device_tokens, notification_deliveries, alert_incidents, alert_jobs, location_shares, payment_orders, entitlements |
| `refresh()` | `refreshState()` | Tất cả tables trên |
| `clearLocalSession()` | `clearSession()` | Local state reset |
| `checkIn()` | `checkIn()` | check_ins, profiles, timeline_events, notifications, notification_deliveries |
| `addFriendRequest()` | `addFriend()` | friend_requests, circle_members, timeline_events |
| `updateFriendRequest()` | `updateFriendRequest()` | friend_requests, circle_members |
| `sendNudge()` | `sendNudge()` | timeline_events, notifications, notification_deliveries |
| `shareMoment()` | `shareMoment()` | moments, timeline_events, notifications, notification_deliveries |
| `markNotificationRead()` | `markRead()` | notifications |
| `saveEmergencyContact()` | `saveEmergencyContact()` | emergency_contacts |
| `deleteEmergencyContact()` | `deleteEmergencyContact()` | emergency_contacts |
| `toggleEmergencyContactVerified()` | `toggleVerified()` | emergency_contacts |
| `toggleEmergencyContactAutoNotify()` | `toggleAutoNotify()` | emergency_contacts |
| `saveSafetyRhythm()` | `saveRhythm()` | safety_rhythms |
| `deleteSafetyRhythm()` | `deleteRhythm()` | safety_rhythms |
| `toggleSafetyRhythm()` | `toggleRhythm()` | safety_rhythms |
| `updateSafetySettings()` | `updateSettings()` | safety_settings |
| `evaluateMissedCheckIns()` | `evaluateMissedCheckIns()` | profiles, safety_settings, alert_incidents, alert_jobs, timeline_events, notifications, notification_deliveries |
| `triggerEmergencyAlert()` | `triggerEmergency()` | timeline_events, notifications, alert_incidents, notification_deliveries |
| `updateSubscription()` | `updateSubscription()` | subscription_status, profiles |
| `registerDeviceToken()` | `registerPushToken()` | device_tokens |
| `unregisterDeviceToken()` | `unregisterPushToken()` | device_tokens |
| `resolveAlertIncident()` | `resolveIncident()` | alert_incidents, alert_jobs |
| `shareEmergencyLocation()` | `shareLocation()` | location_shares |
| `createPaymentOrder()` | `createPaymentOrder()` | payment_orders |
| `markPaymentOrderPaid()` | `markOrderPaid()` | payment_orders, entitlements, subscription_status, profiles |
| `updateProfile()` | `updateProfile()` | profiles |
| `changePassword()` | `changePassword()` | Supabase Auth |
| `deleteAccount()` | `deleteAccount()` | Supabase Auth + profiles |
| `uploadMomentImage()` | `uploadMomentImage()` | Supabase Storage (moments bucket) |
| `uploadAvatarImage()` | `uploadAvatar()` | Supabase Storage (avatars bucket) |
| `startNotificationRealtime()` | `subscribeNotifications()` | Supabase Realtime channel |
| `stopNotificationRealtime()` | `unsubscribeNotifications()` | Supabase Realtime |

---

## 8. Authentication — Chuyển đổi chi tiết

### Mobile (`AuthGateway` trong `EsmeryServices.kt`)

```kotlin
class AuthGateway(private val repository: EsmeryRepository) {
  suspend fun signIn(email, password)     // supabase.auth.signInWith(Email)
  suspend fun signUp(name, email, password) // supabase.auth.signUpWith(Email)
  suspend fun signOut()                    // supabase.auth.signOut()
  suspend fun resetPassword(email)         // supabase.auth.resetPasswordForEmail()
}
```

### Web (`src/hooks/useAuth.ts`)

```typescript
import { supabase } from '@/lib/supabase/client';

export function useAuth() {
  const signIn = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (name: string, email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { display_name: name } },
    });
    if (error) throw error;
    // Upsert profile
    await supabase.from('profiles').upsert({
      id: data.user!.id,
      display_name: name || normalized.split('@')[0],
      email: normalized,
    });
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    if (error) throw error;
  };

  return { signIn, signUp, signOut, resetPassword };
}
```

### Middleware Auth Guard (`src/middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/onboarding/:path*'],
};
```

---

## 9. Routing & Navigation

### Mobile Routes (trong `MainActivity.kt`)

```kotlin
object Routes {
  const val SignIn = "signin"
  const val SignUp = "signup"
  const val Onboarding = "onboarding"
  const val CircleSetup = "circleSetup"
  const val RhythmSetup = "rhythmSetup"
  const val Home = "home"  // chứa 8 tabs
}
```

### Mobile Tabs (trong `HomeScreen.kt`)

```kotlin
enum MainTab {
  Hearth, Circle, Timeline, Moments, Safety, Crisis, Plans, Profile
}
```

### Web Routes (Next.js App Router)

| Mobile Route | Web Route | Ghi chú |
|---|---|---|
| `signin` | `/auth/signin` | WelcomeScreen |
| `signup` | `/auth/signup` | SignUpScreen |
| (forgot) | `/auth/forgot-password` | Tách riêng trên web |
| `onboarding` | `/onboarding` | OnboardingPagerScreen |
| `circleSetup` | `/onboarding/circle-setup` | CircleSetupScreen |
| `rhythmSetup` | `/onboarding/rhythm-setup` | RhythmSetupScreen |
| `home` → Tab Hearth | `/dashboard` | HearthScreen (trang mặc định) |
| `home` → Tab Circle | `/dashboard/circle` | CircleScreen |
| `home` → Tab Timeline | `/dashboard/timeline` | TimelineScreen |
| `home` → Tab Moments | `/dashboard/moments` | MomentsScreen |
| `home` → Tab Safety | `/dashboard/safety` | SafetyScreen |
| `home` → Tab Crisis | `/dashboard/crisis` | CrisisScreen |
| `home` → Tab Plans | `/dashboard/plans` | PlansScreen |
| `home` → Tab Profile | `/dashboard/profile` | ProfileScreen |

### Navigation Flow

```
/ → redirect → /auth/signin

/auth/signin → signIn success → /dashboard
/auth/signin → "New here?" → /auth/signup
/auth/signup → signUp success → /onboarding
/onboarding → done → /onboarding/circle-setup
/onboarding/circle-setup → continue → /onboarding/rhythm-setup
/onboarding/rhythm-setup → continue → /dashboard

/dashboard (layout.tsx chứa sidebar/bottom nav)
  ├── /dashboard          → Hearth (default)
  ├── /dashboard/circle
  ├── /dashboard/timeline
  ├── /dashboard/moments
  ├── /dashboard/safety
  ├── /dashboard/crisis
  ├── /dashboard/plans
  └── /dashboard/profile
```

---

## 10. Theme & Design System

### Mobile Colors (`Color.kt`)

```kotlin
val Apricot = Color(0xFFFFB5A7)  // Primary accent (coral/peach)
val Cream   = Color(0xFFFFF9F2)  // Background
val Cocoa   = Color(0xFF5D4037)  // Primary text (dark brown)
val Sage    = Color(0xFFC1E1C1)  // Success/positive green
val Taupe   = Color(0xFFA1887F)  // Secondary text
val Sky     = Color(0xFFBDE0FE)  // Info blue
val Surface = Color(0xFFFFFFFF)  // Card background
```

### Web CSS Variables (`src/app/globals.css`)

```css
:root {
  /* === ESMERY Color Palette === */
  --color-apricot: #FFB5A7;        /* Primary accent */
  --color-cream: #FFF9F2;          /* Page background */
  --color-cocoa: #5D4037;          /* Primary text */
  --color-sage: #C1E1C1;           /* Success green */
  --color-taupe: #A1887F;          /* Secondary text */
  --color-sky: #BDE0FE;            /* Info blue */
  --color-surface: #FFFFFF;        /* Card background */

  /* === Spacing === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-xxl: 36px;

  /* === Border Radius === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* === Shadow === */
  --shadow-card: 0 1px 3px rgba(93, 64, 55, 0.1);
  --shadow-elevated: 0 4px 12px rgba(93, 64, 55, 0.15);

  /* === Typography === */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  background-color: var(--color-cream);
  color: var(--color-cocoa);
  font-family: var(--font-family);
}
```

### Typography mapping

| Mobile (Material3) | Web CSS |
|---|---|
| `headlineLarge` | `font-size: 2rem; font-weight: 900;` |
| `headlineMedium` | `font-size: 1.75rem; font-weight: 900;` |
| `headlineSmall` | `font-size: 1.5rem; font-weight: 800;` |
| `bodyLarge` | `font-size: 1.125rem; line-height: 1.6;` |
| `bodyMedium` | `font-size: 1rem; line-height: 1.5;` |
| `labelSmall` | `font-size: 0.75rem; font-weight: 500;` |
| `FontWeight.Black` | `font-weight: 900;` |
| `FontWeight.ExtraBold` | `font-weight: 800;` |
| `FontWeight.Bold` | `font-weight: 700;` |

---

## 11. I18n (Đa ngôn ngữ)

### Mobile (`AppLanguage.kt`)

Dùng 3 hàm chính:
- `t(en, vi)` — Composable function, đọc `LocalAppLanguage`
- `tr(language, en, vi)` — Non-composable, nhận language param
- `appString(resId)` — Map string resource ID → Vietnamese string

### Web (`src/lib/i18n/translations.ts`)

```typescript
export type Language = 'en' | 'vi';

export const translations = {
  // === Auth ===
  sign_in: { en: 'Sign In', vi: 'Đăng nhập' },
  sign_up: { en: 'Sign Up', vi: 'Tạo tài khoản' },
  email: { en: 'Email', vi: 'Email' },
  password: { en: 'Password', vi: 'Mật khẩu' },
  full_name: { en: 'Full name', vi: 'Họ tên' },
  forgot_password: { en: 'Forgot password?', vi: 'Quên mật khẩu?' },
  welcome_title: { en: 'A Gentle Hand on Your Shoulder', vi: 'Một bàn tay dịu dàng luôn ở bên' },
  welcome_subtitle: { en: 'Safety check-in for independent living.', vi: 'Xác nhận an toàn cho người sống độc lập.' },

  // === Navigation ===
  hearth: { en: 'Hearth', vi: 'Mái ấm' },
  circle: { en: 'Circle', vi: 'Vòng thân' },
  timeline: { en: 'Timeline', vi: 'Dòng thời gian' },
  moments: { en: 'Moments', vi: 'Khoảnh khắc' },
  safety: { en: 'Safety', vi: 'An toàn' },
  crisis: { en: 'Crisis', vi: 'Khẩn cấp' },
  plans: { en: 'Plans', vi: 'Gói dịch vụ' },
  profile: { en: 'Profile', vi: 'Hồ sơ' },

  // === Actions ===
  im_safe: { en: "I'm Safe", vi: 'Tôi an toàn' },
  circle_notified: { en: 'Your circle has been notified.', vi: 'Vòng thân của bạn đã được thông báo.' },
  add_friend: { en: 'Add Friend', vi: 'Thêm bạn' },
  share_moment: { en: 'Share Moment', vi: 'Chia sẻ khoảnh khắc' },
  emergency_contacts: { en: 'Emergency Contacts', vi: 'Liên hệ khẩn cấp' },
  safety_rhythm: { en: 'Safety Rhythm', vi: 'Nhịp an toàn' },
  logout: { en: 'Sign Out', vi: 'Đăng xuất' },
  get_started: { en: 'Get Started', vi: 'Bắt đầu' },

  // === Onboarding ===
  onboarding_one: { en: 'A Gentle Hand on Your Shoulder', vi: 'Một bàn tay dịu dàng luôn ở bên' },
  onboarding_two: { en: 'Simple Check-ins', vi: 'Xác nhận an toàn thật đơn giản' },
  onboarding_three: { en: 'Feel the Warmth', vi: 'Cảm nhận sự ấm áp' },

  // === Status ===
  pending: { en: 'pending', vi: 'đang chờ' },
  accepted: { en: 'accepted', vi: 'đã chấp nhận' },
  declined: { en: 'declined', vi: 'đã từ chối' },

  // ... (tất cả strings khác từ AppLanguage.kt và các Screen)
} as const;

export type TranslationKey = keyof typeof translations;

// Hook
export function t(lang: Language, key: TranslationKey): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

// Inline translation (giống t(en, vi) trên mobile)
export function tInline(lang: Language, en: string, vi: string): string {
  return lang === 'en' ? en : vi;
}
```

### Web Hook (`src/lib/i18n/useLanguage.ts`)

```typescript
'use client';
import { createContext, useContext, useState } from 'react';
import { Language } from './translations';

const LanguageContext = createContext<{
  lang: Language;
  toggle: () => void;
}>({ lang: 'en', toggle: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  const toggle = () => setLang(prev => prev === 'en' ? 'vi' : 'en');
  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
```

---

## 12. Reusable Components — Chuyển đổi

### Bảng ánh xạ Component

| Mobile Composable | Web Component | Props |
|---|---|---|
| `ScreenList(title, subtitle)` | `<ScreenLayout>` | `title`, `subtitle`, `children` |
| `InfoCard(icon, title, body)` | `<InfoCard>` | `icon`, `title`, `body` |
| `CardBlock(border?)` | `<CardBlock>` | `border?`, `children` |
| `EsmeryTextField(value, onChange, label, keyboard, password)` | `<EsmeryTextField>` | `value`, `onChange`, `label`, `type?`, `password?` |
| `PrimaryButton(text, icon?, loading?)` | `<PrimaryButton>` | `text`, `icon?`, `loading?`, `onClick` |
| `InlineMessage(text)` | `<InlineMessage>` | `text` |
| `AvatarInitial(name)` | `<AvatarInitial>` | `name` |
| `LanguageButton(language, onClick)` | `<LanguageButton>` | (sử dụng `useLanguage` hook) |

### Ví dụ: `InfoCard` → Web

**Mobile:**
```kotlin
@Composable
fun InfoCard(icon: ImageVector, title: String, body: String) {
  CardBlock {
    Row(verticalAlignment = CenterVertically, horizontalArrangement = spacedBy(14.dp)) {
      Icon(icon, tint = Apricot, modifier = Modifier.size(30.dp))
      Column {
        Text(title, color = Cocoa, fontWeight = FontWeight.Black)
        Text(body, color = Taupe, style = bodyMedium)
      }
    }
  }
}
```

**Web:**
```tsx
// src/components/ui/InfoCard.tsx
import styles from './InfoCard.module.css';

interface InfoCardProps {
  icon: React.ReactNode; // Lucide icon hoặc SVG
  title: string;
  body: string;
}

export function InfoCard({ icon, title, body }: InfoCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>{icon}</div>
      <div className={styles.content}>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.body}>{body}</p>
      </div>
    </div>
  );
}
```

```css
/* InfoCard.module.css */
.card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
}
.iconWrapper {
  color: var(--color-apricot);
  font-size: 30px;
  flex-shrink: 0;
}
.title {
  color: var(--color-cocoa);
  font-weight: 900;
  margin: 0;
}
.body {
  color: var(--color-taupe);
  font-size: 1rem;
  margin: 0;
}
```

### Ví dụ: `PrimaryButton` → Web

**Web:**
```tsx
// src/components/ui/PrimaryButton.tsx
import styles from './PrimaryButton.module.css';

interface PrimaryButtonProps {
  text: string;
  icon?: React.ReactNode;
  loading?: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}

export function PrimaryButton({ text, icon, loading, onClick, fullWidth = true }: PrimaryButtonProps) {
  return (
    <button
      className={`${styles.button} ${fullWidth ? styles.fullWidth : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
```

```css
/* PrimaryButton.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 54px;
  padding: 0 24px;
  background-color: var(--color-apricot);
  color: white;
  font-weight: 900;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.button:hover { opacity: 0.9; transform: translateY(-1px); }
.button:active { transform: translateY(0); }
.button:disabled { opacity: 0.6; cursor: not-allowed; }
.fullWidth { width: 100%; }
.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## 13. Screens — Chuyển đổi từng màn hình

### 13.1 WelcomeScreen → `/auth/signin/page.tsx`

**Cấu trúc Mobile:**
- `AuthScaffold` (background Cream, padding, column)
- `LanguageButton` (góc phải)
- `BrandHeader` (icon Favorite + "ESMERY" + title + subtitle)
- `EsmeryTextField` email
- `EsmeryTextField` password
- `TextButton` forgot password
- `InlineMessage` (nếu có error/message)
- `PrimaryButton` Sign In
- `TextButton` "New here? Create an account"

**Logic:**
1. Email + password validation
2. Gọi `authGateway.signIn(email, password)`
3. Success → navigate Home
4. Failure → hiển thị error message
5. Forgot password → gọi `authGateway.resetPassword(email)`

**Web equivalent:**
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
// + import components

export default function SignInPage() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const { lang, toggle } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage(tInline(lang, 'Enter email and password.', 'Nhập email và mật khẩu.'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setMessage(err.message || tInline(lang, 'Sign in failed.', 'Đăng nhập thất bại.'));
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage(tInline(lang, 'Enter your email first.', 'Nhập email trước.'));
      return;
    }
    try {
      await resetPassword(email);
      setMessage(tInline(lang, 'Password reset email sent.', 'Đã gửi email đặt lại mật khẩu.'));
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <div className="auth-scaffold">
      <LanguageButton />
      <BrandHeader
        title={tInline(lang, 'A Gentle Hand on Your Shoulder', 'Một bàn tay dịu dàng luôn ở bên')}
        subtitle={tInline(lang, 'Safety check-in for independent living.', 'Xác nhận an toàn cho người sống độc lập.')}
      />
      <EsmeryTextField value={email} onChange={setEmail} label="Email" type="email" />
      <EsmeryTextField value={password} onChange={setPassword} label={tInline(lang, 'Password', 'Mật khẩu')} password />
      <button className="text-button align-end" onClick={handleForgotPassword}>
        {tInline(lang, 'Forgot password?', 'Quên mật khẩu?')}
      </button>
      {message && <InlineMessage text={message} />}
      <PrimaryButton text={tInline(lang, 'Sign In', 'Đăng nhập')} loading={loading} onClick={handleSignIn} />
      <button className="text-button full-width" onClick={() => router.push('/auth/signup')}>
        {tInline(lang, 'New here? Create an account', 'Bạn mới ở đây? Tạo tài khoản')}
      </button>
    </div>
  );
}
```

---

### 13.2 SignUpScreen → `/auth/signup/page.tsx`

**Giống WelcomeScreen** nhưng thêm field `name` và gọi `signUp(name, email, password)`. Success → navigate `/onboarding`.

---

### 13.3 OnboardingPagerScreen → `/onboarding/page.tsx`

**Cấu trúc Mobile:**
- 3 pages: title + body
- Page indicator dots
- "Next" / "Get Started" button

**Web:** Dùng state `page` (0, 1, 2) + transition CSS animation giữa các page.

---

### 13.4 CircleSetupScreen → `/onboarding/circle-setup/page.tsx`

**Mobile:**
- Icon Group
- Title "Create My Circle"
- 3 EsmeryTextField: contact, name, relationship
- PrimaryButton "Add contact"
- TextButton "Skip for now"

---

### 13.5 RhythmSetupScreen → `/onboarding/rhythm-setup/page.tsx`

**Mobile:**
- Icon Schedule
- Title "Safety Rhythm"
- 2 EsmeryTextField: label, time
- PrimaryButton "Save rhythm"
- TextButton "Skip for now"

---

### 13.6 HomeScreen → `/dashboard/layout.tsx`

**Mobile:** `Scaffold` với `bottomBar` chứa 8 `TabButton`, content hiển thị screen tương ứng.

**Web:**
- **Desktop**: `layout.tsx` chứa Sidebar (bên trái) + Content area (bên phải).
- **Mobile web**: Bottom navigation bar.
- Dùng responsive CSS (`@media`).

**8 Tabs:**

| Tab | Icon (Lucide equivalent) | Route |
|---|---|---|
| Hearth | `Home` | `/dashboard` |
| Circle | `Users` | `/dashboard/circle` |
| Timeline | `Clock` | `/dashboard/timeline` |
| Moments | `Flower2` | `/dashboard/moments` |
| Safety | `Shield` | `/dashboard/safety` |
| Crisis | `AlertTriangle` | `/dashboard/crisis` |
| Plans | `CreditCard` | `/dashboard/plans` |
| Profile | `User` | `/dashboard/profile` |

---

### 13.7 HearthScreen → `/dashboard/page.tsx`

**Cấu trúc Mobile (5 sections):**

1. **Header row**: LanguageButton + Logout OutlinedButton
2. **"I'm Safe" button**: Nút tròn lớn (190dp, CircleShape, Apricot background)
3. **InfoCard "Safety signal ready"**
4. **InfoCard "Safety status"**: Safe / Needs attention (dựa trên unread missed/emergency)
5. **InfoCard "Circle health"**: Số accepted members
6. **InfoCard "Delivery & automation"**: Pending/failed deliveries, active alert
7. **"Recent notifications"**: List 3 notifications gần nhất, mỗi notification có icon theo type + "Mark read" button

**Logic khi nhấn "I'm Safe":**
1. `hearthViewModel.onEvent(HearthUiEvent.CheckIn)` → gọi `repository.checkIn()`
2. Toast "Your circle has been notified."

**Logic realtime:**
- `repository.startNotificationRealtime { refresh() + showNotification() }`
- `repository.evaluateMissedCheckIns()`

---

### 13.8 CircleScreen → `/dashboard/circle/page.tsx`

**Cấu trúc Mobile:**

1. **Header**: Title + subtitle
2. **Action row**: PrimaryButton "Add Friend" + OutlinedButton "Scan QR"
3. **Refresh button**: OutlinedButton "Refresh Circle"
4. **Empty state**: InfoCard "No trusted people yet" (nếu không có members)
5. **Pending requests list**: FriendRequestCard cho mỗi pending request
   - Incoming: Accept ✓ / Decline ✕ buttons
   - Outgoing: Chỉ hiển thị status
6. **Accepted members list**: CircleMemberCard cho mỗi accepted member
   - Avatar initial + Name + Relationship + Status + Last safe time
   - "Nudge" OutlinedButton

**AddFriendDialog (AlertDialog):**
- 3 FilterChip modes: Contact / ID / QR
- EsmeryTextField: contact, name, relationship
- Send / Cancel buttons

**QR Scanner**: Trên web dùng `html5-qrcode` library thay camera native.

---

### 13.9 TimelineScreen → `/dashboard/timeline/page.tsx`

**Cấu trúc Mobile:**
- ScreenList với title "Timeline"
- List `TimelineEvent` → mỗi event là `InfoCard` với icon theo type

**Icon mapping cho web (Lucide icons):**

| Mobile Icon | Lucide Icon | Event Type |
|---|---|---|
| `Icons.Rounded.CheckCircle` | `CheckCircle` | check_in |
| `Icons.Rounded.LocalFlorist` | `Flower2` | moment |
| `Icons.Rounded.NotificationsActive` | `Bell` | nudge |
| `Icons.Rounded.Group` | `Users` | friend_request |
| `Icons.Rounded.Schedule` | `Clock` | safety_rhythm |
| `Icons.Rounded.Warning` | `AlertTriangle` | missed_check_in, emergency |

---

### 13.10 MomentsScreen → `/dashboard/moments/page.tsx`

**Cấu trúc Mobile:**

1. **PrimaryButton "Share Moment"**: Check premium → show dialog hoặc premium dialog
2. **Moments list**: MomentCard cho mỗi moment
   - `AsyncImage` (ảnh) → `<img>` hoặc `next/image`
   - Caption + "Shared to circle - time"

**MomentDialog:**
- EsmeryTextField caption
- FilterChip row cho PRESET_IMAGES
- Button "Pick from gallery" → `<input type="file" accept="image/*">`
- Share / Cancel

**Web thay đổi:**
- Thay `rememberLauncherForActivityResult(GetContent)` → `<input type="file">`
- Thay `Coil AsyncImage` → `<img src={url}>` hoặc `next/image`

---

### 13.11 SafetyScreen → `/dashboard/safety/page.tsx`

**Cấu trúc Mobile:**

1. **Add/Edit rhythm form** (trong CardBlock):
   - EsmeryTextField label
   - EsmeryTextField time
   - PrimaryButton "Save rhythm"

2. **Safety settings card** (SafetySettingsCard):
   - "Missed check-in detection" title
   - Inactivity window: 3 FilterChip (2h, 4h, 12h)
   - Escalation delay: 3 FilterChip (15m, 30m, 60m)
   - Location sharing: Switch toggle
   - PrimaryButton "Save settings"

3. **Rhythm list**: Mỗi rhythm có:
   - Icon Schedule + Label + Time + Status (enabled/paused)
   - Switch toggle enable/disable
   - Edit IconButton (load vào form)
   - Delete IconButton

4. **InfoCard "Escalation delay"**: Giải thích auto-notify

---

### 13.12 CrisisScreen → `/dashboard/crisis/page.tsx`

**Cấu trúc Mobile:**

1. **PrimaryButton "Alert emergency contacts"**: Trigger emergency alert
2. **OutlinedButton "Share location"**: Geolocation API → share
3. **Latest location share** (nếu có): Lat, Lng + "Open in Maps"
4. **Active alert** (nếu có): Reason + escalation due + open deliveries + "Resolve alert"
5. **PrimaryButton "Add emergency contact"**
6. **InfoCard "My Safe Steps"**: Hướng dẫn bước an toàn
7. **InfoCard "Vietnam emergency numbers"**: 113, 114, 115
8. **Emergency contacts list**: Mỗi contact có:
   - Name, contact info, verified/auto-notify status
   - Call button (trên web: `tel:` link)
   - Delete button
   - Verified Switch
   - Auto-notify Switch

**Web thay đổi:**
- Thay Android `ACTION_DIAL` intent → `<a href="tel:...">`
- Thay `FusedLocationProvider` → `navigator.geolocation.getCurrentPosition()`
- Thay Android location permission → Browser Geolocation API (tự hỏi permission)
- "Open in Maps" → `window.open('https://maps.google.com/...')`

---

### 13.13 PlansScreen → `/dashboard/plans/page.tsx`

**Cấu trúc Mobile:**

1. **3 PlanCard**:
   - Basic Care (Free)
   - Advanced Monthly (49,000 VND/month)
   - Advanced Yearly (499,000 VND/year)
   - Mỗi card có icon CheckCircle/CreditCard + title + body + "Choose"/"Active" button

2. **Production entitlement card**:
   - Current plan, premium status, entitlement source
   - Latest payment order info
   - SePay monthly / SePay yearly buttons
   - QR image (nếu có `qrUrl`)
   - Pending payment reference

**Web thay đổi:**
- Bỏ Google Play Billing → thêm Stripe hoặc chỉ dùng SePay
- `BillingManager` không cần trên web
- QR image: `<img src={qrUrl}>` (giống mobile)

---

### 13.14 ProfileScreen → `/dashboard/profile/page.tsx`

**Cấu trúc Mobile:**

1. **Avatar + Email card**:
   - Avatar circle (72dp) với AsyncImage hoặc Person icon
   - "Upload avatar" OutlinedButton → picker
   - Email text

2. **Display name card**:
   - EsmeryTextField "Display name"
   - PrimaryButton "Save profile"

3. **Password card**:
   - EsmeryTextField "New password"
   - PrimaryButton "Change password"

4. **Delete account button**: Apricot background + AlertDialog confirm

**Web thay đổi:**
- Thay `rememberLauncherForActivityResult(GetContent)` → `<input type="file">`
- Thay `AlertDialog` → custom modal hoặc `<dialog>`

---

## 14. State Management

### Mobile: ViewModel + StateFlow

```kotlin
class HearthViewModel(private val repository: EsmeryRepository) : ViewModel() {
  val esmeryState: StateFlow<EsmeryState> = repository.state
  fun onEvent(event: HearthUiEvent) { /* launch coroutine */ }
}
```

### Web: React Context + Custom Hooks

**Option A: Context + useReducer** (nhẹ, phù hợp app này)

```typescript
// src/contexts/EsmeryContext.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { EsmeryState } from '@/lib/repository/types';
import { loadUserState, refreshState } from '@/lib/repository/repository';
import { supabase } from '@/lib/supabase/client';

const EsmeryContext = createContext<{
  state: EsmeryState | null;
  refresh: () => Promise<void>;
  loading: boolean;
}>({ state: null, refresh: async () => {}, loading: true });

export function EsmeryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EsmeryState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const s = await loadUserState(user.id);
        setState(s);
      }
      setLoading(false);
    };
    init();
  }, []);

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const s = await refreshState(user.id);
      setState(s);
    }
  };

  return (
    <EsmeryContext.Provider value={{ state, refresh, loading }}>
      {children}
    </EsmeryContext.Provider>
  );
}

export const useEsmeryState = () => useContext(EsmeryContext);
```

**Option B: Zustand** (nếu cần performance tốt hơn với selective updates)

---

## 15. Realtime & Notifications

### Mobile

- **Supabase Realtime**: Subscribe channel `notifications` cho user → `onNewNotification` callback
- **FCM**: Background push notification
- **WorkManager**: Periodic safety check mỗi 2 giờ
- **Android NotificationChannel**: `esmery_safety`

### Web

#### Supabase Realtime (giống mobile)

```typescript
// src/hooks/useRealtime.ts
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';

export function useNotificationRealtime(userId: string, onNew: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => onNew()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNew]);
}
```

#### Web Push (thay FCM)

```typescript
// Service Worker registration cho Web Push
// Cần VAPID keys từ server
// Thay DeviceTokenBootstrap + EsmeryMessagingService

// 1. Đăng ký service worker
if ('serviceWorker' in navigator && 'PushManager' in window) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  // Lưu subscription vào device_tokens với provider='web_push', platform='web'
  await supabase.from('device_tokens').upsert({
    user_id: userId,
    token: JSON.stringify(subscription),
    provider: 'web_push',
    platform: 'web',
    is_active: true,
    // ...
  });
}
```

#### Background Safety Check (thay WorkManager)

WorkManager **KHÔNG CÓ** trên web. Thay thế bằng:
- **Supabase Scheduled Function (pg_cron)**: Chạy `safety-automation` function định kỳ từ server (đã có skeleton).
- **Visibility API**: Khi user quay lại tab → trigger `evaluateMissedCheckIns()`.

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      evaluateMissedCheckIns(userId);
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [userId]);
```

---

## 16. Android-only Features — Xử lý trên Web

| Android Feature | Web Replacement | Chi tiết |
|---|---|---|
| **WorkManager** | Supabase pg_cron + Edge Function | Server-side scheduled safety check |
| **FCM push** | Web Push API + Service Worker | VAPID keys, `PushManager` |
| **Android notification channel** | Browser Notification API | `Notification.requestPermission()` + `new Notification(...)` |
| **GPS (FusedLocationProvider)** | `navigator.geolocation` | `getCurrentPosition()` / `watchPosition()` |
| **Camera (CameraX barcode)** | `html5-qrcode` hoặc `@zxing/browser` | QR scanner bằng webcam |
| **Photo picker (GetContent)** | `<input type="file" accept="image/*">` | File input HTML5 |
| **Android dial intent** | `<a href="tel:...">` hoặc `window.open('tel:...')` | Direct tel link |
| **Google Play Billing** | Stripe / SePay web checkout | Server-side payment verification |
| **Coil AsyncImage** | `<img>` / `next/image` | Native image element |
| **Compose Navigation** | Next.js App Router | File-based routing |
| **ViewModel + StateFlow** | React Context / Zustand + hooks | Client state management |
| **LaunchedEffect** | `useEffect` | React side effect |
| **rememberSaveable** | `useState` + `localStorage` | Persistent state |
| **rememberCoroutineScope** | Direct `async/await` in handlers | No coroutine scope needed |
| **Modifier.background(Cream)** | CSS `background-color: var(--color-cream)` | CSS styling |
| **MaterialTheme.typography.xxx** | CSS font styles | Font size, weight via CSS |
| **String resources (R.string.xxx)** | Translation keys | `t(lang, 'key')` |
| **CompositionLocalProvider** | React Context.Provider | Provider pattern |

---

## 17. Database Schema — Dùng chung

> **Web và Mobile dùng chung 100% schema Supabase.** Không cần thay đổi gì.

### SQL files cần apply (theo thứ tự):

1. `supabase/esmery_v1_schema.sql` — Schema gốc (profiles, circle_members, friend_requests, check_ins, timeline_events, notifications, moments, emergency_contacts, safety_rhythms, safety_settings, subscription_status + RLS policies)
2. `supabase/migrations/20260601_production_v1_contract.sql` — Production tables (device_tokens, notification_deliveries, alert_incidents, alert_jobs, location_shares, payment_orders, entitlements, audit_logs)
3. `supabase/migrations/20260601_moment_circle_visibility.sql` — Moment circle visibility policy

### Bảng database (22 tables):

| Table | Mô tả | RLS |
|---|---|---|
| `profiles` | Thông tin user | own + authenticated lookup |
| `circle_members` | Thành viên vòng thân | owner + member read/update |
| `friend_requests` | Lời mời kết bạn | sender + receiver read/update |
| `check_ins` | Lịch sử check-in | own |
| `timeline_events` | Dòng thời gian | own + circle insert |
| `notifications` | Thông báo | own + circle insert |
| `moments` | Khoảnh khắc chia sẻ | own + circle read |
| `emergency_contacts` | Liên hệ khẩn cấp | own |
| `safety_rhythms` | Lịch check-in | own |
| `safety_settings` | Cài đặt an toàn | own |
| `subscription_status` | Trạng thái gói dịch vụ | own |
| `device_tokens` | Token push notification | own |
| `notification_deliveries` | Trạng thái gửi thông báo | own + circle insert |
| `alert_incidents` | Sự cố cảnh báo | own |
| `alert_jobs` | Job cảnh báo scheduled | own |
| `location_shares` | Chia sẻ vị trí khẩn cấp | own |
| `payment_orders` | Đơn thanh toán | own |
| `entitlements` | Quyền lợi subscription | own |
| `audit_logs` | Nhật ký kiểm tra | own |

---

## 18. Edge Functions — Dùng chung

### `supabase/functions/safety-automation/index.ts`

- Đọc `safety_settings` + `profiles.last_safe_at`
- Kiểm tra missed check-in
- Tạo `alert_incidents`, `notifications`, `alert_jobs`
- Gửi push qua FCM (hoặc Web Push)
- **Web có thể trigger function này** qua `supabase.functions.invoke('safety-automation')`

### `supabase/functions/sepay-webhook/index.ts`

- Nhận webhook từ SePay
- Verify secret header
- Tìm `payment_orders.reference_code`
- Cập nhật order → paid
- Upsert `entitlements` + `subscription_status` + `profiles.is_premium`
- Ghi `audit_logs`
- **Hoạt động độc lập với platform** (web hoặc mobile đều dùng chung)

---

## 19. Payment — Thay đổi cho Web

### Mobile

| Provider | Status |
|---|---|
| Google Play Billing | Default cho Play Store (chưa tích hợp client thật) |
| SePay | Scaffold QR + webhook |

### Web

| Provider | Đề xuất |
|---|---|
| ~~Google Play Billing~~ | **Không dùng** (chỉ cho Android) |
| **SePay** | Giữ nguyên — QR + webhook (đã có skeleton) |
| **Stripe** (optional) | Thêm Stripe Checkout cho web payment |

**Stripe integration (nếu thêm):**
```typescript
// Tạo Stripe Checkout Session từ Edge Function
const { data } = await supabase.functions.invoke('create-checkout', {
  body: { plan: 'monthly', return_url: window.location.origin + '/dashboard/plans' },
});
window.location.href = data.checkout_url;
```

---

## 20. Testing Strategy

### Mobile (hiện tại)

- `./gradlew testDebugUnitTest` — JUnit unit tests
- Compose UI smoke tests cho 6 screens

### Web (đề xuất)

| Loại | Tool | Scope |
|---|---|---|
| Unit test | Vitest | Repository functions, utils, i18n |
| Component test | React Testing Library + Vitest | UI components |
| Integration test | Playwright | Auth flow, check-in flow, circle management |
| E2E test | Playwright | Full user journey |

**Ví dụ unit test:**
```typescript
// __tests__/i18n.test.ts
import { tInline } from '@/lib/i18n/translations';

test('tInline returns English', () => {
  expect(tInline('en', 'Hello', 'Xin chào')).toBe('Hello');
});

test('tInline returns Vietnamese', () => {
  expect(tInline('vi', 'Hello', 'Xin chào')).toBe('Xin chào');
});
```

---

## 21. Deployment Checklist

### Trước khi deploy Web

- [ ] Tạo project Next.js với TypeScript
- [ ] Cài `@supabase/supabase-js`, `@supabase/ssr`
- [ ] Cài Lucide React icons
- [ ] Cài Google Fonts (Inter)
- [ ] Cấu hình `.env.local` với Supabase credentials (cùng project với mobile)
- [ ] Implement tất cả TypeScript types (Section 5)
- [ ] Implement Supabase client (Section 6)
- [ ] Implement auth hook + middleware (Section 8)
- [ ] Implement repository functions (Section 7)
- [ ] Implement i18n (Section 11)
- [ ] Implement reusable components (Section 12)
- [ ] Implement tất cả pages (Section 13)
- [ ] Implement realtime (Section 15)
- [ ] Test auth flow end-to-end
- [ ] Test check-in flow
- [ ] Test circle management
- [ ] Test moment sharing
- [ ] Test emergency alert
- [ ] Test payment flow
- [ ] Deploy lên Vercel / Netlify

### Supabase (cùng project)

- [ ] Đảm bảo tất cả SQL migrations đã chạy
- [ ] Kiểm tra RLS policies hoạt động đúng cho web client
- [ ] Deploy Edge Functions nếu chưa
- [ ] Set secrets cho Edge Functions
- [ ] Cấu hình Web Push VAPID keys (nếu dùng)

---

## Phụ lục: Mapping file-by-file

| File Mobile (Kotlin) | File Web (TypeScript) |
|---|---|
| `MainActivity.kt` | `src/app/layout.tsx` + `src/middleware.ts` |
| `EsmeryServices.kt` | `src/contexts/EsmeryContext.tsx` + `src/hooks/useAuth.ts` |
| `SupabaseClient.kt` | `src/lib/supabase/client.ts` + `server.ts` |
| `AuthGateway` (trong EsmeryServices) | `src/hooks/useAuth.ts` |
| `data/EsmeryModels.kt` | `src/lib/repository/types.ts` |
| `data/EsmeryRepository.kt` | `src/lib/repository/repository.ts` (interface → exported functions) |
| `data/InMemoryEsmeryRepository.kt` | `src/lib/repository/seed.ts` |
| `data/SupabaseEsmeryRepository.kt` | `src/lib/repository/repository.ts` (implementations) |
| `data/BillingManager.kt` | *(bỏ — không dùng Google Play trên web)* |
| `data/EsmeryRealtime.kt` | `src/hooks/useRealtime.ts` |
| `data/EsmeryStorage.kt` | Inline trong repository functions (supabase.storage) |
| `core/i18n/AppLanguage.kt` | `src/lib/i18n/translations.ts` + `useLanguage.ts` |
| `core/ui/EsmeryComponents.kt` | `src/components/ui/*.tsx` (6+ component files) |
| `core/viewmodel/EsmeryViewModelFactory.kt` | *(bỏ — React dùng hooks thay ViewModel)* |
| `ui/theme/Color.kt` | `src/app/globals.css` (:root CSS variables) |
| `ui/theme/Theme.kt` | `src/app/globals.css` |
| `ui/theme/Type.kt` | `src/app/globals.css` |
| `feature/auth/AuthScreens.kt` | `src/app/auth/signin/page.tsx` + `signup/page.tsx` |
| `feature/onboarding/OnboardingScreens.kt` | `src/app/onboarding/page.tsx` + `circle-setup/page.tsx` + `rhythm-setup/page.tsx` |
| `feature/home/HomeScreen.kt` | `src/app/dashboard/layout.tsx` |
| `feature/hearth/HearthScreen.kt` | `src/app/dashboard/page.tsx` |
| `feature/hearth/HearthViewModel.kt` | `src/hooks/useCheckin.ts` |
| `feature/circle/CircleScreen.kt` | `src/app/dashboard/circle/page.tsx` |
| `feature/circle/CircleViewModel.kt` | `src/hooks/useCircle.ts` |
| `feature/circle/QrScannerScreen.kt` | `src/components/QrScanner.tsx` (dùng html5-qrcode) |
| `feature/timeline/TimelineScreen.kt` | `src/app/dashboard/timeline/page.tsx` |
| `feature/timeline/TimelineViewModel.kt` | *(inline — chỉ đọc state, không cần hook riêng)* |
| `feature/moments/MomentsScreen.kt` | `src/app/dashboard/moments/page.tsx` |
| `feature/moments/MomentsViewModel.kt` | `src/hooks/useMoments.ts` |
| `feature/safety/SafetyScreen.kt` | `src/app/dashboard/safety/page.tsx` |
| `feature/safety/SafetyViewModel.kt` | `src/hooks/useSafety.ts` |
| `feature/crisis/CrisisScreen.kt` | `src/app/dashboard/crisis/page.tsx` |
| `feature/crisis/CrisisViewModel.kt` | `src/hooks/useCrisis.ts` |
| `feature/plans/PlansScreen.kt` | `src/app/dashboard/plans/page.tsx` |
| `feature/plans/PlansViewModel.kt` | `src/hooks/usePlans.ts` |
| `feature/profile/ProfileScreen.kt` | `src/app/dashboard/profile/page.tsx` |
| `feature/profile/ProfileViewModel.kt` | `src/hooks/useProfile.ts` |
| `automation/DeviceTokenBootstrap.kt` | `src/lib/webPush.ts` (Web Push registration) |
| `automation/EsmeryMessagingService.kt` | `public/sw.js` (Service Worker) |
| `automation/EsmeryNotificationChannels.kt` | Browser `Notification` API |
| `automation/SafetyAutomationScheduler.kt` | Supabase pg_cron (server-side) |
| `automation/SafetyCheckWorker.kt` | Edge Function `safety-automation` (server-side) |
| `AndroidManifest.xml` | *(không cần — web không có manifest)* |
| `supabase/esmery_v1_schema.sql` | **Dùng chung** |
| `supabase/migrations/*.sql` | **Dùng chung** |
| `supabase/functions/*` | **Dùng chung** |
| `.env` | `.env.local` (cùng credentials) |

---

## Ghi chú cuối cùng

### Ưu tiên chuyển đổi (đề xuất theo phase)

**Phase 1 — Core (MVP Web):**
1. Auth (signin, signup, forgot password)
2. Dashboard layout (sidebar + bottom nav)
3. Hearth (I'm Safe check-in)
4. Circle (danh sách, add friend, accept/decline)
5. Timeline
6. Profile (basic)

**Phase 2 — Features:**
7. Moments (share + gallery picker)
8. Safety Rhythm (CRUD + settings)
9. Crisis (emergency contacts, alert)
10. Plans (subscription selection)
11. Onboarding flow

**Phase 3 — Production:**
12. Web Push notifications
13. Realtime updates
14. Payment integration (SePay/Stripe)
15. QR scanner (webcam)
16. Geolocation sharing
17. Testing suite
18. Deploy

### Các nguyên tắc quan trọng:

1. **Dùng chung Supabase project** — Web và Mobile truy cập cùng database, cùng RLS policies, cùng Edge Functions.
2. **Schema không đổi** — Tất cả SQL đã có sẵn, web client chỉ cần gọi Postgrest API.
3. **Token snake_case** — TypeScript interfaces dùng trực tiếp snake_case, không cần serialize/deserialize mapping.
4. **Business logic giữ nguyên** — Tất cả logic check-in, missed detection, delivery, entitlement giữ 1:1 từ mobile.
5. **UI adapt cho web** — Bottom nav trên mobile web, sidebar trên desktop. Responsive design.
6. **I18n giữ nguyên** — Cùng translations EN/VI, chỉ khác cách inject (React Context thay CompositionLocal).
