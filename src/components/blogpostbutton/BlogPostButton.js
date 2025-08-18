


import React, { useRef } from "react";
import { Link } from "react-router-dom";
import ScrambleText from "scramble-text";
import "./style.css";



const BlogPostButton = ({ post }) => {
    const containerRef = useRef(null);
    let scrambleInstance = null;
  
    const handleMouseEnter = () => {
      const h2Elem = containerRef.current;
      const scrambledElem = h2Elem.querySelector(".scrambled");
      if (scrambledElem && !scrambleInstance) {
        h2Elem.style.width = `${h2Elem.offsetWidth}px`;
  
        scrambleInstance = new ScrambleText(scrambledElem, {
          timeOffset: 12.5,
          chars: ["o", "¦"],
          callback: () => {
            h2Elem.style.width = "auto";
            scrambleInstance = null;
          }
        });
        scrambleInstance.start().play();
      }
    };
  
    return (
      <Link to={`/works/${post.slug}`}>
        <h2
          ref={containerRef}
          className="h2 blog-element"
          onMouseEnter={handleMouseEnter}
        >
          <span className="scrambled">{post.title}</span>
        </h2>
      </Link>
    );
  };
  
  export default BlogPostButton;