import React from 'react';
import Spinner from './preloader-light';

const SpinnerScreen = () => (
  <div className="dashboard-wrapper welcome-screen" style={{ height: '100vh' }}>
    <Spinner />
  </div>
);

export default SpinnerScreen;