import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import Modal from "react-modal";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { NavigationDirectionProvider } from "./contexts/NavigationDirectionProvider";
import AuthEventHandler from "./contexts/AuthEventHandler";
import { AuthProvider } from "./contexts/AuthContext";
import { UsersProvider } from "./contexts/UsersContext";
import { DataProvider } from "./contexts/DataProvider";
import { ProjectsProvider } from "./contexts/ProjectsContext";
import { MessagesProvider } from "./contexts/MessagesContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { DMConversationProvider } from "./contexts/DMConversationContext";
import { ScrollProvider } from "./contexts/ScrollContext";
import ScrollToTopButton from "../components/scrolltotopbutton";
import { SocketProvider } from "./contexts/SocketContext";
import NotificationSocketBridge from "./NotificationSocketBridge";
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";
import AppRoutes from "./routes";
import Headermain from "../components/header/";
import Preloader from "../components/preloader";
import { NotificationContainer } from "../components/ToastNotifications";
gsap.registerPlugin(ScrollTrigger, useGSAP);
if (typeof document !== "undefined") {
    Modal.setAppElement("#root");
}
export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                setIsLoading(false);
                sessionStorage.setItem("isLoaded", "true"); // Set in session storage that loading has completed
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);
    useEffect(() => {
        const setFavicon = (darkMode) => {
            const link = document.querySelector("link[rel~='icon']");
            if (!link)
                return;
            link.href = darkMode ? "/favicon-light.png" : "/favicon-light.png";
        };
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        setFavicon(mediaQuery.matches);
        const handleChange = (e) => {
            setFavicon(e.matches);
        };
        mediaQuery.addListener(handleChange);
        return () => {
            mediaQuery.removeListener(handleChange);
        };
    }, []);
    return (_jsx(HelmetProvider, { children: _jsx(AuthProvider, { children: _jsx(UsersProvider, { children: _jsx(DataProvider, { children: _jsx(ProjectsProvider, { children: _jsx(MessagesProvider, { children: _jsx(NotificationProvider, { children: _jsx(DMConversationProvider, { children: _jsx(SocketProvider, { children: _jsx(NotificationSocketBridge, { children: _jsx(OnlineStatusProvider, { children: _jsx(ScrollProvider, { children: _jsx(NavigationDirectionProvider, { children: _jsxs(Router, { basename: import.meta.env.BASE_URL, children: [_jsx(AuthEventHandler, {}), _jsx(MainContent, { isLoading: isLoading }), _jsx(NotificationContainer, {})] }) }) }) }) }) }) }) }) }) }) }) }) }) }));
}
function MainContent({ isLoading }) {
    const location = useLocation();
    const hideHeader = location.pathname.startsWith("/dashboard");
    return isLoading ? (_jsx(Preloader, {})) : (_jsxs(_Fragment, { children: [!hideHeader && _jsx(Headermain, {}), _jsx(AppRoutes, {}), _jsx(ScrollToTopButton, {})] }));
}
