import React from 'react';
import ReactDOM from "react-dom/client";
import { Amplify } from 'aws-amplify';
import Modal from 'react-modal';
import { ConfigProvider } from 'antd';

import awsConfig from './aws-exports'; // Adjust the path as necessary
import App from './app/App';
import 'antd/dist/reset.css';
import './index.css';

import './components/preloader/style.css';

// Configure Amplify with your AWS configurations
Amplify.configure(awsConfig);

const root = ReactDOM.createRoot(document.getElementById("root"));
Modal.setAppElement(document.getElementById('root'));
root.render(
  <ConfigProvider>
    <App />
  </ConfigProvider>
);
