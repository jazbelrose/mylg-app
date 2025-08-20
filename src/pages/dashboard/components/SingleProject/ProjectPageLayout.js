import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import ProjectMessagesThread from "./ProjectMessagesThread";
import ChatPanel from "./ChatPanel";
const ProjectPageLayout = ({ projectId, header, children }) => {
    const projectHeaderRef = useRef(null);
    const layoutRef = useRef(null);
    const resizingRef = useRef(false);
    const [threadWidth, setThreadWidth] = useState(350);
    const [headerHeights, setHeaderHeights] = useState({ global: 0, project: 0 });
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
    const [floatingThread, setFloatingThread] = useState(() => {
        if (typeof window === "undefined")
            return false;
        try {
            const stored = localStorage.getItem("chatPanelFloating");
            return stored ? stored === "true" : false;
        }
        catch {
            return false;
        }
    });
    useLayoutEffect(() => {
        const updateHeights = () => {
            const navBar = document.querySelector('header.header .nav-bar');
            const globalHeight = navBar ? navBar.getBoundingClientRect().height : 0;
            const projectHeight = projectHeaderRef.current
                ? projectHeaderRef.current.getBoundingClientRect().height
                : 0;
            setHeaderHeights({ global: globalHeight, project: projectHeight });
        };
        updateHeights();
        window.addEventListener("resize", updateHeights);
        return () => window.removeEventListener("resize", updateHeights);
    }, []);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    useEffect(() => {
        const handleMove = (e) => {
            if (!resizingRef.current || !layoutRef.current)
                return;
            const rect = layoutRef.current.getBoundingClientRect();
            let newWidth = rect.right - e.clientX;
            const MIN = 350;
            const MAX = 800;
            newWidth = Math.min(MAX, Math.max(MIN, newWidth));
            setThreadWidth(newWidth);
        };
        const stopResize = () => {
            resizingRef.current = false;
        };
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", stopResize);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", stopResize);
        };
    }, []);
    useEffect(() => {
        if (typeof window === "undefined")
            return;
        try {
            localStorage.setItem("chatPanelFloating", floatingThread ? "true" : "false");
        }
        catch {
            /* ignore write errors */
        }
    }, [floatingThread]);
    const startResize = (e) => {
        e.preventDefault();
        resizingRef.current = true;
    };
    return (_jsxs("div", { className: "dashboard-wrapper active-project-details", children: [_jsx("div", { ref: projectHeaderRef, style: { position: "sticky", top: 0, zIndex: 5, backgroundColor: "#0c0c0c" }, children: header }), _jsxs("div", { className: "dashboard-layout", ref: layoutRef, style: {
                    height: `calc(100vh - ${headerHeights.global + headerHeights.project}px)`,
                    flexDirection: isMobile ? "column" : "row",
                    overflow: "hidden",
                }, children: [_jsx("div", { style: {
                            flex: 1,
                            minWidth: 0,
                            minHeight: 0,
                            overflow: "auto",
                        }, children: children }), !floatingThread && (_jsxs(_Fragment, { children: [!isMobile && (_jsx("div", { className: "thread-resizer", onMouseDown: startResize })), _jsx("div", { style: {
                                    flex: isMobile ? 1 : `0 0 ${threadWidth}px`,
                                    width: isMobile ? "100%" : threadWidth,
                                    minWidth: isMobile ? "auto" : 300,
                                    maxWidth: isMobile ? "none" : 800,
                                    height: "100%",
                                    minHeight: 0,
                                }, children: _jsx(ProjectMessagesThread, { projectId: projectId, open: true, setOpen: () => { }, floating: false, setFloating: setFloatingThread, startDrag: () => { }, headerOffset: headerHeights.global + headerHeights.project }) })] }))] }), floatingThread && (_jsx(ChatPanel, { projectId: projectId, initialFloating: true, onFloatingChange: setFloatingThread }))] }));
};
export default ProjectPageLayout;
