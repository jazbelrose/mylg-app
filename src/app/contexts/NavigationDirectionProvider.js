import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export const NavigationDirectionContext = React.createContext();
export const NavigationDirectionProvider = ({ children }) => {
    const [direction, setDirection] = React.useState(null);
    return (_jsx(NavigationDirectionContext.Provider, { value: { direction, setDirection }, children: children }));
};
