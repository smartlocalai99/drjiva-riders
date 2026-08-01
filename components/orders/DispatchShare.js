import { useState } from 'react';

import { buildDispatchMessage } from '../../lib/orderPresentation';

export async function shareDispatchMessage({ copy, message, onShared, share }) {
  if (share) {
    try {
      await share({ text: message, title: 'DRJIVA delivery order' });
      await onShared?.();
      return 'shared';
    } catch (cause) {
      if (cause?.name === 'AbortError') return 'cancelled';
    }
  }
  await copy(message);
  return 'copied';
}

export default function DispatchShare({ busy, onShared, order }) {
  const [message, setMessage] = useState('');
  const dispatchText = buildDispatchMessage(order);

  async function copyOrder() {
    await navigator.clipboard.writeText(dispatchText);
    setMessage('Order copied. Choose the riders group in WhatsApp.');
  }

  async function shareOrder() {
    setMessage('');
    try {
      const result = await shareDispatchMessage({
        copy: (text) => navigator.clipboard.writeText(text),
        message: dispatchText,
        onShared,
        share: typeof navigator.share === 'function'
          ? (data) => navigator.share(data)
          : undefined,
      });
      if (result === 'copied') {
        setMessage('Order copied. Open WhatsApp and choose the riders group.');
      }
    } catch {
      setMessage('Could not share this order. Use Copy order instead.');
    }
  }

  return (
    <section className="dispatch-share" aria-label="Share with riders">
      <div>
        <p className="section-kicker">Rider group</p>
        <h3>Send this delivery to WhatsApp</h3>
      </div>
      <div className="dispatch-share-actions">
        <button className="button button-primary" disabled={busy} onClick={shareOrder} type="button">
          Share on WhatsApp
        </button>
        <button className="button button-secondary" disabled={busy} onClick={copyOrder} type="button">
          Copy order
        </button>
      </div>
      {message ? <p className="inline-message" role="status">{message}</p> : null}
    </section>
  );
}
