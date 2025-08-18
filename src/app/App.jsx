import React, { useState, useEffect } from "react";
import {HelmetProvider } from "react-helmet-async";
import Modal from "react-modal";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { NavigationDirectionProvider } from "./contexts/NavigationDirectionProvider";
import AuthEventHandler from "./contexts/AuthEventHandler";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataProvider";
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
      if (!link) return;

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

  return (
    <HelmetProvider>
      <AuthProvider>
        <DataProvider>
          <NotificationProvider>
            <DMConversationProvider>
              <SocketProvider>
                <NotificationSocketBridge>
                  <OnlineStatusProvider>
                    <ScrollProvider>
                      <NavigationDirectionProvider>
                        <Router basename={import.meta.env.BASE_URL}>
                          <AuthEventHandler />

                          <MainContent isLoading={isLoading} />
                          <NotificationContainer />
                        </Router>
                      </NavigationDirectionProvider>
                    </ScrollProvider>
                  </OnlineStatusProvider>
                </NotificationSocketBridge>
              </SocketProvider>
            </DMConversationProvider>
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

function MainContent({ isLoading }) {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith("/dashboard");

  return isLoading ? (
    <Preloader />
  ) : (
    <>
      {!hideHeader && <Headermain />}

      <AppRoutes />
      <ScrollToTopButton />
    </>
  );
}
