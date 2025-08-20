import React, { createContext, useState, ReactNode } from "react";

type NavigationDirection = string | null;

interface NavigationDirectionContextType {
  direction: NavigationDirection;
  setDirection: (direction: NavigationDirection) => void;
}

interface NavigationDirectionProviderProps {
  children: ReactNode;
}

export const NavigationDirectionContext = createContext<NavigationDirectionContextType | undefined>(undefined);

export const NavigationDirectionProvider: React.FC<NavigationDirectionProviderProps> = ({ children }) => {
  const [direction, setDirection] = useState<NavigationDirection>(null);

  const value: NavigationDirectionContextType = {
    direction,
    setDirection,
  };

  return (
    <NavigationDirectionContext.Provider value={value}>
      {children}
    </NavigationDirectionContext.Provider>
  );
};