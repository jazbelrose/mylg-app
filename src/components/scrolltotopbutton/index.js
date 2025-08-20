import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from "react";
const ScrollToTopButton = ({ scrollableDivRef = null }) => {
    const [isVisible, setIsVisible] = useState(false);
    const prevScrollPos = useRef(0);
    const handleScroll = () => {
        const scrollTarget = scrollableDivRef?.current || document.documentElement;
        const scrollTop = scrollableDivRef?.current
            ? scrollableDivRef.current.scrollTop
            : window.scrollY || document.documentElement.scrollTop;
        const isScrollingUp = scrollTop < prevScrollPos.current;
        setIsVisible(scrollTop > 200 && isScrollingUp);
        prevScrollPos.current = scrollTop;
    };
    const handleScrollToTop = () => {
        if (scrollableDivRef?.current) {
            scrollableDivRef.current.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
        else {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
        // Show the header and hide the button after scroll
        setTimeout(() => {
            setIsVisible(false);
        }, 500);
    };
    useEffect(() => {
        const scrollContainer = scrollableDivRef?.current || window;
        const debouncedHandleScroll = () => {
            requestAnimationFrame(handleScroll);
        };
        scrollContainer.addEventListener("scroll", debouncedHandleScroll);
        return () => {
            scrollContainer.removeEventListener("scroll", debouncedHandleScroll);
        };
    }, [scrollableDivRef]);
    return (_jsx("button", { onClick: handleScrollToTop, style: {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "10px 15px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            border: "2px solid #fff",
            borderRadius: "50%",
            cursor: "pointer",
            zIndex: 1001,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? "auto" : "none",
            transition: "opacity 0.5s ease, transform 0.3s ease",
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            willChange: "transform, opacity",
        }, "aria-label": "Scroll to top", children: "\u2191" }));
};
export default ScrollToTopButton;
