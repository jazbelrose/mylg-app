/**
 * Integration test for WebSocket channel updates
 */
import { channelStore } from '../channelStore';

describe('WebSocket Channel Integration', () => {
  beforeEach(() => {
    channelStore.clear();
  });

  test('should handle budget update messages correctly', () => {
    const listener = jest.fn();
    
    // Simulate component subscribing to budget channel
    const unsubscribe = channelStore.subscribe('budget:project123', listener);
    
    // Simulate WebSocket message parsing in SocketContext
    const mockBudgetMessage = {
      action: 'budgetUpdated',
      projectId: 'project123',
      senderId: 'user456',
      total: 15000,
      revision: 5
    };
    
    // This would happen in SocketContext message handler
    if (mockBudgetMessage.action === 'budgetUpdated' && mockBudgetMessage.projectId) {
      const channelKey = `budget:${mockBudgetMessage.projectId}`;
      channelStore.update(channelKey, mockBudgetMessage);
    }
    
    // Verify listener was called
    expect(listener).toHaveBeenCalledTimes(1);
    
    // Verify message is stored
    expect(channelStore.get('budget:project123', null)).toEqual(mockBudgetMessage);
    
    // Simulate another project's budget update - should not affect this listener
    const otherProjectMessage = {
      action: 'budgetUpdated',
      projectId: 'project999',
      senderId: 'user456',
      total: 20000,
      revision: 3
    };
    
    channelStore.update(`budget:${otherProjectMessage.projectId}`, otherProjectMessage);
    
    // Original listener should not be called again
    expect(listener).toHaveBeenCalledTimes(1);
    
    unsubscribe();
  });

  test('should handle line lock messages correctly', () => {
    const listener = jest.fn();
    
    // Simulate component subscribing to line lock channel
    const unsubscribe = channelStore.subscribe('lineLock:project123', listener);
    
    // Simulate line lock message
    const mockLineLockMessage = {
      action: 'lineLocked',
      projectId: 'project123',
      lineId: 'line789',
      senderId: 'user456',
      revision: 5
    };
    
    // This would happen in SocketContext message handler
    if ((mockLineLockMessage.action === 'lineLocked' || mockLineLockMessage.action === 'lineUnlocked') && mockLineLockMessage.projectId) {
      const channelKey = `lineLock:${mockLineLockMessage.projectId}`;
      channelStore.update(channelKey, mockLineLockMessage);
    }
    
    // Verify listener was called
    expect(listener).toHaveBeenCalledTimes(1);
    
    // Verify message is stored
    expect(channelStore.get('lineLock:project123', null)).toEqual(mockLineLockMessage);
    
    unsubscribe();
  });

  test('should support multiple components listening to same channel', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    // Simulate BudgetComponent and BudgetPage both listening to budget updates
    const unsubscribe1 = channelStore.subscribe('budget:project123', listener1);
    const unsubscribe2 = channelStore.subscribe('budget:project123', listener2);
    
    // Simulate budget update
    const mockMessage = {
      action: 'budgetUpdated',
      projectId: 'project123',
      senderId: 'user456',
      total: 15000
    };
    
    channelStore.update('budget:project123', mockMessage);
    
    // Both listeners should be called
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    
    unsubscribe1();
    unsubscribe2();
  });

  test('should clean up unused channels properly', () => {
    const listener = jest.fn();
    
    // Subscribe and then unsubscribe
    const unsubscribe = channelStore.subscribe('budget:project123', listener);
    
    // Update channel
    channelStore.update('budget:project123', { action: 'budgetUpdated', projectId: 'project123' });
    expect(listener).toHaveBeenCalledTimes(1);
    
    // Unsubscribe
    unsubscribe();
    
    // Update again - listener should not be called
    channelStore.update('budget:project123', { action: 'budgetUpdated', projectId: 'project123' });
    expect(listener).toHaveBeenCalledTimes(1);
    
    // Verify debug shows no listeners for the channel
    const debug = channelStore.debug();
    expect(debug.listenerCounts['budget:project123']).toBeUndefined();
  });
});