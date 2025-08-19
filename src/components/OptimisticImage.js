import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
const OptimisticImage = ({ tempUrl, finalUrl, alt, className = '', style = {} }) => {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (!finalUrl)
            return;
        const img = new Image();
        img.src = finalUrl;
        img.onload = () => setLoaded(true);
    }, [finalUrl]);
    return (_jsx("img", { src: loaded && finalUrl ? finalUrl : tempUrl, alt: alt, className: className, style: {
            maxWidth: '100%',
            maxHeight: '100px',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0.7,
            transition: 'opacity 0.3s ease-in-out',
            ...style,
        }, loading: "lazy" }));
};
export default OptimisticImage;
