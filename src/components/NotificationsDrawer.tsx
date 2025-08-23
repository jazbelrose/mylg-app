import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationList, { formatNotification } from './NotificationList';
import { Pin, PinOff, Check } from 'lucide-react';
import { useNotifications } from '../app/contexts/NotificationContext';
import { useNotificationSocket } from '../app/NotificationSocketBridge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../app/contexts/DataProvider';
import { slugify } from '../utils/slug';
import { prefetchBudgetData } from '../pages/dashboard/components/SingleProject/useBudgetData';
import './NotificationsDrawer.css';

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
  pinned: boolean;
  onTogglePin: () => void;
}

const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  onClose,
  pinned,
  onTogglePin,
}) => {
  const [search, setSearch] = useState('');
  const { notifications } = useNotifications();
  const { emitNotificationRead } = useNotificationSocket();
  const { projects, allUsers, fetchProjectDetails } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const unread = notifications.some((n) => !n.read);

  const handleItemClick = () => {
    if (!pinned) {
      onClose();
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return true;
    const sender = allUsers.find((u) => u.userId === n.senderId) || ({} as any);
    const project = projects.find((p) => p.projectId === n.projectId);
    const name = project
      ? project.title || 'Project'
      : sender.firstName
      ? `${sender.firstName} ${sender.lastName ?? ''}`
      : 'User';
    const message = formatNotification(n.message);
    return (
      name.toLowerCase().includes(searchLower) ||
      message.toLowerCase().includes(searchLower)
    );
  });

  const handleNavigateToProject = async ({ projectId }: { projectId: string }) => {
    if (!projectId) return;
    const hasUnsaved =
      (typeof (window as any).hasUnsavedChanges === 'function' &&
        (window as any).hasUnsavedChanges()) ||
      (window as any).unsavedChanges === true;
    if (hasUnsaved) {
      const confirmLeave = window.confirm('You have unsaved changes, continue?');
      if (!confirmLeave) return;
    }
    const proj = projects.find((p) => p.projectId === projectId);
    const slug = proj ? slugify(proj.title) : projectId;
    const path = `/dashboard/projects/${slug}`;
    if (location.pathname !== path) {
      await Promise.all([
        fetchProjectDetails(projectId),
        prefetchBudgetData(projectId),
      ]);
      navigate(path);
    }
  };

  useEffect(() => {
    const updateVh = () => {
      document.documentElement.style.setProperty(
        '--notifications-vh',
        `${window.innerHeight}px`
      );
    };
    updateVh();
    window.addEventListener('resize', updateVh);
    return () => window.removeEventListener('resize', updateVh);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pinned) {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', onKey);
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, pinned]);

  return (
    <>
      <AnimatePresence>
        {open && !pinned && (
          <motion.div
            className="notifications-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            className="notifications-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal={!pinned}
            aria-label="Notifications"
          >
            <div className="drawer-top-bar">
              {unread && (
                <button
                  type="button"
                  className="drawer-mark-all-read-btn"
                  onClick={() =>
                    notifications.forEach(
                      (n) => !n.read && emitNotificationRead(n['timestamp#uuid'])
                    )
                  }
                  aria-label="Mark all notifications as read"
                >
                  <Check size={16} />
                </button>
              )}
              <button
                type="button"
                className="pin-button"
                onClick={onTogglePin}
                aria-label={
                  pinned ? 'Unpin notifications' : 'Pin notifications'
                }
              >
                {pinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
              <button
                type="button"
                className="close-btn"
                onClick={onClose}
                aria-label="Close notifications"
              >
                &times;
              </button>
            </div>
            <div className="drawer-search">
              <input
                type="text"
                placeholder="Search notifications"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="notifications-search-input"
              />
            </div>
            <div className="drawer-content">
              <NotificationList
                notifications={filteredNotifications}
                onNotificationClick={handleItemClick}
                onNavigateToProject={handleNavigateToProject}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationsDrawer;

