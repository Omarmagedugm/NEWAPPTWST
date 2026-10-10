import OneSignal from 'react-onesignal';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import toast from 'react-hot-toast';

// Official OneSignal App ID & Safari Web ID
export const ONESIGNAL_APP_ID = 
  (import.meta.env.VITE_ONESIGNAL_APP_ID && import.meta.env.VITE_ONESIGNAL_APP_ID !== 'YOUR_ONESIGNAL_APP_ID')
    ? import.meta.env.VITE_ONESIGNAL_APP_ID
    : 'f93522a8-2af6-40a7-aa4e-25fc0e21e572';

export const SAFARI_WEB_ID = 'web.onesignal.auto.215a98b6-2876-4938-a894-401760de5038';

let isOneSignalInitialized = false;
let initializationPromise: Promise<boolean> | null = null;

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  token?: string;
  optedIn?: boolean;
  reason?: 'unsupported' | 'ios_not_standalone' | 'permission_denied' | 'permission_not_granted' | 'subscription_creation_timeout' | 'error';
  error?: any;
}

/**
 * Diagnostic helper: checks standalone mode for PWA (Desktop, Android, iOS Safari)
 */
export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if Web Push & Service Workers are supported by the current browser environment
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const hasNotification = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return hasNotification && hasServiceWorker && hasPushManager && isSecure;
}

/**
 * Diagnostic helper: prints full diagnostic status
 */
export async function logOneSignalDiagnosticStatus(stage: string = 'Current State'): Promise<void> {
  if (typeof window === 'undefined') return;

  const isStandalone = checkIsStandalone();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  
  let swList: any[] = [];
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      swList = registrations.map(reg => ({
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || 'none',
        state: reg.active?.state || 'unknown',
      }));
    } catch (e) {
      swList = ['error reading service workers: ' + String(e)];
    }
  }

  const userId = typeof OneSignal !== 'undefined' ? OneSignal.User?.onesignalId : undefined;
  const pushId = typeof OneSignal !== 'undefined' ? OneSignal.User?.PushSubscription?.id : undefined;
  const pushToken = typeof OneSignal !== 'undefined' ? OneSignal.User?.PushSubscription?.token : undefined;
  const optedIn = typeof OneSignal !== 'undefined' ? OneSignal.User?.PushSubscription?.optedIn : undefined;

  console.log(`%c[OneSignal Diagnostic - ${stage}]`, 'color: #00e676; font-weight: bold; font-size: 13px;', {
    '1. Notification.permission': permission,
    '2. standalone (PWA)': isStandalone,
    '3. platform': { isIOS, isAndroid, platform: navigator.platform },
    '4. OneSignal App ID': ONESIGNAL_APP_ID,
    '5. OneSignal User ID': userId || '(none)',
    '6. OneSignal Push Subscription ID': pushId || '(none)',
    '7. OneSignal Push Token': pushToken || '(none)',
    '8. Push optedIn': optedIn,
    '9. Service Workers': swList,
    '10. Origin': window.location.origin,
    '11. Secure Context': window.isSecureContext
  });
}

/**
 * Clean up legacy Firebase Cloud Messaging Service Workers to prevent any push event conflicts.
 */
async function cleanLegacyServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const script = reg.active?.scriptURL || '';
      if (script.includes('firebase-messaging-sw.js')) {
        console.log('[OneSignal] 🧹 Cleaning up legacy Firebase FCM service worker:', script);
        await reg.unregister();
      }
    }
  } catch (err) {
    console.warn('[OneSignal] Non-fatal error cleaning legacy service workers:', err);
  }
}

/**
 * Initialize OneSignal Web SDK v16 with unified Service Worker integration
 */
export async function initOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isOneSignalInitialized) return true;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      console.log('[OneSignal] 🚀 INIT START with App ID:', ONESIGNAL_APP_ID);

      // 1. Clean legacy FCM workers to guarantee zero conflict
      await cleanLegacyServiceWorkers();

      // 2. Initialize OneSignal Web SDK
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        } as any,
        serviceWorkerPath: 'sw.js',
        serviceWorkerParam: { scope: '/' },
      });

      isOneSignalInitialized = true;
      console.log('[OneSignal] ✅ INIT SUCCESS');

      // 3. Register Event Listener for Push Subscription changes
      try {
        if (OneSignal.User?.PushSubscription) {
          OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
            const currentId = event?.current?.id;
            const currentToken = event?.current?.token;
            const currentOptedIn = event?.current?.optedIn;

            console.log('[OneSignal] 🔄 PushSubscription changed event:', {
              current: { id: currentId, token: currentToken, optedIn: currentOptedIn },
              previous: { id: event?.previous?.id, token: event?.previous?.token, optedIn: event?.previous?.optedIn },
            });

            if ((currentId || currentToken) && currentOptedIn) {
              console.log('[OneSignal] 🎉 SUBSCRIPTION CREATED via event listener');
              await saveCurrentSubscriptionToFirestore(currentId, currentToken);
            }
          });
        }
      } catch (subErr) {
        console.warn('[OneSignal] Subscription change listener warning:', subErr);
      }

      // 4. Register Event Listener for Notifications permission changes
      try {
        if (OneSignal.Notifications) {
          OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
            console.log('[OneSignal] 🔔 Notifications permissionChange:', permission, 'Notification.permission:', typeof Notification !== 'undefined' ? Notification.permission : 'n/a');
          });

          // Route notification clicks to /live or specified URL
          OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log('[OneSignal] 🔔 Notification clicked:', event);
            const additionalData = event?.notification?.additionalData || {};
            const isMatch = additionalData.isMatch || 
              additionalData.type === 'match' || 
              (additionalData.url && additionalData.url.includes('/live')) ||
              /⚽|🟢|🟨|🟥|🔄|🏁|هدف|مباراة|طرد/i.test(`${event?.notification?.title || ''} ${event?.notification?.body || ''}`);

            const targetUrl = additionalData.url || (isMatch ? '/live' : '/');

            if (typeof window !== 'undefined' && targetUrl) {
              if (window.location.pathname !== targetUrl) {
                window.location.href = targetUrl;
              }
            }
          });
        }
      } catch (clickErr) {
        console.warn('[OneSignal] Notifications event listeners warning:', clickErr);
      }

      // 5. If browser already has granted permission, opt-in to refresh Push Subscription
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          if (OneSignal.User?.PushSubscription) {
            await OneSignal.User.PushSubscription.optIn();
            const subId = OneSignal.User.PushSubscription.id;
            const subToken = OneSignal.User.PushSubscription.token;
            if (subId || subToken) {
              await saveCurrentSubscriptionToFirestore(subId, subToken);
            }
          }
        } catch (optErr) {
          console.warn('[OneSignal] Background optIn error:', optErr);
        }
      }

      await logOneSignalDiagnosticStatus('INIT COMPLETE');
      return true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('Can only be used on')) {
        console.warn(`[OneSignal] ℹ️ Domain notice: This OneSignal App ID is configured for production (${errMsg.replace('Can only be used on: ', '')}). Push notifications will activate on that domain.`);
      } else {
        console.warn('[OneSignal Diagnostic] ❌ OneSignal initialization exception:', errMsg);
      }
      return false;
    }
  })();

  return initializationPromise;
}

/**
 * Save current OneSignal subscription ID and device details to Firestore.
 * Strictly uses subscriptionId as the document key to prevent duplicate records.
 */
export async function saveCurrentSubscriptionToFirestore(subscriptionId?: string, pushToken?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const id = subscriptionId || OneSignal.User?.PushSubscription?.id;
    const token = pushToken || OneSignal.User?.PushSubscription?.token;

    if (!id && !token) {
      console.warn('[OneSignal] Cannot save to Firestore: No subscription ID or token found.');
      return;
    }

    // Key is strictly the unique subscription ID to prevent duplicates
    const subKey = id || token!;
    const isPWA = checkIsStandalone();

    const subscriptionData = {
      subscriptionId: id || null,
      token: token || null,
      provider: 'onesignal',
      status: 'active',
      platform: navigator.platform || 'unknown',
      userAgent: navigator.userAgent || 'unknown',
      isPWA: isPWA,
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    // Save in Firestore collection `onesignal_subscriptions`
    await setDoc(doc(db, 'onesignal_subscriptions', subKey), subscriptionData, { merge: true });
    console.log('[OneSignal] 💾 SAVED TO FIRESTORE with document key:', subKey);

    // Also link to currentUser profile if signed in
    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      await setDoc(doc(db, 'users', currentUser.uid), {
        onesignalSubscriptionId: id || null,
        notificationsEnabled: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('[OneSignal] 🔗 Linked subscription to user profile:', currentUser.uid);
    }
  } catch (err) {
    console.warn('[OneSignal] Non-fatal error saving subscription to Firestore:', err);
  }
}

/**
 * Full Request Notification Permission Flow with complete subscription verification
 */
export async function requestNotificationPermission(): Promise<SubscriptionResult> {
  if (typeof window === 'undefined') {
    return { success: false, reason: 'unsupported' };
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = checkIsStandalone();

  // 1. Check iOS Safari requirement (iOS Web Push requires standalone mode PWA)
  if (isIOS && !isStandalone) {
    console.warn('[OneSignal] iOS Web Push requires PWA (Add to Home Screen)');
    return { success: false, reason: 'ios_not_standalone' };
  }

  // 2. Check general browser support
  if (!isPushSupported() && !('Notification' in window)) {
    console.warn('[OneSignal] Push notifications not supported in this browser environment');
    return { success: false, reason: 'unsupported' };
  }

  // 3. Check if already denied
  if (Notification.permission === 'denied') {
    console.warn('[OneSignal] Notification permission is denied by user in browser settings');
    return { success: false, reason: 'permission_denied' };
  }

  try {
    // 4. Initialize OneSignal
    console.log('[OneSignal] 🚀 PERMISSION REQUEST FLOW STARTED');
    await initOneSignal();

    // 5. Ensure Service Worker is ready
    if ('serviceWorker' in navigator) {
      try {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 3000))
        ]);
      } catch (swErr) {
        console.warn('[OneSignal] Service Worker ready notice:', swErr);
      }
    }

    // 6. Request permission via OneSignal's SDK
    console.log('[OneSignal] 🔔 PERMISSION REQUESTED');
    try {
      if (typeof OneSignal !== 'undefined' && OneSignal.Notifications?.requestPermission) {
        await OneSignal.Notifications.requestPermission();
      }
    } catch (sdkErr) {
      console.warn('[OneSignal] SDK requestPermission notice:', sdkErr);
    }

    // 7. Native fallback if permission state is still default
    if ((Notification.permission as string) === 'default') {
      try {
        await Notification.requestPermission();
      } catch (natErr) {
        console.warn('[OneSignal] Native requestPermission exception:', natErr);
      }
    }

    const currentPerm = Notification.permission as string;
    console.log('[OneSignal] Current permission after prompt:', currentPerm);

    if (currentPerm !== 'granted') {
      if (currentPerm === 'denied') {
        return { success: false, reason: 'permission_denied' };
      }
      return { success: false, reason: 'permission_not_granted' };
    }

    console.log('[OneSignal] ✅ PERMISSION GRANTED');

    // 8. Opt-in explicitly to create Push Subscription
    console.log('[OneSignal] 🔄 OPT-IN START');
    try {
      if (typeof OneSignal !== 'undefined' && OneSignal.User?.PushSubscription) {
        await OneSignal.User.PushSubscription.optIn();
      }
    } catch (optErr) {
      console.warn('[OneSignal] Opt-in exception:', optErr);
    }

    // 9. Wait for Push Subscription ID and verification of optedIn (up to 10s: 20 x 500ms)
    console.log('[OneSignal] ⏳ WAITING FOR SUBSCRIPTION ID...');
    let subscriptionId = OneSignal.User?.PushSubscription?.id;
    let token = OneSignal.User?.PushSubscription?.token;
    let optedIn = OneSignal.User?.PushSubscription?.optedIn;

    for (let i = 0; i < 20; i++) {
      subscriptionId = OneSignal.User?.PushSubscription?.id;
      token = OneSignal.User?.PushSubscription?.token;
      optedIn = OneSignal.User?.PushSubscription?.optedIn;

      if (subscriptionId && optedIn) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 10. Check if subscription was successfully generated
    if (subscriptionId && optedIn) {
      console.log(`[OneSignal] 🎉 SUBSCRIPTION CREATED`);
      console.log(`[OneSignal] 🔑 SUBSCRIPTION ID: ${subscriptionId}`);

      await saveCurrentSubscriptionToFirestore(subscriptionId, token);
      await logOneSignalDiagnosticStatus('Subscription Success');

      return {
        success: true,
        subscriptionId: subscriptionId,
        token: token,
        optedIn: true
      };
    } else {
      console.warn('[OneSignal] ❌ Permission granted but subscription was not created (or optedIn is false). Diagnostics:', {
        subscriptionId,
        token,
        optedIn,
        permission: Notification.permission
      });

      // Save token if available even if ID is pending
      if (token) {
        await saveCurrentSubscriptionToFirestore(undefined, token);
      }

      await logOneSignalDiagnosticStatus('Subscription Creation Timeout');
      return {
        success: false,
        reason: 'subscription_creation_timeout',
        subscriptionId: subscriptionId,
        token: token,
        optedIn: optedIn
      };
    }
  } catch (err: any) {
    console.error('[OneSignal] ❌ Permission request exception:', err);
    return {
      success: false,
      reason: 'error',
      error: err
    };
  }
}

/**
 * Helper to check if notifications are enabled and active
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}
