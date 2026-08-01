const {
  buildDirectionsUrl,
  buildDispatchMessage,
  buildNotificationBody,
  formatAddress,
  formatOrderNumber,
  formatRupees,
  nextOrderActions,
  statusLabel,
} = require('../orderPresentation');

describe('order presentation', () => {
  it('formats ids and INR amounts for an operations dashboard', () => {
    expect(formatOrderNumber(1042)).toBe('ORD-1042');
    expect(formatRupees(98)).toBe('₹98');
    expect(formatRupees('98.5')).toBe('₹98.50');
  });

  it('builds a complete address and an encoded hospital-to-customer route', () => {
    const order = {
      address: {
        area: 'Jayanagar',
        building: 'Flat 4',
        city: 'Kadapa',
        formatted: '',
        landmark: 'Near park',
        pinCode: '516001',
        state: 'Andhra Pradesh',
      },
      hospital: {
        address: 'Asian Hospitals, Railway Station Road, Kadapa',
      },
    };

    expect(formatAddress(order.address)).toBe(
      'Flat 4, Jayanagar, Near park, Kadapa, Andhra Pradesh, 516001',
    );
    expect(buildDirectionsUrl(order)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=Asian%20Hospitals%2C%20Railway%20Station%20Road%2C%20Kadapa&destination=Flat%204%2C%20Jayanagar%2C%20Near%20park%2C%20Kadapa%2C%20Andhra%20Pradesh%2C%20516001',
    );
  });

  it('shows only valid next workflow actions', () => {
    expect(nextOrderActions('placed')).toEqual([
      { label: 'Mark shared', status: 'shared', tone: 'primary' },
      { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
    ]);
    expect(nextOrderActions('shared')).toEqual([
      { label: 'Assign rider', status: 'assign_rider', tone: 'primary' },
      { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
    ]);
    expect(nextOrderActions('assigned')).toEqual([
      { label: 'Medicine collected', status: 'collected', tone: 'primary' },
      { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
    ]);
    expect(nextOrderActions('out_for_delivery')).toEqual([
      { label: 'Mark delivered', status: 'delivered', tone: 'primary' },
      { label: 'Cancel order', status: 'cancelled', tone: 'danger' },
    ]);
    expect(nextOrderActions('delivered')).toEqual([]);
    expect(statusLabel('collected')).toBe('Medicine collected');
  });

  it('builds complete rider-group dispatch text', () => {
    const message = buildDispatchMessage({
      address: { formatted: 'Flat 4, Kadapa, 516001' },
      customerName: 'Anita Reddy',
      customerPhone: '9876543210',
      hospital: {
        address: 'Railway Station Road, Kadapa',
        name: 'ASIAN MULTI SPECIALITY HOSPITALS',
        phone: '9000011111',
      },
      items: [
        { name: 'Paracetamol', quantity: 2 },
        { name: 'Vitamin C', quantity: 1 },
      ],
      orderNumber: 1042,
      total: 147,
    });

    expect(message).toContain('DRJIVA DELIVERY · ORD-1042');
    expect(message).toContain('Pickup: ASIAN MULTI SPECIALITY HOSPITALS');
    expect(message).toContain('Railway Station Road, Kadapa');
    expect(message).toContain('Customer: Anita Reddy · 9876543210');
    expect(message).toContain('2× Paracetamol\n1× Vitamin C');
    expect(message).toContain('COD: ₹147');
    expect(message).toContain('https://www.google.com/maps/dir/');
  });

  it('keeps all requested details in notification copy', () => {
    expect(
      buildNotificationBody({
        address: { formatted: 'Flat 4, Kadapa, 516001' },
        customerName: 'Anita Reddy',
        customerPhone: '9876543210',
        items: [
          { name: 'Paracetamol', quantity: 2 },
          { name: 'Vitamin C', quantity: 1 },
        ],
        total: 147,
      }),
    ).toBe(
      'Anita Reddy · 9876543210\n2× Paracetamol, 1× Vitamin C\n₹147 COD\nFlat 4, Kadapa, 516001',
    );
  });
});
