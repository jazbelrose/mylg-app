import React from "react";

export const NavigationDirectionContext = React.createContext();

export const NavigationDirectionProvider = ({ children }) => {
  const [direction, setDirection] = React.useState(null);

  return (
    <NavigationDirectionContext.Provider value={{ direction, setDirection }}>
      {children}
    </NavigationDirectionContext.Provider>
  );
};
