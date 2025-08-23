import React, { useEffect, useState } from 'react';
import './style.css';
import Typewriter from 'typewriter-effect';
import sentences from './sentences';

export const Typewritercomponent: React.FC = () => {
  const [randomSentences, setRandomSentences] = useState<string[]>([]);

  function shuffle(array: string[]): string[] {
    let currentIndex = array.length;
    let temporaryValue: string;
    let randomIndex: number;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  useEffect(() => {
    setRandomSentences(shuffle([...sentences.sentences]));
  }, []);

  return (
    <div id="typewriter">
      <Typewriter
        options={{
          strings: randomSentences,
          autoStart: true,
          loop: true,
          deleteSpeed: 5,
        }}
      />
    </div>
  );
};

export default Typewritercomponent;
