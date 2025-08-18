import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScrambleText from "scramble-text";
import "./style.css";

export const ScrambleButton = ({
  text,
  to,
  className = "",
  submitMode,
  fontSize,
  padding, // ✅ Accept padding as a prop
  ...props
}) => {
  const btnRef = useRef(null);
  const isHoveredRef = useRef(false);
  const [originalColor, setOriginalColor] = useState(null);
  let scrambleInstance = null;

  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const buttonType = submitMode ? "submit" : "button";

  const handleMouseEnter = () => {
    if (isTouchDevice && buttonType === "submit") return;

    isHoveredRef.current = true;
    const btnElem = btnRef.current;
    const scrambledElem = btnElem.querySelector(".scrambled");

    if (scrambledElem && !scrambleInstance) {
      btnElem.style.width = `${btnElem.offsetWidth}px`;

      scrambleInstance = new ScrambleText(scrambledElem, {
        timeOffset: 12.5,
        chars: ["o", "¦"],
        callback: () => {
          // After scrambling, set color to white for readability
          scrambledElem.style.color = "#fff";
          scrambleInstance = null;
        },
      });

      scrambleInstance.start().play();
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    const scrambledElem = btnRef.current.querySelector(".scrambled");
    if (scrambledElem) {
      scrambledElem.style.color = originalColor || "var(--text-color)";
    }
  };

  useEffect(() => {
    const scrambledElem = btnRef.current.querySelector(".scrambled");
    if (scrambledElem) {
      setOriginalColor(getComputedStyle(scrambledElem).color);
    }

    const handleResize = () => {
      const btnElem = btnRef.current;
      if (btnElem) {
        btnElem.style.width = "auto";
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const { style: propStyle, ...restProps } = props;

  const buttonElem = (
    <button
      ref={btnRef}
      type={buttonType}
      className={`scramble-button ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        fontSize,
        padding,
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        boxSizing: "border-box",
        ...propStyle,
      }}
      {...restProps}
    >
      <span className="scrambled">{text}</span>
    </button>
  );

  if (to && !submitMode) {
    return <Link to={to}>{buttonElem}</Link>;
  }

  return buttonElem;
};


export default ScrambleButton;
