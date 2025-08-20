import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { ScrambleButton } from "../scramblebutton";
import "./style.css";
export const BlogEntry = ({ post }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (_jsxs("div", { className: "blog-entry", children: [_jsx("hr", { style: {
                    opacity: "1",
                    color: "#fff",
                    height: "2px",
                    backgroundColor: "#fff"
                } }), _jsxs("div", { className: "blog-entry-row", children: [_jsx("div", { className: "blog-entry-date", children: _jsx("span", { children: post.date }) }), _jsx("div", { className: "blog-entry-title", children: _jsx("span", { children: post.title }) }), _jsx("div", { className: "blog-entry-toggle", children: _jsx("button", { onClick: () => setIsOpen(!isOpen), children: "+" }) })] }), isOpen && (_jsxs(_Fragment, { children: [_jsx("p", { className: "blog-entry-description", children: post.description }), _jsx("div", { className: "button-container", children: _jsx(ScrambleButton, { text: "Read More \u2192 ", to: `https://jensenandjuhl.com/blog/${post.slug}.html` }) })] }))] }));
};
