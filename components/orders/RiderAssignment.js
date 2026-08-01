import { useState } from 'react';

import { formatOrderNumber } from '../../lib/orderPresentation';

export function validateRiderAssignment(name, phone) {
  const normalizedName = name.trim();
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
  if (!normalizedName) return { error: 'Enter the rider name.' };
  if (normalizedPhone.length !== 10) {
    return { error: 'Enter a valid 10-digit rider phone.' };
  }
  return { name: normalizedName, phone: normalizedPhone };
}

export default function RiderAssignment({ busy, onAssign, onClose, order }) {
  const [name, setName] = useState(order?.riderName ?? '');
  const [phone, setPhone] = useState(order?.riderPhone ?? '');
  const [error, setError] = useState('');

  async function assign(event) {
    event.preventDefault();
    const result = validateRiderAssignment(name, phone);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError('');
    await onAssign(result);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="rider-assignment-title"
        aria-modal="true"
        className="settings-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="sheet-header">
          <div>
            <p className="eyebrow">{formatOrderNumber(order?.orderNumber)}</p>
            <h2 id="rider-assignment-title">Assign rider</h2>
          </div>
          <button aria-label="Close rider assignment" className="icon-button" onClick={onClose} type="button">×</button>
        </header>
        <p className="sheet-intro">Save the rider who accepted this order in your WhatsApp group.</p>
        <form className="settings-form" onSubmit={assign}>
          <label htmlFor="rider-name">Rider name</label>
          <input autoFocus id="rider-name" onChange={(event) => setName(event.target.value)} value={name} />
          <label htmlFor="rider-phone">Rider phone</label>
          <input id="rider-phone" inputMode="tel" onChange={(event) => setPhone(event.target.value)} value={phone} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary button-wide" disabled={busy} type="submit">
            {busy ? 'Assigning…' : 'Assign rider'}
          </button>
        </form>
      </section>
    </div>
  );
}
