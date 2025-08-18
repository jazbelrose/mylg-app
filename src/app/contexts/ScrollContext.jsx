// ...existing code from ScrollContext.js...
import React, { createContext, useContext, useRef, useState } from "react";

const ScrollContext = createContext();

export const ScrollProvider = ({ children }) => {
  const scrollableDivRef = useRef(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const updateHeaderVisibility = (isVisible) => {
    setIsHeaderVisible(isVisible);
  };

  return (
    <ScrollContext.Provider
      value={{ isHeaderVisible, updateHeaderVisibility, scrollableDivRef }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export const useScrollContext = () => useContext(ScrollContext);
