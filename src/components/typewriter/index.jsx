import React, { useState, useEffect, useRef } from "react";
import "./style.css";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Typewriter from "typewriter-effect";

import sentences from "./sentences.json";

export const Typewritercomponent = () => {
  const [randomSentences, setRandomSentences] = useState([]);

  // Shuffle function
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
    return array;
  }

  useEffect(() => {
    setRandomSentences(shuffle(sentences.sentences));
  }, []);

  return (
    <div id="typewriter">
      <Typewriter
        options={{
          strings: randomSentences,
          autoStart: true,
          loop: true,
          deleteSpeed: 5
        }}
      />
    </div>
  );
};
