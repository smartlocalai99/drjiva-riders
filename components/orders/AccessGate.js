import { useEffect, useState } from 'react';

import { verifyAccessCode } from '../../lib/orders';

const ACCESS_STORAGE_KEY = 'drjiva.order-console.access.v1';

export default function AccessGate({ onUnlock }) {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const saved = window.localStorage.getItem(ACCESS_STORAGE_KEY) ?? '';
    if (!saved) {
      window.setTimeout(() => {
        if (active) setIsChecking(false);
      }, 0);
      return () => {
        active = false;
      };
    }
    verifyAccessCode(saved)
      .then((valid) => {
        if (!active) return;
        if (valid) onUnlock(saved);
        else window.localStorage.removeItem(ACCESS_STORAGE_KEY);
      })
      .catch(() => {
        if (active) setError('Could not reach the order service. Check your connection.');
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });
    return () => {
      active = false;
    };
  }, [onUnlock]);

  async function unlock(event) {
    event.preventDefault();
    const candidate = accessCode.trim();
    if (!candidate) {
      setError('Enter the dispatcher access code.');
      return;
    }
    setError('');
    setIsChecking(true);
    try {
      const valid = await verifyAccessCode(candidate);
      if (!valid) {
        setError('That access code is not valid.');
        return;
      }
      window.localStorage.setItem(ACCESS_STORAGE_KEY, candidate);
      onUnlock(candidate);
    } catch {
      setError('Could not verify the code. Check your connection and try again.');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="gate-shell">
      <section className="gate-card" aria-labelledby="gate-title">
        <div className="brand-mark" aria-hidden="true">
          <span>+</span>
        </div>
        <p className="eyebrow">DRJIVA operations</p>
        <h1 id="gate-title">Order dispatch</h1>
        <p className="gate-intro">
          Receive orders, share them to your riders group, and record every delivery handoff.
        </p>
        <form className="gate-form" onSubmit={unlock}>
          <label htmlFor="access-code">Dispatcher access code</label>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            id="access-code"
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="DRJIVA-••••••••"
            spellCheck="false"
            type="password"
            value={accessCode}
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary button-wide" disabled={isChecking} type="submit">
            {isChecking ? 'Checking…' : 'Open dispatch'}
          </button>
        </form>
        <div className="gate-note">
          <span className="live-dot" />
          Orders remain saved even if this device is offline.
        </div>
      </section>
    </main>
  );
}

export function clearStoredAccessCode() {
  window.localStorage.removeItem(ACCESS_STORAGE_KEY);
}
