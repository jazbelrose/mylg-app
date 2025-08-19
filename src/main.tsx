import './styles/global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import Modal from 'react-modal';
import { ConfigProvider } from 'antd';

import awsConfig from './aws-exports'; // Ensure aws-exports.js exists and is typed
import App from './app/App';

import 'antd/dist/reset.css';
import './index.css';

// ✅ Amplify config
Amplify.configure(awsConfig);

// ✅ Root element typing with non-null assertion (!)
const rootElement = document.getElementById('root')!;
Modal.setAppElement(rootElement);

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
