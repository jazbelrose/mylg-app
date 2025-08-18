
import React, { useState, useLayoutEffect, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { EmailVerification } from "../pages/auth/Email-verification";
import { EmailChangeVerification } from "../pages/auth/Email-verification/email-change";
import { Forgotpassword } from "../pages/auth/Forgot-password";
import WorkPost from "../pages/works/workpage/WorkPost";
import GalleryPage from "../pages/gallery/GalleryPage";
import { AnimatePresence, motion } from "framer-motion";
import {
  NavigationDirectionContext,
  NavigationDirectionProvider,
} from "./contexts/NavigationDirectionProvider";
import ProtectedRoute from "./contexts/ProtectedRoute";
import { useData } from "../app/contexts/DataProvider";
import NotFound from "../components/notfound";
import TermsAndPrivacy from "../pages/TermsAndPrivacy/TermsAndPrivacy";
import { Home } from "../pages/home";
import { Works } from "../pages/works";
import { About } from "../pages/about";
const Dashboard = React.lazy(() => import("../pages/dashboard"));
const DashboardWelcome = React.lazy(() => import("../pages/dashboard/Welcome"));
const DashboardNewProject = React.lazy(() => import("../pages/dashboard/NewProject"));
const DashboardSingleProject = React.lazy(() => import("../pages/dashboard/SingleProject"));
const DashboardBudgetPage = React.lazy(() => import("../pages/dashboard/BudgetPage"));
const DashboardCalendarPage = React.lazy(() => import("../pages/dashboard/CalendarPage"));
const DashboardDesignerPage = React.lazy(() => import("../pages/dashboard/DesignerPage"));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const { opacity, setOpacity } = useData();
  const opacityClass = opacity === 1 ? "opacity-low" : "opacity-high";
  const [prevPathname, setPrevPathname] = useState("");
  const blogPostRouteRegex = /^\/blog\/[^/]+$/;
  const dmRouteRegex = /^\/dashboard(?:\/welcome)?\/messages\/[^/]+$/;

  useLayoutEffect(() => {
    const isBlogPost = blogPostRouteRegex.test(pathname);
    const wasBlogPost = blogPostRouteRegex.test(prevPathname);
    const isDM = dmRouteRegex.test(pathname);
    const wasDM = dmRouteRegex.test(prevPathname);
    const stayingInDashboard =
      pathname.startsWith("/dashboard") &&
      prevPathname.startsWith("/dashboard");

    const shouldAnimate =
      !isBlogPost && !wasBlogPost && !isDM && !wasDM && !stayingInDashboard;

    let timer;
    if (shouldAnimate) {
      setOpacity(0);
      window.scrollTo(0, 0);
      timer = setTimeout(() => {
        setOpacity(1);
      }, 300);
    } else {
      setOpacity(1);
    }

    setPrevPathname(pathname);

    return () => {
      clearTimeout(timer);
      if (shouldAnimate) {
        setOpacity(0);
      }
    };
  }, [pathname, setOpacity]);

  return <div className={`page-fade ${opacityClass}`} />;
};

const pageVariants = {
  initial: { opacity: 0, y: "100vh" }, // changed from 100vw to 100vh
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: "100vh" }, // changed from -100vw to -100vh
};

// ...existing code...
