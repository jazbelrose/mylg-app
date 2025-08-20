import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://d2qb21tb4meex0.cloudfront.net/pdfWorker/pdf.worker.js';
const PDFPreview = ({ url, className, title = 'PDF preview' }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const load = async () => {
            if (!url)
                return;
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
        };
        load();
    }, [url]);
    return (_jsx("canvas", { ref: canvasRef, style: { width: '100%' }, className: className, title: title }));
};
export default PDFPreview;
