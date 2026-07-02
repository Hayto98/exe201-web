'use client';

import * as memory from './memoryRepository';
import {
  deleteEmergencyContactSupabase,
  saveEmergencyContactSupabase,
  toggleEmergencyContactAutoNotifySupabase,
  toggleEmergencyContactVerifiedSupabase,
} from './supabaseRepository';
import { isSupabaseConfigured } from '@/lib/supabase/client';

async function postCrisisContact(body: Record<string, unknown>) {
  const res = await fetch('/api/crisis/contacts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? 'Không thể cập nhật liên hệ khẩn cấp.');
  }
}

export async function saveEmergencyContact(
  userId: string,
  contact: { name: string; contact: string; is_verified?: boolean; auto_notify?: boolean }
) {
  const name = contact.name.trim();
  const phone = contact.contact.trim();
  if (!name || !phone) {
    throw new Error('NAME_CONTACT_REQUIRED');
  }

  if (isSupabaseConfigured()) {
    await postCrisisContact({ action: 'save', name, contact: phone, is_verified: contact.is_verified ?? false, auto_notify: contact.auto_notify ?? true });
    return;
  }

  memory.saveEmergencyContact(userId, {
    name,
    contact: phone,
    is_verified: contact.is_verified ?? false,
    auto_notify: contact.auto_notify ?? true,
  });
}

export async function deleteEmergencyContact(userId: string, contactId: string) {
  if (isSupabaseConfigured()) {
    await postCrisisContact({ action: 'delete', contactId });
    return;
  }
  memory.deleteEmergencyContact(userId, contactId);
}

export async function toggleEmergencyVerified(userId: string, contactId: string, currentValue: boolean) {
  if (isSupabaseConfigured()) {
    await postCrisisContact({ action: 'toggle_verified', contactId, value: !currentValue });
    return;
  }
  memory.toggleEmergencyVerified(userId, contactId);
}

export async function toggleEmergencyAutoNotify(userId: string, contactId: string, currentValue: boolean) {
  if (isSupabaseConfigured()) {
    await postCrisisContact({ action: 'toggle_auto_notify', contactId, value: !currentValue });
    return;
  }
  memory.toggleEmergencyAutoNotify(userId, contactId);
}

export async function triggerEmergencyAlert(userId: string, state: import('./types').EsmeryState) {
  if (isSupabaseConfigured()) {
    const { triggerEmergencyAlertSupabase } = await import('./supabaseRepository');
    await triggerEmergencyAlertSupabase(userId, state);
    return;
  }
  memory.triggerEmergency(userId);
}

export async function resolveAlertIncident(userId: string, incidentId: string) {
  if (isSupabaseConfigured()) {
    const { resolveAlertIncidentSupabase } = await import('./supabaseRepository');
    await resolveAlertIncidentSupabase(userId, incidentId);
    return;
  }
  memory.resolveIncident(userId, incidentId);
}

export async function shareEmergencyLocation(userId: string, latitude: number, longitude: number) {
  if (isSupabaseConfigured()) {
    const { shareEmergencyLocationSupabase } = await import('./supabaseRepository');
    await shareEmergencyLocationSupabase(userId, latitude, longitude);
    return;
  }
  memory.shareLocation(userId, latitude, longitude);
}
