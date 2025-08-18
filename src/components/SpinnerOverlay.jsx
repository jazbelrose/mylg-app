import React from 'react';
import Spinner from './preloader-light';
import './spinner-overlay.css';

const SpinnerOverlay = ({ className = '', style = {}, spinnerStyle = {} }) => (
  <div className={`spinner-overlay ${className}`} style={style}>
    <Spinner style={{ position: 'static', ...spinnerStyle }} />
  </div>
);

export default SpinnerOverlay;