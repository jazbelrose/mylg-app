import { renderHook, act } from '@testing-library/react';
import { useCallback, useRef } from 'react';
import YjsIdleSavePlugin from '../YjsIdleSavePlugin';
import * as Y from 'yjs';

// Mock the Lexical composer context
const mockEditor = {
  getEditorState: jest.fn(() => ({
    toJSON: () => ({ test: 'data' }),
    read: (fn: () => void) => fn(),
  })),
};

jest.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [mockEditor],
}));

describe('YjsIdleSavePlugin', () => {
  let mockDoc: Y.Doc;
  let mockProvider: any;
  let mockOnSave: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockDoc = new Y.Doc();
    mockProvider = {
      doc: mockDoc,
      awareness: {},
    };
    mockOnSave = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should trigger save after idle period', async () => {
    const TestComponent = () => {
      return YjsIdleSavePlugin({
        provider: mockProvider,
        onSave: mockOnSave,
        idleTimeMs: 1000, // 1 second for testing
      });
    };

    renderHook(() => TestComponent());

    // Simulate document update
    act(() => {
      mockDoc.emit('update', new Uint8Array());
    });

    // Should not have saved yet
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fast forward time past idle period
    act(() => {
      jest.advanceTimersByTime(1001);
    });

    // Should have triggered save
    await act(async () => {
      await Promise.resolve(); // Allow async operations to complete
    });

    expect(mockOnSave).toHaveBeenCalledWith('{"test":"data"}');
  });

  test('should reset timer on subsequent updates', async () => {
    const TestComponent = () => {
      return YjsIdleSavePlugin({
        provider: mockProvider,
        onSave: mockOnSave,
        idleTimeMs: 1000,
      });
    };

    renderHook(() => TestComponent());

    // First update
    act(() => {
      mockDoc.emit('update', new Uint8Array());
    });

    // Wait 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Second update (should reset timer)
    act(() => {
      mockDoc.emit('update', new Uint8Array());
    });

    // Wait another 500ms (total 1000ms, but timer was reset)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should not have saved yet
    expect(mockOnSave).not.toHaveBeenCalled();

    // Wait additional 500ms to complete the reset cycle
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now should have saved
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  test('should expose manual save function', async () => {
    let manualSaveFunc: (() => Promise<void>) | null = null;

    const TestComponent = () => {
      return YjsIdleSavePlugin({
        provider: mockProvider,
        onSave: mockOnSave,
        idleTimeMs: 1000,
        onManualSaveReady: (saveFunc) => {
          manualSaveFunc = saveFunc;
        },
      });
    };

    renderHook(() => TestComponent());

    // Manual save function should be available
    expect(manualSaveFunc).toBeDefined();

    // Call manual save
    if (manualSaveFunc) {
      await act(async () => {
        await manualSaveFunc();
      });
    }

    expect(mockOnSave).toHaveBeenCalledWith('{"test":"data"}');
  });

  test('should handle onActivity callback', () => {
    const mockOnActivity = jest.fn();

    const TestComponent = () => {
      return YjsIdleSavePlugin({
        provider: mockProvider,
        onSave: mockOnSave,
        idleTimeMs: 1000,
        onActivity: mockOnActivity,
      });
    };

    renderHook(() => TestComponent());

    // Simulate document update
    act(() => {
      mockDoc.emit('update', new Uint8Array());
    });

    expect(mockOnActivity).toHaveBeenCalled();
  });

  test('should not save duplicate content', async () => {
    const TestComponent = () => {
      return YjsIdleSavePlugin({
        provider: mockProvider,
        onSave: mockOnSave,
        idleTimeMs: 100,
      });
    };

    renderHook(() => TestComponent());

    // First update and save
    act(() => {
      mockDoc.emit('update', new Uint8Array());
    });

    act(() => {
      jest.advanceTimersByTime(101);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);

    // Second update with same content
    act(() => {
      mockDoc.emit('update', new Uint8Array());
    });

    act(() => {
      jest.advanceTimersByTime(101);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Should not have called save again for duplicate content
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});