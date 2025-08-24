import React, { useState, useEffect } from 'react';
import { ScrambleButton } from "../../../../components/scramblebutton";
import { User } from "lucide-react";
import { useData } from '../../../../app/contexts/DataProvider';
// import { useNotifications } from "../../../../app/contexts/NotificationContext"; // ← unused
import { useNavigate } from 'react-router-dom';
import { isMessageUnread } from '../../../../utils/messageUtils';
import { useAuth } from "../../../../app/contexts/AuthContext";

const pluralize = (n: number) => `${n} unread message${n === 1 ? '' : 's'}`;

const WelcomeHeader: React.FC = () => {
  const { user } = useAuth();
  const { userData } = useData();
  const navigate = useNavigate();

  const userName = userData?.firstName || user?.firstName || user?.email || 'User';
  const userThumbnail = userData?.thumbnail || user?.thumbnail;
  const unreadMessages = (userData?.messages || []).filter(isMessageUnread).length || 0;

  const [fontSize, setFontSize] = useState("16px");
  const [buttonPadding, setButtonPadding] = useState("10px 16px");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    const updateResponsiveStyles = () => {
      const mobile = window.innerWidth < 768;
      setFontSize(mobile ? "14px" : "16px");
      setButtonPadding(mobile ? "8px 16px" : "10px 16px");
    };
    updateResponsiveStyles();
    window.addEventListener("resize", updateResponsiveStyles);
    return () => window.removeEventListener("resize", updateResponsiveStyles);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 5 && hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  const handleCreateProject = () => navigate('/dashboard/new');
  const handleDashboardHomeClick = () => navigate('/dashboard');
  const handleAvatarKeyDown: React.KeyboardEventHandler<HTMLDivElement | SVGElement | HTMLImageElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDashboardHomeClick();
    }
  };

  return (
    <>
      <div
        className="welcome-header-desktop"
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          marginBottom: '4px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {userThumbnail ? (
            <img
              src={userThumbnail}
              alt={`${userName}'s Thumbnail`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                cursor: 'pointer',              // ← make it look clickable
              }}
              onClick={handleDashboardHomeClick}
              role="button"
              tabIndex={0}
              aria-label="Go to Dashboard"
              onKeyDown={handleAvatarKeyDown}
            />
          ) : (
            <User
              size={30}
              color="white"
              style={{ borderRadius: '50%', backgroundColor: '#333', cursor: 'pointer' }}
              onClick={handleDashboardHomeClick}
              role="button"
              tabIndex={0}
              aria-label="Go to Dashboard"
              onKeyDown={handleAvatarKeyDown}
            />
          )}

          <div className="greetings-text" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span className="greeting-line welcome" style={{ color: 'white', padding: '4px 4px' }}>
              {greeting}, <span style={{ color: '#FA3356' }}>{userName}</span>
            </span>
            {unreadMessages > 0 && (
              <span style={{ color: '#bbb', fontSize: '12px' }}>
                {pluralize(unreadMessages)}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <ScrambleButton
            text="Create a Project"
            onClick={handleCreateProject}
            fontSize={fontSize}
            padding={buttonPadding}
          />
        </div>
      </div>
    </>
  );
};

export default WelcomeHeader;
