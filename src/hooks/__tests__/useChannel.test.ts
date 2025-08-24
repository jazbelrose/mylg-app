/**
 * Test for useChannel hook
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useChannel } from '../useChannel';
import { channelStore } from '../../utils/channelStore';

// Mock React's useSyncExternalStore
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useSyncExternalStore: jest.fn(),
}));

describe('useChannel', () => {
  const mockUseSyncExternalStore = React.useSyncExternalStore as jest.MockedFunction<typeof React.useSyncExternalStore>;

  beforeEach(() => {
    channelStore.clear();
    mockUseSyncExternalStore.mockClear();
  });

  test('should return fallback value when channel is empty', () => {
    mockUseSyncExternalStore.mockImplementation((subscribe, getSnapshot, getServerSnapshot) => {
      return getSnapshot();
    });

    const { result } = renderHook(() => useChannel('test-channel', 'fallback'));
    expect(result.current).toBe('fallback');
  });

  test('should return channel value when available', () => {
    channelStore.update('test-channel', 'test-value');
    
    mockUseSyncExternalStore.mockImplementation((subscribe, getSnapshot, getServerSnapshot) => {
      return getSnapshot();
    });

    const { result } = renderHook(() => useChannel('test-channel', 'fallback'));
    expect(result.current).toBe('test-value');
  });

  test('should subscribe to channel updates', () => {
    let subscribeFn: ((onStoreChange: () => void) => () => void) | undefined;
    let unsubscribeFn: (() => void) | undefined;

    mockUseSyncExternalStore.mockImplementation((subscribe, getSnapshot, getServerSnapshot) => {
      subscribeFn = subscribe;
      // Mock that we subscribe and get an unsubscribe function
      const mockUnsubscribe = jest.fn();
      unsubscribeFn = subscribe(() => {});
      return getSnapshot();
    });

    const { result } = renderHook(() => useChannel('test-channel', 'fallback'));
    
    // Verify the subscribe function was called
    expect(subscribeFn).toBeDefined();
    expect(typeof subscribeFn).toBe('function');
  });

  test('should use server snapshot for SSR', () => {
    mockUseSyncExternalStore.mockImplementation((subscribe, getSnapshot, getServerSnapshot) => {
      return getServerSnapshot();
    });

    const { result } = renderHook(() => useChannel('test-channel', 'fallback'));
    expect(result.current).toBe('fallback');
  });
});