import React from 'react';
import styles from './GalleryMasonry.module.css';

const GalleryMasonry = ({ imageUrls = [], onImageClick = () => {} }) => {
  return (
    <div className={styles.masonry} data-testid="gallery-masonry">
      {imageUrls.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`Gallery item ${idx + 1}`}
          className={styles.image}
          onClick={() => onImageClick(idx)}
        />
      ))}
    </div>
  );
};

export default GalleryMasonry;