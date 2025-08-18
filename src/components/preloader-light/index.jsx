import React from 'react';
import './spinner.css'; // Adjust the path if necessary

const Spinner = ({ className = "", style = {} }) => {
  return (
    <div className={`spinner-container ${className}`} style={style}>
      <div className="spin"></div>
    </div>
  );
};

export default Spinner;
