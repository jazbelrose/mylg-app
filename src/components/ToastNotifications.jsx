import React from 'react';
import { ToastContainer, toast, Slide } from 'react-toastify';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import styles from './Notification.module.css';
import 'react-toastify/dist/ReactToastify.css';

const icons = {
  success: <FaCheckCircle />, 
  error: <FaTimesCircle />, 
  info: <FaInfoCircle />, 
  warning: <FaExclamationTriangle />, 
};

const TOAST_CONTAINER_ID = 'global';

export const notify = (type, message) => {
  toast.dismiss();
  return toast(message, {
    type,
    icon: icons[type],
    className: styles.toast,
    containerId: TOAST_CONTAINER_ID,
  });
};

export const notifyLoading = (message) => {
  toast.dismiss();
  return toast.loading(message, {
    className: styles.toast,
    containerId: TOAST_CONTAINER_ID,
  });
};

export const updateNotification = (id, type, message) => {
  toast.update(id, {
    render: message,
    type,
    icon: icons[type],
    className: styles.toast,
    isLoading: false,
    autoClose: 3000,
    containerId: TOAST_CONTAINER_ID,
  });
};

export const NotificationContainer = () => (
  <ToastContainer
    containerId={TOAST_CONTAINER_ID}
    position="top-center"
    autoClose={3000}
    hideProgressBar
    closeButton={false}
    newestOnTop
    limit={1}
    draggable={false}
    pauseOnHover
    transition={Slide}
    toastClassName={styles.toast}
    bodyClassName={styles.body}
    style={{ zIndex: 1000000, top: '80px' }}
  />
);

export default NotificationContainer;