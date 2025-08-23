import React, { ComponentProps } from 'react';
import Modal from 'react-modal';
import useModalStack from '../utils/useModalStack';

type ModalWithStackProps = ComponentProps<typeof Modal>;
type ModalWithStackComponent = React.FC<ModalWithStackProps> & {
  setAppElement: typeof Modal.setAppElement;
};

const ModalWithStack: ModalWithStackComponent = ({ isOpen, ...rest }) => {
  useModalStack(isOpen ?? false);
  return <Modal isOpen={isOpen} {...rest} />;
};

ModalWithStack.setAppElement = Modal.setAppElement;

export default ModalWithStack;

