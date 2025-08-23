import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface DMConversationContextValue {
  activeDmConversationId: string | null;
  setActiveDmConversationId: Dispatch<SetStateAction<string | null>>;
}

const DMConversationContext = createContext<DMConversationContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export const DMConversationProvider: React.FC<ProviderProps> = ({ children }) => {
  const [activeDmConversationId, setActiveDmConversationId] = useState<string | null>(null);

  return (
    <DMConversationContext.Provider value={{ activeDmConversationId, setActiveDmConversationId }}>
      {children}
    </DMConversationContext.Provider>
  );
};

export const useDMConversation = (): DMConversationContextValue => {
  const context = useContext(DMConversationContext);
  if (!context) {
    throw new Error('useDMConversation must be used within DMConversationProvider');
  }
  return context;
};

export default DMConversationContext;
