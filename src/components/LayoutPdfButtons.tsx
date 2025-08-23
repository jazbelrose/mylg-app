import React from 'react';
import { LayoutGrid, FileDown } from 'lucide-react';
import styles from './LayoutPdfButtons.module.css';

interface LayoutPdfButtonsProps {
  useMasonryLayout?: boolean;
  onToggleLayout?: () => void;
  downloadUrl?: string;
  isPdf?: boolean;
  className?: string;
}

const LayoutPdfButtons: React.FC<LayoutPdfButtonsProps> = ({
  useMasonryLayout = false,
  onToggleLayout = () => {},
  downloadUrl = '',
  isPdf = true,
  className = '',
}) => (
  <div className={`${styles.container} ${className}`.trim()}>
    <button
      type="button"
      onClick={onToggleLayout}
      className={styles.actionButton}
    >
      <LayoutGrid size={16} />
      <span>{useMasonryLayout ? 'Grid Layout' : 'Masonry Layout'}</span>
    </button>
    {downloadUrl && (
      <a href={downloadUrl} download className={styles.actionButton}>
        <FileDown size={16} />
        <span>{isPdf ? 'Download PDF' : 'Download SVG'}</span>
      </a>
    )}
  </div>
);

export default LayoutPdfButtons;

