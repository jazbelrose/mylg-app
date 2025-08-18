import React from 'react';
import Modal from 'react-modal';
import useModalStack from '../utils/useModalStack';

export default function ModalWithStack({ isOpen, ...rest }) {
  useModalStack(isOpen);
  return <Modal isOpen={isOpen} {...rest} />;
}

ModalWithStack.setAppElement = Modal.setAppElement;