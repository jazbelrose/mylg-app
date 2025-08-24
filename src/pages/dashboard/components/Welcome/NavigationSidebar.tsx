// app/pages/Dashboard/components/Welcome/NavigationSidebar.tsx
import React, { useEffect, useState } from "react";
import { Home, Folder, Bell, MessageSquare, Settings, LogOut, Shield, Users, Plus } from "lucide-react";
import { useAuth } from "../../../../app/contexts/AuthContext";
import { useData } from "../../../../app/contexts/DataProvider";
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import NavBadge from "../../../../components/NavBadge";
import { useNavigate } from "react-router-dom";
import { signOut } from "aws-amplify/auth";
import Cookies from "js-cookie";
import "./style.css";

type NavigationSidebarProps = {
  setActiveView: (view: string) => void;
};

export default function NavigationSidebar({ setActiveView }: NavigationSidebarProps) {
  const { setIsAuthenticated, setUser } = useAuth();
  const { dmThreads } = useData() as { dmThreads: Array<{ read?: boolean }>; };
  const { notifications } = useNotifications() as { notifications: Array<{ read?: boolean }>; };
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadMessages = dmThreads.filter((t) => t.read === false).length;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNavigation = (view: string) => {
    setActiveView(view);
    const base = "/dashboard";
    const path = view === "welcome" ? base : `${base}/${view}`;
    navigate(path);
  };

  const handleCreateProject = () => {
    navigate("/dashboard/new");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      navigate("/login");
      Cookies.remove("myCookie");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  return (
    <div className="navigation-sidebar">
      <div className="nav-item" onClick={() => handleNavigation("welcome")}>
        <Home size={24} color="white" />
      </div>

      <div className="nav-item" onClick={() => handleNavigation("projects")}>
        <Folder size={24} color="white" />
      </div>

      <div className="nav-item" onClick={() => handleNavigation("notifications")}>
        <div className="nav-icon-wrapper">
          <Bell size={24} color="white" />
          <NavBadge count={unreadNotifications} label="notification" className="nav-sidebar-badge" />
        </div>
      </div>

      <div className="nav-item" onClick={() => handleNavigation("messages")}>
        <div className="nav-icon-wrapper">
          <MessageSquare size={24} color="white" />
          <NavBadge count={unreadMessages} label="message" className="nav-sidebar-badge" />
        </div>
      </div>

      {isMobile && (
        <div
          className="nav-item mobile-quick-add"
          onClick={handleCreateProject}
          title="Add Project"
        >
          <Plus size={24} color="white" />
        </div>
      )}

      <div className="nav-item" onClick={() => handleNavigation("collaborators")}>
        <Users size={24} color="white" />
      </div>

      <div className="nav-bottom" style={{ marginTop: "auto" }}>
        <div className="nav-item">
          <a
            href="/terms-and-privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Shield size={24} color="white" />
          </a>
        </div>

        <div className="nav-item" onClick={() => handleNavigation("settings")}>
          <Settings size={24} color="white" />
        </div>

        <div className="nav-item" onClick={handleSignOut}>
          <LogOut size={24} color="white" />
        </div>
      </div>
    </div>
  );
}
