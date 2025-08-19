import { jsx as _jsx } from "react/jsx-runtime";
// ...existing code from ScrollContext.js...
import React, { createContext, useContext, useRef, useState } from "react";
const ScrollContext = createContext();
export const ScrollProvider = ({ children }) => {
    const scrollableDivRef = useRef(null);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const updateHeaderVisibility = (isVisible) => {
        setIsHeaderVisible(isVisible);
    };
    return (_jsx(ScrollContext.Provider, { value: { isHeaderVisible, updateHeaderVisibility, scrollableDivRef }, children: children }));
};
export const useScrollContext = () => useContext(ScrollContext);
