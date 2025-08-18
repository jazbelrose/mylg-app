import React, { useState, useEffect, useRef } from "react";
import "./style.css";

import introtext from "./introtext.json";
import ScrambleText from "scramble-text";

export const Introtext = () => {
  const [randomIntro, setRandomIntro] = useState("");
  const textRef = useRef(null);

  function shuffle(array) {
    var currentIndex = array.length,
      temporaryValue,
      randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  }

  useEffect(() => {
    shuffle(introtext.introtext);
    setRandomIntro(
      introtext.introtext[
        Math.floor(Math.random() * introtext.introtext.length)
      ]
    );
  }, []);

  useEffect(() => {
    const scrambleText = new ScrambleText(textRef.current, {
      timeOffset: 5,
      chars: ["0", "|"],
      callback: function () {
        console.log("ended");
      }
    });

    scrambleText.start();
  }, [randomIntro]);

  return (
    <div className="introtext">
      <p ref={textRef} className="description">
        {randomIntro}
      </p>
    </div>
  );
};
