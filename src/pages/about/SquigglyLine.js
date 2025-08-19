import { jsx as _jsx } from "react/jsx-runtime";
import React, { useRef } from "react";
import "./style.css";
const SquigglyLine = () => {
    const lineRef = useRef(null);
    const handleTouchStart = () => {
        lineRef.current.classList.add("animate-on-touch");
    };
    const handleTouchEnd = () => {
        lineRef.current.classList.remove("animate-on-touch");
    };
    return (_jsx("div", { className: "squiggle-container", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 1000 10", children: _jsx("line", { id: "squiggle-line", x1: "0", y1: "5", x2: "1000", y2: "5", stroke: "black", strokeWidth: "2", ref: lineRef, onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd }) }) }));
};
export default SquigglyLine;
