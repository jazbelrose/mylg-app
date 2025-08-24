/**
 * Test for channelStore functionality
 */
import { ChannelStore } from '../channelStore';

describe('ChannelStore', () => {
  let store: ChannelStore;

  beforeEach(() => {
    store = new ChannelStore();
  });

  test('should get fallback value when channel is empty', () => {
    expect(store.get('test-channel', 'fallback')).toBe('fallback');
  });

  test('should update and get channel values', () => {
    store.update('test-channel', 'test-value');
    expect(store.get('test-channel', 'fallback')).toBe('test-value');
  });

  test('should notify listeners when channel updates', () => {
    const listener = jest.fn();
    const unsubscribe = store.subscribe('test-channel', listener);
    
    store.update('test-channel', 'value1');
    expect(listener).toHaveBeenCalledTimes(1);
    
    store.notify('test-channel');
    expect(listener).toHaveBeenCalledTimes(2);
    
    unsubscribe();
    store.notify('test-channel');
    expect(listener).toHaveBeenCalledTimes(2); // Should not be called after unsubscribe
  });

  test('should handle multiple listeners for same channel', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    store.subscribe('test-channel', listener1);
    store.subscribe('test-channel', listener2);
    
    store.notify('test-channel');
    
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  test('should isolate channels from each other', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    store.subscribe('channel-1', listener1);
    store.subscribe('channel-2', listener2);
    
    store.notify('channel-1');
    
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(0);
  });

  test('should provide debug information', () => {
    store.update('channel-1', 'value1');
    store.update('channel-2', 'value2');
    store.subscribe('channel-1', () => {});
    store.subscribe('channel-1', () => {});
    store.subscribe('channel-2', () => {});
    
    const debug = store.debug();
    expect(debug.channels).toContain('channel-1');
    expect(debug.channels).toContain('channel-2');
    expect(debug.listenerCounts['channel-1']).toBe(2);
    expect(debug.listenerCounts['channel-2']).toBe(1);
  });

  test('should clear all data', () => {
    store.update('test-channel', 'test-value');
    store.subscribe('test-channel', () => {});
    
    store.clear();
    
    expect(store.get('test-channel', 'fallback')).toBe('fallback');
    expect(store.debug().channels).toHaveLength(0);
    expect(Object.keys(store.debug().listenerCounts)).toHaveLength(0);
  });
});