import React, { useState, useEffect } from 'react';
import { useSocket } from '../app/contexts/SocketContext';

interface WebSocketDiagnosticProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WebSocketDiagnostic: React.FC<WebSocketDiagnosticProps> = ({ isVisible, onClose }) => {
  const { ws, isConnected, connectionHealth, onlineUsers } = useSocket();
  const [logs, setLogs] = useState<string[]>([]);
  const [manualTest, setManualTest] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      const status = isConnected ? '🟢 Connected' : '🔴 Disconnected';
      const readyState = ws ? `State: ${getReadyStateText(ws.readyState)}` : 'No socket';
      
      setLogs(prev => {
        const newLog = `${timestamp} - ${status} | ${readyState}`;
        const updated = [newLog, ...prev.slice(0, 49)]; // Keep last 50 logs
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible, isConnected, ws]);

  const getReadyStateText = (state: number) => {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  };

  const sendTestMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && manualTest.trim()) {
      try {
        ws.send(JSON.stringify({ action: 'ping', data: manualTest }));
        setLogs(prev => [`${new Date().toLocaleTimeString()} - 📤 Sent: ${manualTest}`, ...prev]);
        setManualTest('');
      } catch (error) {
        setLogs(prev => [`${new Date().toLocaleTimeString()} - ❌ Send failed: ${error}`, ...prev]);
      }
    }
  };

  const clearLogs = () => setLogs([]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      height: '600px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      border: '1px solid #333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#4CAF50' }}>WebSocket Diagnostic</h3>
        <button onClick={onClose} style={{
          background: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer'
        }}>✕</button>
      </div>

      {/* Status Panel */}
      <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
        <div><strong>Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
        <div><strong>Ready State:</strong> {ws ? getReadyStateText(ws.readyState) : 'No Socket'}</div>
        <div><strong>Online Users:</strong> {onlineUsers.length}</div>
        
        {connectionHealth && (
          <div style={{ marginTop: '8px' }}>
            <div><strong>Connection Health:</strong></div>
            <div style={{ marginLeft: '16px' }}>
              <div>Duration: {Math.round(connectionHealth.connectionDuration / 1000)}s</div>
              <div>Failures: {connectionHealth.consecutiveFailures}</div>
              <div>Last Ping: {connectionHealth.lastPing ? new Date(connectionHealth.lastPing).toLocaleTimeString() : 'None'}</div>
              <div>Last Pong: {connectionHealth.lastPong ? new Date(connectionHealth.lastPong).toLocaleTimeString() : 'None'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Panel */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            value={manualTest}
            onChange={(e) => setManualTest(e.target.value)}
            placeholder="Test message"
            style={{
              width: '100%',
              padding: '4px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid #555',
              color: 'white',
              borderRadius: '4px'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={sendTestMessage}
            disabled={!isConnected || !manualTest.trim()}
            style={{
              background: isConnected ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              fontSize: '12px'
            }}
          >
            Send Test
          </button>
          <button
            onClick={clearLogs}
            style={{
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Logs Panel */}
      <div style={{ 
        height: '350px', 
        overflow: 'auto', 
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #333'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#4CAF50' }}>Connection Logs:</div>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>No logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '2px',
              padding: '2px 4px',
              backgroundColor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
              borderRadius: '2px'
            }}>
              {log}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '8px', 
        fontSize: '10px', 
        color: '#888',
        borderTop: '1px solid #333',
        paddingTop: '8px'
      }}>
        <div><strong>Usage:</strong></div>
        <div>• Monitor real-time connection status</div>
        <div>• Send test messages to verify connection</div>
        <div>• Check connection health metrics</div>
        <div>• View connection logs for debugging</div>
        <div>• Press Ctrl+Shift+W to toggle this panel</div>
      </div>
    </div>
  );
};

// Optional: Add keyboard shortcut to toggle diagnostic
export const useWebSocketDiagnostic = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + W to toggle diagnostic
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'W') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return { isVisible, setIsVisible };
};