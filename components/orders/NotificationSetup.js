import { useEffect, useState } from 'react';

import {
  registerPushSubscription,
  removePushSubscription,
} from '../../lib/orders';

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), (character) =>
    character.charCodeAt(0),
  );
}

export default function NotificationSetup({ accessCode, vapidPublicKey }) {
  const [subscription, setSubscription] = useState(null);
  const [supported, setSupported] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    let active = true;
    const ios = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    window.setTimeout(() => {
      if (active) {
        setIsIOS(ios);
        setIsStandalone(standalone);
      }
    }, 0);
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);

    const canPush =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    window.setTimeout(() => {
      if (active) setSupported(canPush);
    }, 0);
    if (canPush) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => registration.pushManager.getSubscription())
        .then((current) => {
          if (active) setSubscription(current);
        })
        .catch(() => {
          if (active) setMessage('Could not prepare notifications on this device.');
        });
    }
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', handleInstall);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function enable() {
    if (!vapidPublicKey) {
      setMessage('Push keys are not configured yet.');
      return;
    }
    if (isIOS && !isStandalone) {
      setMessage('On iPhone, add this app to the Home Screen first, then open it there.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('Notification permission was not allowed in browser settings.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const current =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          userVisibleOnly: true,
        }));
      const serialized = current.toJSON();
      await registerPushSubscription(accessCode, serialized, navigator.userAgent);
      setSubscription(current);
      setMessage('New-order notifications are enabled on this device.');
    } catch {
      setMessage('Could not enable notifications. Check browser settings and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    setMessage('');
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await removePushSubscription(accessCode, endpoint);
      setSubscription(null);
      setMessage('Notifications are disabled on this device.');
    } catch {
      setMessage('Could not disable notifications. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="notification-card">
      <div className="notification-copy">
        <span className={`notification-icon${subscription ? ' is-on' : ''}`} aria-hidden="true">⌁</span>
        <div>
          <div className="notification-title-row">
            <h2>New-order alerts</h2>
            {subscription ? <span className="enabled-chip">Enabled</span> : null}
          </div>
          <p>
            Alerts include the customer, phone, medicines, COD total, and full address.
          </p>
          {!isStandalone ? (
            <p className="install-note">
              {isIOS
                ? 'On iPhone: Share → Add to Home Screen, then enable alerts inside the installed app.'
                : 'Install this app from your browser menu for the most reliable alerts.'}
            </p>
          ) : null}
          {message ? <p className="inline-message" role="status">{message}</p> : null}
        </div>
      </div>
      <div className="notification-actions">
        {installPrompt ? (
          <button className="button button-secondary" onClick={install} type="button">
            Install app
          </button>
        ) : null}
        {supported === false ? (
          <span className="unsupported-copy">Push is not supported here</span>
        ) : subscription ? (
          <button className="button button-quiet" disabled={busy} onClick={disable} type="button">
            {busy ? 'Working…' : 'Disable'}
          </button>
        ) : (
          <button className="button button-primary" disabled={busy || supported !== true} onClick={enable} type="button">
            {busy ? 'Enabling…' : 'Enable alerts'}
          </button>
        )}
      </div>
    </section>
  );
}
