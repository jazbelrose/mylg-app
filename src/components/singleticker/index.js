import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import gsap from 'gsap';
import "./style.css";
import tickerData from '../typewriter/sentences.json';
const SingleTicker = () => {
    useEffect(() => {
        gsap.set(".single-ticker-text", { x: "0%" }); // This sets the starting position
        const ticker = gsap.to(".single-ticker-text", {
            x: "-100%", // Adjust based on your preference
            duration: 5000,
            repeat: -1,
            ease: "linear",
            paused: true
        });
        ticker.play();
        return () => {
            ticker.kill();
        };
    }, []);
    return (_jsx("div", { className: "single-ticker-container", children: _jsx("div", { className: "single-ticker", children: _jsx("span", { className: "single-ticker-text", children: tickerData.sentences.join(' ') }) }) }));
};
export default SingleTicker;
