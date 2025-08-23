import { mergeAndDedupeMessages, dedupeById } from './messageUtils';

describe('mergeAndDedupeMessages', () => {
  it('replaces optimistic message when server copy has same optimisticId', () => {
    const prev = [{ optimisticId: 'a1', senderId: 'u1', text: 'hi', timestamp: '2024-01-01T00:00:00Z', optimistic: true }];
    const incoming = [{ messageId: 'm1', optimisticId: 'a1', senderId: 'u1', text: 'hi', timestamp: '2024-01-01T00:00:00Z' }];
    const merged = mergeAndDedupeMessages(prev, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].messageId).toBe('m1');
  });

  it('does not merge messages when server copy lacks optimisticId', () => {
    const prev = [{ optimisticId: 'a2', senderId: 'u1', text: 'hey', timestamp: '2024-01-01T00:00:00Z', optimistic: true }];
    const incoming = [{ messageId: 'm2', senderId: 'u1', text: 'hey', timestamp: '2024-01-01T00:00:10Z' }];
    const merged = mergeAndDedupeMessages(prev, incoming);
    expect(merged).toHaveLength(2);
  });
});

describe('dedupeById', () => {
  it('keeps the server version when optimistic and server messages share an optimisticId', () => {
    const msgs = [
      { optimisticId: 'x1', senderId: 'u1', text: 'hi', timestamp: '2024-01-01T00:00:00Z', optimistic: true },
      { messageId: 'm1', optimisticId: 'x1', senderId: 'u1', text: 'hi', timestamp: '2024-01-01T00:00:02Z' }
    ];