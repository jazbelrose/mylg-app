import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import Modal from 'react-modal';
import useModalStack from '../utils/useModalStack';
export default function ModalWithStack({ isOpen, ...rest }) {
    useModalStack(isOpen);
    return _jsx(Modal, { isOpen: isOpen, ...rest });
}
ModalWithStack.setAppElement = Modal.setAppElement;
