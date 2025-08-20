import React, { createContext, useContext, ReactNode } from 'react';
import { useSocket } from './SocketContext';

interface OnlineStatusContextType {
  onlineUsers: any[]; // TODO: Add proper type for online users
}

interface OnlineStatusProviderProps {
  children: ReactNode;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

export const useOnlineStatus = (): OnlineStatusContextType => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
};

export const OnlineStatusProvider: React.FC<OnlineStatusProviderProps> = ({ children }) => {
  const { onlineUsers } = useSocket();

  const value: OnlineStatusContextType = {
    onlineUsers,
  };

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
};