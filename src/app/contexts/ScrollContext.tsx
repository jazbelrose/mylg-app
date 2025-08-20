import React, { createContext, useContext, useRef, useState, ReactNode, RefObject } from "react";

interface ScrollContextType {
  isHeaderVisible: boolean;
  updateHeaderVisibility: (isVisible: boolean) => void;
  scrollableDivRef: RefObject<HTMLDivElement>;
}

interface ScrollProviderProps {
  children: ReactNode;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<ScrollProviderProps> = ({ children }) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);

  const updateHeaderVisibility = (isVisible: boolean): void => {
    setIsHeaderVisible(isVisible);
  };

  const value: ScrollContextType = {
    isHeaderVisible,
    updateHeaderVisibility,
    scrollableDivRef,
  };

  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScrollContext = (): ScrollContextType => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollContext must be used within a ScrollProvider');
  }
  return context;
};