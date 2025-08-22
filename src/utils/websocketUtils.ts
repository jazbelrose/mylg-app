interface MessageObject {
  action?: string;
  [key: string]: any;
}

export function normalizeMessage(message: any = {}, defaultAction = 'unknown'): MessageObject {
  if (!message || typeof message !== 'object') {
    return { action: defaultAction };
  }
  if (!Object.prototype.hasOwnProperty.call(message, 'action')) {
    return { ...message, action: defaultAction };
  }
  return message;
}

// WebSocket connection monitoring utilities
export interface ConnectionHealth {
  isConnected: boolean;
  lastPing?: string;
  lastPong?: string;
  consecutiveFailures: number;
  connectionDuration: number;
}

export class WebSocketHealthMonitor {
  private health: ConnectionHealth = {
    isConnected: false,
    consecutiveFailures: 0,
    connectionDuration: 0
  };
  private connectionStartTime?: number;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private onHealthChange?: (health: ConnectionHealth) => void) {}

  public onConnect() {
    this.connectionStartTime = Date.now();
    this.health = {
      isConnected: true,
      consecutiveFailures: 0,
      connectionDuration: 0
    };
    this.startHealthCheck();
    this.notifyHealthChange();
  }

  public onDisconnect() {
    this.health.isConnected = false;
    this.health.consecutiveFailures++;
    this.stopHealthCheck();
    this.notifyHealthChange();
  }

  public onPing() {
    this.health.lastPing = new Date().toISOString();
    this.notifyHealthChange();
  }

  public onPong() {
    this.health.lastPong = new Date().toISOString();
    this.health.consecutiveFailures = 0; // Reset failures on successful pong
    this.notifyHealthChange();
  }

  public getHealth(): ConnectionHealth {
    if (this.connectionStartTime && this.health.isConnected) {
      this.health.connectionDuration = Date.now() - this.connectionStartTime;
    }
    return { ...this.health };
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      if (this.connectionStartTime) {
        this.health.connectionDuration = Date.now() - this.connectionStartTime;
        this.notifyHealthChange();
      }
    }, 5000); // Update every 5 seconds
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private notifyHealthChange() {
    if (this.onHealthChange) {
      this.onHealthChange(this.getHealth());
    }
  }

  public destroy() {
    this.stopHealthCheck();
  }
}