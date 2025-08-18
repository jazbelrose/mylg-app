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
        } catch (error) {
            console.error("Newsletter signup error:", error);
            alert("There was an error with your subscription. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="info-section" style={style}>
            <div className="info-column first-column">
                <div className="content-container">
                    <div className="info-club">
                        <h3 className="club-title">JOIN THE CLUB</h3>
                    </div>
                    <p className="club-description">
                        READY TO PITCH A GAME-CHANGER OR TAKE OVER THE WORLD? WE'RE THE JAM TO
                        YOUR TOAST!
                    </p>
                    <form className="newsletter" onSubmit={handleNewsletterSignup}>
                        <input
                            className="email-input"
                            type="email"
                            name="email"
                            placeholder="Your Email Address"
                            aria-label="Email Address"
                        />
                        <ScrambleButton
                            className="touch-btn-subscribe"
                            submitMode={true}
                            disabled={isLoading || isSubscribed}
                            text={
                                isSubscribed ? (
                                    <span className="checkmark">✔</span>
                                ) : isLoading ? (
                                    <div className="dot-spinner">
                                        <div></div>
                                        <div></div>
                                        <div></div>
                                    </div>
                                ) : (
                                    "Subscribe"
                                )
                            }
                        />
                    </form>
                </div>
            </div>
            <div className="info-column second-column">
                <div className="info-introtext">
                    <Introtext />
                </div>
                <ScrambleButton
    text="Get in Touch →"
    to="mailto:info@mylg.studio.com"
    className="touch-btn"
/>

            </div>
            <div className="info-column third-column">
                <div className="content-container">
                    <div className="info-address">
                        <p className="address-text">
                            400 S Broadway<br />
                            LOS ANGELES<br />
                            17 rue Barrault<br />
                            PARIS<br />
                            <span className="phone-number">+1 310.002.4217</span>
                        </p>
                        <Snap className="address-svg" />
                    </div>
                </div>
            </div>
        </div>
    );
};
