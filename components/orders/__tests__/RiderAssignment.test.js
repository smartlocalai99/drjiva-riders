const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const RiderAssignment = require('../RiderAssignment').default;
const { validateRiderAssignment } = require('../RiderAssignment');

describe('RiderAssignment', () => {
  it('normalizes a valid rider and rejects incomplete details', () => {
    expect(validateRiderAssignment(' Ravi ', '+91 98765 43210')).toEqual({
      name: 'Ravi',
      phone: '9876543210',
    });
    expect(validateRiderAssignment('', '9876543210')).toEqual({
      error: 'Enter the rider name.',
    });
    expect(validateRiderAssignment('Ravi', '123')).toEqual({
      error: 'Enter a valid 10-digit rider phone.',
    });
  });

  it('renders rider name and phone controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(RiderAssignment, {
        busy: false,
        onAssign: () => undefined,
        onClose: () => undefined,
        order: { orderNumber: 1001 },
      }),
    );
    expect(html).toContain('Assign rider');
    expect(html).toContain('Rider name');
    expect(html).toContain('Rider phone');
  });
});
