import React from 'react';
import Spinner from './preloader-light';

const SpinnerScreen: React.FC = () => (
  <div className="dashboard-wrapper welcome-screen" style={{ height: '100vh' }}>
    <Spinner />
  </div>
);

export default SpinnerScreen;