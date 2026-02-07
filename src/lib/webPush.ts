/**
 * Web Push API client for Lightning Social
 *
 * Flow:
 * 1. Register service worker
 * 2. Request notification permission
 * 3. Subscribe to push notifications (needs VAPID public key)
 * 4. Send subscription to server for storage
 */

import { supabase } from './supabase';

// VAPID public key — set this in your .env as VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported in this browser
 */
export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Get the current notification permission state
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Register the service worker
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[WebPush] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[WebPush] Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[WebPush] Service worker registration failed:', error);
    return null;
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Convert a URL-safe base64 string to a Uint8Array (for VAPID key)
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> => {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[WebPush] VAPID public key not configured. Set VITE_VAPID_PUBLIC_KEY in your .env');
    return null;
  }

  try {
    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[WebPush] Already subscribed');
      return existingSubscription;
    }

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer
    });

    console.log('[WebPush] Push subscription created');
    return subscription;
  } catch (error) {
    console.error('[WebPush] Push subscription failed:', error);
    return null;
  }
};

/**
 * Save push subscription to Supabase
 */
export const savePushSubscription = async (
  userId: string,
  subscription: PushSubscription
): Promise<boolean> => {
  if (!supabase) return false;

  const subscriptionJSON = subscription.toJSON();
  const p256dh = subscriptionJSON.keys?.p256dh || '';
  const auth = subscriptionJSON.keys?.auth || '';

  try {
    // Upsert subscription (replace existing for this user/endpoint combo)
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[WebPush] Failed to save subscription:', error);
      return false;
    }

    console.log('[WebPush] Subscription saved to database');
    return true;
  } catch (err) {
    console.error('[WebPush] Error saving subscription:', err);
    return false;
  }
};

/**
 * Remove push subscription from Supabase
 */
export const removePushSubscription = async (
  userId: string
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[WebPush] Failed to remove subscription:', error);
      return false;
    }

    console.log('[WebPush] Subscription removed');
    return true;
  } catch (err) {
    console.error('[WebPush] Error removing subscription:', err);
    return false;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (
  userId: string
): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from database
    await removePushSubscription(userId);

    console.log('[WebPush] Unsubscribed from push notifications');
    return true;
  } catch (error) {
    console.error('[WebPush] Error unsubscribing:', error);
    return false;
  }
};

/**
 * Full setup flow: register SW → request permission → subscribe → save
 */
export const setupPushNotifications = async (
  userId: string
): Promise<{ success: boolean; permission: NotificationPermission | 'unsupported' }> => {
  // Check support
  if (!isPushSupported()) {
    return { success: false, permission: 'unsupported' };
  }

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) {
    return { success: false, permission: getNotificationPermission() };
  }

  // Request permission
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, permission };
  }

  // Subscribe to push
  const subscription = await subscribeToPush(registration);
  if (!subscription) {
    // VAPID key may not be configured — SW is still registered for future use
    return { success: false, permission: 'granted' };
  }

  // Save subscription to database
  const saved = await savePushSubscription(userId, subscription);

  return { success: saved, permission: 'granted' };
};
