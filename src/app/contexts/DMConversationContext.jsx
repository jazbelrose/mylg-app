import React, { createContext, useContext, useState } from 'react';

const DMConversationContext = createContext();

export const DMConversationProvider = ({ children }) => {
  const [activeDmConversationId, setActiveDmConversationId] = useState(null);
  return (
    <DMConversationContext.Provider value={{ activeDmConversationId, setActiveDmConversationId }}>
      {children}
    </DMConversationContext.Provider>
  );
};

export const useDMConversation = () => useContext(DMConversationContext);