'use client';

import * as memory from './memoryRepository';
import {
  createPaymentOrderSupabase,
  updateSubscriptionSupabase,
} from './supabaseRepository';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { PaymentOrder, SubscriptionPlan } from './types';

export async function choosePlan(userId: string, plan: SubscriptionPlan): Promise<PaymentOrder | null> {
  if (isSupabaseConfigured()) {
    if (plan === 'basic') {
      await updateSubscriptionSupabase(userId, plan);
      return null;
    }
    return createPaymentOrderSupabase(userId, plan);
  }

  if (plan === 'basic') {
    memory.updateSubscription(userId, plan);
    return null;
  }
  memory.createPaymentOrder(userId, plan);
  return memory.refreshState(userId).paymentOrders[0] ?? null;
}
