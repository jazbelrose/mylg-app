import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NotFound from '../../../components/notfound';
const WorkPost = () => {
    const { workSlug } = useParams();
    const [WorkComponent, setWorkComponent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false); // New error state
    useEffect(() => {
        import(`../allworkposts/${workSlug}.js`)
            .then((module) => {
            setWorkComponent(() => module.default);
            setIsLoading(false);
        })
            .catch((error) => {
            console.error("Component loading failed:", error);
            setLoadError(true); // Set error state if loading fails
            setIsLoading(false);
        });
    }, [workSlug]);
    if (isLoading) {
        return _jsx("div", { children: "Loading..." }); // Show a loading message or spinner
    }
    if (loadError) {
        return _jsx(NotFound, {}); // Render NotFound component on error
    }
    if (!WorkComponent) {
        return _jsx("div", { children: "Error loading component" }); // Additional fallback if needed
    }
    return _jsx(WorkComponent, {});
};
export default WorkPost;
