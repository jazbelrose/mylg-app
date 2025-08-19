import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext } from 'react';
import { useSocket } from './SocketContext';
const OnlineStatusContext = createContext();
export const useOnlineStatus = () => useContext(OnlineStatusContext);
export const OnlineStatusProvider = ({ children }) => {
    const { onlineUsers } = useSocket();
    return (_jsx(OnlineStatusContext.Provider, { value: { onlineUsers }, children: children }));
};
