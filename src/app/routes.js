import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { NavigationDirectionContext, NavigationDirectionProvider, } from "./contexts/NavigationDirectionProvider";
import ProtectedRoute from "./contexts/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useData } from "../app/contexts/DataProvider";
import NotFound from "../components/notfound";
import TermsAndPrivacy from "../pages/TermsAndPrivacy/TermsAndPrivacy";
import { Home } from "../pages/home";
import { Works } from "../pages/works";
import { About } from "../pages/about";
import Spinner from "../components/preloader-light";
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
        const stayingInDashboard = pathname.startsWith("/dashboard") &&
            prevPathname.startsWith("/dashboard");
        const shouldAnimate = !isBlogPost && !wasBlogPost && !isDM && !wasDM && !stayingInDashboard;
        let timer;
        if (shouldAnimate) {
            setOpacity(0);
            window.scrollTo(0, 0);
            timer = setTimeout(() => {
                setOpacity(1);
            }, 300);
        }
        else {
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
    return _jsx("div", { className: `page-fade ${opacityClass}` });
};
const pageVariants = {
    initial: { opacity: 0, y: "100vh" }, // changed from 100vw to 100vh
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: "100vh" }, // changed from -100vw to -100vh
};
const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 1,
};
function AppRoutes() {
    const location = useLocation();
    return (_jsx(ErrorBoundary, { children: _jsx(Suspense, { fallback: _jsx(Spinner, {}), children: _jsxs(NavigationDirectionProvider, { children: [_jsx(ScrollToTop, {}), _jsx(ActualRoutes, { location: location })] }) }) }));
}
const ActualRoutes = ({ location }) => {
    const { direction } = React.useContext(NavigationDirectionContext);
    const chosenDirection = direction === "left" ? "left" : "right";
    return (_jsx(AnimatePresence, { mode: "wait", children: _jsxs(Routes, { location: location, children: [_jsx(Route, { path: "/", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(Home, {}) }) }), _jsx(Route, { path: "/about", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(About, {}) }) }), _jsx(Route, { path: "/works", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(Works, {}) }) }), _jsx(Route, { path: "/works/:workSlug", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(WorkPost, {}) }) }), _jsx(Route, { path: "/gallery/:projectSlug/:gallerySlug", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(GalleryPage, {}) }) }), _jsxs(Route, { path: "/dashboard/*", element: _jsx(ProtectedRoute, { children: _jsx(Dashboard, {}) }), children: [_jsx(Route, { path: "projects/:projectSlug", element: _jsx(DashboardSingleProject, {}) }), _jsx(Route, { path: "projects/:projectSlug/budget", element: _jsx(DashboardBudgetPage, {}) }), _jsx(Route, { path: "projects/:projectSlug/calendar", element: _jsx(DashboardCalendarPage, {}) }), _jsx(Route, { path: "projects/:projectSlug/designer", element: _jsx(DashboardDesignerPage, {}) }), _jsx(Route, { path: "new", element: _jsx(DashboardNewProject, {}) }), _jsx(Route, { path: "welcome/*", element: _jsx(Navigate, { to: "..", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(DashboardWelcome, {}) })] }), _jsx(Route, { path: "/login", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(Login, {}) }) }), _jsx(Route, { path: "/register", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(Register, {}) }) }), _jsx(Route, { path: "/email-verification", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(EmailVerification, {}) }) }), _jsx(Route, { path: "/email-change-verification", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(EmailChangeVerification, {}) }) }), _jsx(Route, { path: "/forgot-password", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(Forgotpassword, {}) }) }), _jsx(Route, { path: "/terms-and-privacy", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(TermsAndPrivacy, {}) }) }), _jsx(Route, { path: "*", element: _jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, children: _jsx(NotFound, {}) }) })] }, location.pathname) }));
};
export default AppRoutes;
