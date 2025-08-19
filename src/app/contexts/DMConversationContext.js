import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState } from 'react';
const DMConversationContext = createContext();
export const DMConversationProvider = ({ children }) => {
    const [activeDmConversationId, setActiveDmConversationId] = useState(null);
    return (_jsx(DMConversationContext.Provider, { value: { activeDmConversationId, setActiveDmConversationId }, children: children }));
};
export const useDMConversation = () => useContext(DMConversationContext);
