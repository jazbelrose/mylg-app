import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useData } from "@/app/contexts/DataProvider";
import "@/pages/dashboard/style.css";

const Dashboard: React.FC = () => {
  // If your DataProvider has types, replace `any` below with the real shape.
  const { userName, opacity } = useData() as { userName?: string; opacity?: number };

  const location = useLocation();
  const navigate = useNavigate();
  const hasRestored = useRef<boolean>(false);

  const getPageTitle = (): string => {
    const path = location.pathname;
    if (path.startsWith("/dashboard/projects/")) return "Dashboard - Project Details";
    switch (path) {
      case "/dashboard":
        return `Dashboard - Welcome, ${userName ?? "Guest"}`;
      case "/dashboard/new":
        return "Dashboard - New Project";
      case "/dashboard/projects":
        return "Dashboard - All Projects";
      case "/dashboard/settings":
        return "Dashboard - Settings";
      case "/dashboard/collaborators":
        return "Dashboard - Collaborators";
      default:
        return "Dashboard";
    }
  };

  // Persist last visited dashboard path
  useEffect(() => {
    if (location.pathname.startsWith("/dashboard")) {
      try {
        localStorage.setItem("dashboardLastPath", location.pathname + location.search);
      } catch {
        // ignore storage errors
      }
    }
  }, [location]);

  // Restore last path on first load of /dashboard
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    if (location.pathname === "/dashboard") {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("dashboardLastPath");
      } catch {
        // ignore storage errors
      }

      if (saved && saved !== "/dashboard") {
        const normalized = saved.replace("/dashboard/welcome", "/dashboard");
        navigate(normalized, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [location, navigate]);

  const opacityClass = opacity === 1 ? "opacity-high" : "opacity-low";

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{getPageTitle()}</title>
        <meta
          name="description"
          content="Manage your projects efficiently with the MYLG dashboard."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className={opacityClass}>
        <Outlet />
      </div>
    </>
  );
};

export default Dashboard;
