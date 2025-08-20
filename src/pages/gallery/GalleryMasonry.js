import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import styles from './GalleryMasonry.module.css';
const GalleryMasonry = ({ imageUrls = [], onImageClick = () => { } }) => {
    return (_jsx("div", { className: styles.masonry, "data-testid": "gallery-masonry", children: imageUrls.map((src, idx) => (_jsx("img", { src: src, alt: `Gallery item ${idx + 1}`, className: styles.image, onClick: () => onImageClick(idx) }, idx))) }));
};
export default GalleryMasonry;
