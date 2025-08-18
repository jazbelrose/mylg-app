import React, { useState } from "react";
import { ScrambleButton } from "../scramblebutton";
import "./style.css";

export const BlogEntry = ({ post }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="blog-entry">
      <hr
        style={{
          opacity: "1",
          color: "#fff",
          height: "2px",
          backgroundColor: "#fff"
        }}
      />
      <div className="blog-entry-row">
        <div className="blog-entry-date">
          <span>{post.date}</span>
        </div>
        <div className="blog-entry-title">
          <span>{post.title}</span>
        </div>
        <div className="blog-entry-toggle">
          <button onClick={() => setIsOpen(!isOpen)}>+</button>
        </div>
      </div>
      {isOpen && (
        <>
          <p className="blog-entry-description">{post.description}</p>
          <div className="button-container">
            <ScrambleButton
              text="Read More → "
              to={`https://jensenandjuhl.com/blog/${post.slug}.html`}
            />
          </div>
        </>
      )}
    </div>
  );
};
