import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import Spinner from './preloader-light';
const SpinnerScreen = () => (_jsx("div", { className: "dashboard-wrapper welcome-screen", style: { height: '100vh' }, children: _jsx(Spinner, {}) }));
export default SpinnerScreen;
