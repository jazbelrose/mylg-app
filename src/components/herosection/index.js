import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from "gsap";
import { ScrambleButton } from "../scramblebutton";
import HomeHeader from "../../assets/svg/homeheader.svg?react";
import "./style.css";
export const HeroSection = () => {
    const svgRef = useRef(null);
    useEffect(() => {
        const masterTimeline = gsap.timeline();
        if (svgRef.current) {
            // Animate SVG arrows
            masterTimeline.fromTo(svgRef.current.querySelectorAll('.arrow'), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, delay: 0.1, duration: 0.6, stagger: 0.05, ease: 'Power2.easeOut' });
            // Animate the SVG text
            const svgText = svgRef.current.querySelector('.hero-text');
            if (svgText) {
                masterTimeline.fromTo(svgText, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'Power1.easeOut' }, "-=0.4" // Overlap slightly with arrows
                );
            }
            // Sub-heading animation
            masterTimeline.fromTo('.sub-heading', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.3" // Overlap with previous animations
            );
            // Hero button container animation
            masterTimeline.fromTo('.hero-button-container', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.3" // Overlap slightly with the sub-heading
            );
        }
    }, []);
    return (_jsxs("div", { className: "herosection-container", children: [_jsx("div", { className: "header-section", style: { backgroundColor: '#0c0c0c', maxWidth: '1920px', margin: '0 auto' }, children: _jsx(HomeHeader, { ref: svgRef }) }), _jsx("div", { className: "video-wrapper", style: { maxWidth: '1920px', margin: '0 auto' }, children: _jsxs("div", { className: "info-text", children: [_jsx("h4", { className: "sub-heading", children: "We help you present your ideas digitally and execute them flawlessly in real life." }), _jsx("div", { className: "hero-button-container", children: _jsx(ScrambleButton, { text: "Register \u2192 ", to: "/register" }) })] }) })] }));
};
