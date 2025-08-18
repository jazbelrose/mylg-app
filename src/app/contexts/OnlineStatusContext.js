import React, { createContext, useContext } from 'react';
import { useSocket } from './SocketContext';


const OnlineStatusContext = createContext();
export const useOnlineStatus = () => useContext(OnlineStatusContext);

export const OnlineStatusProvider = ({ children }) => {
  const { onlineUsers } = useSocket();
  return (
    <OnlineStatusContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineStatusContext.Provider>
  );
};