import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext({
  opacity: 0,
  setOpacity: () => {},
});

export const UIProvider = ({ children }) => {
  const [opacity, setOpacity] = useState(0);
  return _jsx(UIContext.Provider, { value: { opacity, setOpacity }, children: children });
};

export const useUI = () => useContext(UIContext);

export default UIContext;
