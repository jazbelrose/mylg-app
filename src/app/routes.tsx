import React, { useState, useLayoutEffect, Suspense, useContext } from "react";
import { Routes, Route, Navigate, useLocation, Location } from "react-router-dom";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { EmailVerification } from "../pages/auth/Email-verification";
import { EmailChangeVerification } from "../pages/auth/Email-verification/email-change";
import { Forgotpassword } from "../pages/auth/Forgot-password";
import WorkPost from "../pages/works/workpage/WorkPost";
import GalleryPage from "../pages/gallery/GalleryPage";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { NavigationDirectionContext } from "./contexts/NavigationDirectionProvider";
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

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const { opacity, setOpacity } = useData();
  const opacityClass = opacity === 1 ? "opacity-low" : "opacity-high";
  const [prevPathname, setPrevPathname] = useState<string>("");
  
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
    
    let timer: NodeJS.Timeout;
    
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
  }, [pathname, setOpacity, prevPathname]);
  
  return <div className={`page-fade ${opacityClass}`} />;
};

const pageVariants: Variants = {
  initial: { opacity: 0, y: "100vh" }, // changed from 100vw to 100vh
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: "100vh" }, // changed from -100vw to -100vh
};

const pageTransition = {
  type: "tween" as const,
  ease: "anticipate",
  duration: 1,
};

function AppRoutes(): React.ReactElement {
  const location = useLocation();
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <ScrollToTop />
        <ActualRoutes location={location} />
      </Suspense>
    </ErrorBoundary>
  );
}

interface ActualRoutesProps {
  location: Location;
}

const ActualRoutes: React.FC<ActualRoutesProps> = ({ location }) => {
  const context = useContext(NavigationDirectionContext);
  const direction = context?.direction;
  const chosenDirection = direction === "left" ? "left" : "right";
  
  return (
    <AnimatePresence mode="wait">
      <Routes key={location.pathname} location={location}>
        <Route 
          path="/" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Home />
            </motion.div>
          } 
        />
        
        <Route 
          path="/about" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <About />
            </motion.div>
          } 
        />
        
        <Route 
          path="/works" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Works />
            </motion.div>
          } 
        />
        
        <Route 
          path="/works/:workSlug" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <WorkPost />
            </motion.div>
          } 
        />
        
        <Route 
          path="/gallery/:projectSlug/:gallerySlug" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <GalleryPage />
            </motion.div>
          } 
        />
        
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route path="projects/:projectSlug" element={<DashboardSingleProject />} />
          <Route path="projects/:projectSlug/budget" element={<DashboardBudgetPage />} />
          <Route path="projects/:projectSlug/calendar" element={<DashboardCalendarPage />} />
          <Route path="projects/:projectSlug/designer" element={<DashboardDesignerPage />} />
          <Route path="new" element={<DashboardNewProject />} />
          <Route path="welcome/*" element={<Navigate to=".." replace />} />
          <Route path="*" element={<DashboardWelcome />} />
        </Route>
        
        <Route 
          path="/login" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Login />
            </motion.div>
          } 
        />
        
        <Route 
          path="/register" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Register />
            </motion.div>
          } 
        />
        
        <Route 
          path="/email-verification" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <EmailVerification />
            </motion.div>
          } 
        />
        
        <Route 
          path="/email-change-verification" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <EmailChangeVerification />
            </motion.div>
          } 
        />
        
        <Route 
          path="/forgot-password" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Forgotpassword />
            </motion.div>
          } 
        />
        
        <Route 
          path="/terms-and-privacy" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <TermsAndPrivacy />
            </motion.div>
          } 
        />
        
        <Route 
          path="*" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <NotFound />
            </motion.div>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;