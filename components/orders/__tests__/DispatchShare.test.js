const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const DispatchShare = require('../DispatchShare').default;
const { shareDispatchMessage } = require('../DispatchShare');

describe('DispatchShare', () => {
  it('uses native sharing and marks the order shared only after it resolves', async () => {
    const events = [];
    const result = await shareDispatchMessage({
      copy: async () => events.push('copied'),
      message: 'ORD-1001',
      onShared: () => events.push('shared'),
      share: async () => events.push('share-sheet'),
    });

    expect(result).toBe('shared');
    expect(events).toEqual(['share-sheet', 'shared']);
  });

  it('falls back to copying without changing order status', async () => {
    const events = [];
    const result = await shareDispatchMessage({
      copy: async () => events.push('copied'),
      message: 'ORD-1001',
      onShared: () => events.push('shared'),
    });

    expect(result).toBe('copied');
    expect(events).toEqual(['copied']);
  });

  it('renders explicit WhatsApp and copy actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(DispatchShare, {
        busy: false,
        onShared: () => undefined,
        order: { address: {}, hospital: {}, items: [], orderNumber: 1001 },
      }),
    );
    expect(html).toContain('Share on WhatsApp');
    expect(html).toContain('Copy order');
  });
});
