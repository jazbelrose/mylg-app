// PDFPreview.tsx
import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Set the worker (required by pdf.js)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://d2qb21tb4meex0.cloudfront.net/pdfWorker/pdf.worker.js';

type PDFPreviewProps = {
  url: string;
  className?: string;
  title?: string;
  /** Page number to render (1-based). Defaults to 1. */
  page?: number;
  /** Render scale for the canvas. Defaults to 1.5. */
  scale?: number;
};

const PDFPreview: React.FC<PDFPreviewProps> = ({
  url,
  className,
  title = 'PDF preview',
  page = 1,
  scale = 1.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument(url);

    (async () => {
      try {
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const pg = await pdf.getPage(page);
        if (cancelled) return;

        const viewport = pg.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pg.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        // Silently fail; you can surface a toast/log here if desired
        // console.warn('Failed to render PDF preview:', err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        loadingTask.destroy();
      } catch {
        /* noop */
      }
    };
  }, [url, page, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%' }}
      className={className}
      title={title}
    />
  );
};

export default PDFPreview;
