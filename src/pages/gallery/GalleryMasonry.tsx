import type { FC } from 'react';

import styles from './GalleryMasonry.module.css';

interface GalleryMasonryProps {
  imageUrls?: string[];
  onImageClick?: (index: number) => void;
}

const GalleryMasonry: FC<GalleryMasonryProps> = ({
  imageUrls = [],
  onImageClick = () => {},
}) => (
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

export default GalleryMasonry;

