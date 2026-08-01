import { useState } from 'react';

import { savePickupLocation } from '../../lib/orders';

export default function PickupSettings({ accessCode, hospital, onClose, onSaved }) {
  const [address, setAddress] = useState(hospital?.address ?? '');
  const [phone, setPhone] = useState(hospital?.phone ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    if (address.trim().length < 8) {
      setError('Enter the complete pickup address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await savePickupLocation(accessCode, { address, phone });
      onSaved(updated);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the pickup location.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="pickup-title"
        aria-modal="true"
        className="settings-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Route origin</p>
            <h2 id="pickup-title">Hospital pickup</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close settings">×</button>
        </header>
        <p className="sheet-intro">
          This address becomes the starting point for every delivery route and is snapshotted on new orders.
        </p>
        <form className="settings-form" onSubmit={save}>
          <label htmlFor="pickup-address">Complete hospital address</label>
          <textarea
            autoFocus
            id="pickup-address"
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Building, road, area, city, state, PIN code"
            rows="4"
            value={address}
          />
          <label htmlFor="pickup-phone">Hospital phone</label>
          <input
            id="pickup-phone"
            inputMode="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Hospital contact number"
            value={phone}
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary button-wide" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Save pickup location'}
          </button>
        </form>
      </section>
    </div>
  );
}
