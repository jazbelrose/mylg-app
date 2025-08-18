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

  return (
    <div className="squiggle-container">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 10">
        <line id="squiggle-line" x1="0" y1="5" x2="1000" y2="5" stroke="black" strokeWidth="2" ref={lineRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
      </svg>
    </div>
  );
};

export default SquigglyLine;
