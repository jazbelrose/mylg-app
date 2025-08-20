import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import "./style.css";
import { Introtext } from "../introtext";
import { ScrambleButton } from "../scramblebutton";
import Snap from "../../assets/svg/snap.svg?react";
import { NEWSLETTER_SUBSCRIBE_URL, apiFetch } from "../../utils/api";
export const InfoSection = ({ style }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const handleNewsletterSignup = async (e) => {
        e.preventDefault();
        const email = e.target.elements.email.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }
        const url = NEWSLETTER_SUBSCRIBE_URL;
        const userData = {
            email,
        };
        setIsLoading(true);
        setIsSubscribed(false);
        try {
            const response = await apiFetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });
            if (!response.ok) {
                throw new Error(`Failed with status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Subscription successful", data);
            setIsSubscribed(true);
            // Reset the form fields
            e.target.reset();
            // Automatically reset the button state after 3 seconds
            setTimeout(() => {
                setIsSubscribed(false);
            }, 3000);
        }
        catch (error) {
            console.error("Newsletter signup error:", error);
            alert("There was an error with your subscription. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "info-section", style: style, children: [_jsx("div", { className: "info-column first-column", children: _jsxs("div", { className: "content-container", children: [_jsx("div", { className: "info-club", children: _jsx("h3", { className: "club-title", children: "JOIN THE CLUB" }) }), _jsx("p", { className: "club-description", children: "READY TO PITCH A GAME-CHANGER OR TAKE OVER THE WORLD? WE'RE THE JAM TO YOUR TOAST!" }), _jsxs("form", { className: "newsletter", onSubmit: handleNewsletterSignup, children: [_jsx("input", { className: "email-input", type: "email", name: "email", placeholder: "Your Email Address", "aria-label": "Email Address" }), _jsx(ScrambleButton, { className: "touch-btn-subscribe", submitMode: true, disabled: isLoading || isSubscribed, text: isSubscribed ? (_jsx("span", { className: "checkmark", children: "\u2714" })) : isLoading ? (_jsxs("div", { className: "dot-spinner", children: [_jsx("div", {}), _jsx("div", {}), _jsx("div", {})] })) : ("Subscribe") })] })] }) }), _jsxs("div", { className: "info-column second-column", children: [_jsx("div", { className: "info-introtext", children: _jsx(Introtext, {}) }), _jsx(ScrambleButton, { text: "Get in Touch \u2192", to: "mailto:info@mylg.studio.com", className: "touch-btn" })] }), _jsx("div", { className: "info-column third-column", children: _jsx("div", { className: "content-container", children: _jsxs("div", { className: "info-address", children: [_jsxs("p", { className: "address-text", children: ["400 S Broadway", _jsx("br", {}), "LOS ANGELES", _jsx("br", {}), "17 rue Barrault", _jsx("br", {}), "PARIS", _jsx("br", {}), _jsx("span", { className: "phone-number", children: "+1 310.002.4217" })] }), _jsx(Snap, { className: "address-svg" })] }) }) })] }));
};
