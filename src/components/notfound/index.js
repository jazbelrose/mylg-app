import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/NotFound.js
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useData } from "../../app/contexts/DataProvider";
import "./NotFound.css";
import ScrambleButton from "../scramblebutton"; // Import the ScrambleButton component
const NotFound = () => {
    const { opacity } = useData();
    const opacityClass = opacity === 1 ? "opacity-high" : "opacity-low";
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);
    return (_jsx("div", { className: `not-found-container ${opacityClass}`, children: _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.5 }, className: "not-found-content", children: [_jsx("h1", { className: "not-found-heading", children: "404" }), _jsx("p", { className: "not-found-subheading", children: "The page you are looking for does not exist :(" }), _jsx(Link, { to: "/", className: "not-found-link", children: _jsx(ScrambleButton, { text: "Go Back Home" }) })] }) }));
};
export default NotFound;
