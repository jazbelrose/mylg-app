import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  MessageCircle,
  ListPlus,
  X,
  Check,
} from "lucide-react";
import { useData } from "../../app/contexts/DataProvider";
import ProjectAvatar from "../../components/ProjectAvatar";
import Modal from "../../components/ModalWithStack";
import ConfirmModal from "../../components/ConfirmModal";
import { uploadData } from "aws-amplify/storage";
import { useOnlineStatus } from "../../app/contexts/OnlineStatusContext";
import { useSocket } from "../../app/contexts/SocketContext";
import { slugify } from "../../utils/slug";
import InviteCollaboratorModal from "./components/InviteCollaboratorModal";
import {
  fetchOutgoingCollabInvites,
  fetchIncomingCollabInvites,
  sendUserInvite,
  acceptCollabInvite,
  declineCollabInvite,
  cancelCollabInvite,
  updateUserProfile as updateProfileApi,
  fetchUserProfilesBatch,
  updateUserRole,
  POST_PROJECT_TO_USER_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from "../../utils/api";
import UserProfilePicture from "../../components/UserProfilePicture";
import styles from "./Collaborators.module.css";
import "./AdminUserManagement.css";

if (typeof document !== 'undefined') {
  Modal.setAppElement('#root');
}

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Designer', value: 'designer' },
  { label: 'Builder', value: 'builder' },
  { label: 'Vendor', value: 'vendor' },
  { label: 'Client', value: 'client' },
];

export default function Collaborators() {
  const {
    allUsers,
    userData,
    updateUserProfile,
    setUserData,
    projects,
    isAdmin,
    refreshUsers,
    fetchProjects,
  } = useData();
  const { onlineUsers } = useOnlineStatus();
  const { ws } = useSocket();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [outgoingInvites, setOutgoingInvites] = useState([]);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [localPreviews, setLocalPreviews] = useState({});
  const [assignedProjects, setAssignedProjects] = useState({});
  const [assignedCollaborators, setAssignedCollaborators] = useState({});
  const [projectFilter, setProjectFilter] = useState('');
  const [collabFilter, setCollabFilter] = useState('');
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const collaborators = Array.isArray(userData?.collaborators)
    ? userData.collaborators
    : [];

  const collabUsers = collaborators
    .map((id) => allUsers.find((u) => u.userId === id || u.username === id))
    .filter(Boolean);

  const displayUsers = isAdmin ? allUsers : collabUsers;


  const openInviteModal = () => setInviteOpen(true);
  const closeInviteModal = () => setInviteOpen(false);

  const loadInvites = async () => {
    try {
      const [out, inc] = await Promise.all([
        fetchOutgoingCollabInvites(),
        fetchIncomingCollabInvites(),
      ]);
      setOutgoingInvites(Array.isArray(out) ? out : []);
      setIncomingInvites(Array.isArray(inc) ? inc : []);
    } catch (err) {
      console.error("Failed to fetch invites", err);
    }
  };

  const refreshInvites = () => {
    loadInvites();
    setTimeout(loadInvites, 1000);
  };

  useEffect(() => {
    loadInvites();
  }, [userData?.userId]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "collaborators-updated") {
          refreshInvites();
        }
      } catch (err) {
        console.error("Failed to parse WS message:", event.data);
      }
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  const sendInvite = async (email, role) => {
    try {
      await sendUserInvite(email, role);
      refreshInvites();
    } catch (err) {
      console.error("Failed to send invite", err);
    }
  };

  const getUserName = (id) => {
    const u = allUsers.find((x) => x.userId === id || x.username === id) || {};
    return u.firstName ? `${u.firstName} ${u.lastName ?? ""}` : id;
  };

  const getUserProjects = (uid) =>
    projects.filter(
      (p) => Array.isArray(p.team) && p.team.some((m) => m.userId === uid),
    );

  const openModalForUser = (userId) => {
    const ids = projects
      .filter((p) => Array.isArray(p.team) && p.team.some((m) => m.userId === userId))
      .map((p) => p.projectId);
    setAssignedProjects((prev) => ({ ...prev, [userId]: ids }));
    const user = allUsers.find((u) => u.userId === userId);
    const collabs = Array.isArray(user?.collaborators) ? user.collaborators : [];
    setAssignedCollaborators((prev) => ({ ...prev, [userId]: collabs }));
    setProjectFilter('');
    setCollabFilter('');
    setSelectedUserId(userId);
  };
  const closeModal = () => setSelectedUserId(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    if (selectedUserId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUserId]);

  useEffect(() => {
    const values = {};
    allUsers.forEach((u) => {
      values[u.userId] = {
        email: u.email || '',
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role: (u.role || '').toLowerCase(),
        pending: typeof u.pending === 'boolean' ? u.pending : false,
        phoneNumber: u.phoneNumber || '',
        company: u.company || '',
        occupation: u.occupation || '',
        thumbnail: u.thumbnail || '',
        collaborators: Array.isArray(u.collaborators) ? u.collaborators.join(',') : '',
        projects: Array.isArray(u.projects) ? u.projects.join(',') : '',
      };
    });
    setEditValues(values);
  }, [allUsers]);

  const handleChange = (userId, field, value) => {
    const normalized = field === 'role' ? value.toLowerCase() : value;
    setEditValues((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: normalized },
    }));
  };

  const toggleProjectSelection = (userId, projectId) => {
    setAssignedProjects((prev) => {
      const current = new Set(prev[userId] || []);
      if (current.has(projectId)) {
        current.delete(projectId);
      } else {
        current.add(projectId);
      }
      return { ...prev, [userId]: Array.from(current) };
    });
  };

  const toggleCollaboratorSelection = (userId, collaboratorId) => {
    setAssignedCollaborators((prev) => {
      const current = new Set(prev[userId] || []);
      if (current.has(collaboratorId)) {
        current.delete(collaboratorId);
      } else {
        current.add(collaboratorId);
      }
      return { ...prev, [userId]: Array.from(current) };
    });
  };

  const handleFileUpload = async (userId, file) => {
    const filename = `userData-thumbnails/${userId}/${file.name}`;
    const result = await uploadData({
      key: filename,
      data: file,
      options: { accessLevel: 'public' },
    });
    return `${S3_PUBLIC_BASE}/${filename}?t=${Date.now()}`;
  };

  const handleThumbnailChange = async (e, userId) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewURL = URL.createObjectURL(file);
    setLocalPreviews((p) => {
      const prevUrl = p[userId];
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return { ...p, [userId]: previewURL };
    });
    try {
      const uploadedURL = await handleFileUpload(userId, file);
      handleChange(userId, 'thumbnail', uploadedURL);
    } catch (err) {
      console.error('Failed to upload thumbnail', err);
      alert('Failed to upload thumbnail');
    }
  };

  useEffect(() => {
    return () => {
      Object.values(localPreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [localPreviews]);

  const handleSaveClick = () => setIsSaveConfirmOpen(true);
  const confirmSaveChanges = () => {
    setIsSaveConfirmOpen(false);
    if (selectedUserId) {
      saveChanges(selectedUserId);
    }
  };

  const saveChanges = async (userId) => {
    const vals = editValues[userId];
    if (!vals) return;
    const collaboratorIds = assignedCollaborators[userId]
      ? assignedCollaborators[userId]
      : vals.collaborators
          ? vals.collaborators.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
    const payload = {
      userId,
      ...vals,
      collaborators: collaboratorIds,
    };

    const originalIds = projects
      .filter((p) => Array.isArray(p.team) && p.team.some((m) => m.userId === userId))
      .map((p) => p.projectId);
    const newIds = assignedProjects[userId] || [];
    const toAdd = newIds.filter((id) => !originalIds.includes(id));
    const toRemove = originalIds.filter((id) => !newIds.includes(id));

    setLoadingUserId(userId);
    try {
      await updateProfileApi(payload);
      if (toAdd.length || toRemove.length) {
        await apiFetch(`${POST_PROJECT_TO_USER_URL}?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ add: toAdd, remove: toRemove }),
        });
      }

      await refreshUsers();
      await fetchProjects();
      setEditValues((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          projects: newIds.join(','),
          collaborators: collaboratorIds.join(','),
        },
      }));
    } catch (err) {
      console.error('Failed to update user', err);
      alert('Failed to update user');
    } finally {
      setLoadingUserId(null);
      setSelectedUserId(null);
    }
  };

  const togglePending = async (userId) => {
    setLoadingUserId(userId);
    try {
      const [profile] = await fetchUserProfilesBatch([userId]);
      if (!profile) throw new Error('User not found');
      const newVal = !profile.pending;
      await updateProfileApi({ ...profile, pending: newVal });
      setEditValues((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], pending: newVal },
      }));
      await refreshUsers();
    } catch (err) {
      console.error('Failed to update pending flag', err);
      alert('Failed to update user');
    } finally {
      setLoadingUserId(null);
    }
  };

  const changeRole = async (userId, role) => {
    setLoadingUserId(userId);
    try {
      const updated = await updateUserRole(userId, role);
      setEditValues((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], role: updated.role || role },
      }));
      await refreshUsers();
    } catch (err) {
      console.error('Failed to update user role', err);
      alert('Failed to update user role');
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="main-content">
      <div className={styles.panel}>
        <div className={styles.headerSticky}>
          <div className={styles.headerRow}>
            <h2 className={styles.title}>Collaborators</h2>
            {isAdmin && (
              <button className={styles.inviteButton} onClick={openInviteModal}>
                <UserPlus size={20} /> Invite User
              </button>
            )}
          </div>

          <div className={styles.profileBlock}>
            <div className={styles.avatarWrapper}>
              {userData?.thumbnail ? (
                <img
                  src={userData.thumbnail}
                  alt="Me"
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder} />
              )}
              {onlineUsers.includes(userData?.userId) && (
                <span className={`${styles.statusDot} ${styles.online}`} />
              )}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.name}>
                {userData?.firstName} {userData?.lastName} (You)
              </span>
              <div className={styles.metaRow}>
                {userData.role && (
                  <span
                    className={`${styles.roleTag} ${
                      styles[
                        "role" +
                          (userData.role || "")
                            .toLowerCase()
                            .replace(/^[a-z]/, (c) => c.toUpperCase())
                      ] || ""
                    }`}
                  >
                    {userData.role ? userData.role[0].toUpperCase() + userData.role.slice(1).toLowerCase() : ''}
                  </span>
                )}
                {userData.occupation && (
                  <span className={styles.occupationTag}>
                    {userData.occupation}
                  </span>
                )}
                <div className={styles.projectIcons}>
                  {(() => {
                    const userProjects = getUserProjects(userData?.userId);
                    const visible = isMobile
                      ? userProjects.slice(0, 3)
                      : userProjects;
                    return (
                      <>
                        {visible.map((p) => (
                          <ProjectAvatar
                            key={p.projectId}
                            thumb={p.thumbnails && p.thumbnails[0]}
                            name={p.title}
                            className={styles.projectIcon}
                          />
                        ))}
                        {isMobile && userProjects.length > 3 && (
                          <span className={styles.overflowBadge}>
                            +{userProjects.length - 3}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {collabUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Invite your first collaborator to start working together! 🎉</p>
            <div className={styles.emptyIllustration}>
              <UserPlus size={48} />
            </div>
            {isAdmin && (
              <button className={styles.inviteButton} onClick={openInviteModal}>
                <UserPlus size={20} /> Invite User
              </button>
            )}
          </div>
        ) : (
          <ul className={styles.collabGrid}>
            {displayUsers.map((u) => {
              const slug = slugify(`${u.firstName || ""}-${u.lastName || ""}`);
              const isOnline = onlineUsers.includes(u.userId);
              return (
                <li
                  key={u.username || u.userId}
                  className={`${styles.collabCard} ${
                    isAdmin ? styles.collabCardClickable : ''
                  }`}
                  onClick={
                    isAdmin ? () => openModalForUser(u.userId) : undefined
                  }
                >
                  <div className={styles.cardInfo}>
                    <div className={styles.cardLeft}>
                      {u.thumbnail ? (
                        <img
                          src={u.thumbnail}
                          alt={u.firstName}
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder} />
                      )}
                      <span
                        className={`${styles.statusDot} ${
                          isOnline ? styles.online : styles.offline
                        }`}
                      />
                    </div>
                    <div className={styles.infoBlock}>
                      <div className={styles.nameRow}>
                        <span className={styles.name}>
                          {u.firstName} {u.lastName}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        {u.role && (
                          <span
                            className={`${styles.roleTag} ${
                              styles[
                                "role" +
                                  (u.role || "")
                                    .toLowerCase()
                                    .replace(/^[a-z]/, (c) => c.toUpperCase())
                              ] || ""
                            }`}
                            title={u.role}
                          >
                            {u.role ? u.role[0].toUpperCase() + u.role.slice(1).toLowerCase() : ''}
                          </span>
                        )}
                        {u.occupation && (
                          <span className={styles.occupationTag}>
                            {u.occupation}
                          </span>
                        )}
                        <div className={styles.projectIcons}>
                          {(() => {
                            const userProjects = getUserProjects(u.userId);
                            const visible = isMobile
                              ? userProjects.slice(0, 3)
                              : userProjects;
                            return (
                              <>
                                {visible.map((p) => (
                                  <ProjectAvatar
                                    key={p.projectId}
                                    thumb={p.thumbnails && p.thumbnails[0]}
                                    name={p.title}
                                    className={styles.projectIcon}
                                  />
                                ))}
                                {isMobile && userProjects.length > 3 && (
                                  <span className={styles.overflowBadge}>
                                    +{userProjects.length - 3}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.cardActions} flex items-center`}>
                    <button
                      aria-label="Message"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/messages/${slug}`);
                      }}
                    >
                      <MessageCircle size={18} />
                    </button>
                    {isAdmin && (
                      <button
                        aria-label="Assign Task"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert("Assign task");
                        }}
                      >
                        <ListPlus size={18} />
                      </button>
                    )}
                    {isAdmin && (
                      <label className="switch" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={editValues[u.userId]?.pending || false}
                          onChange={() => togglePending(u.userId)}
                        />
                        <span className="slider" />
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {(outgoingInvites.length > 0 || incomingInvites.length > 0) && (
          <div className={styles.pendingSection}>
            {outgoingInvites.length > 0 && (
              <>
                <h3>Outgoing Invites</h3>
                <ul className={styles.pendingList}>
                  {outgoingInvites.map((inv) => (
                    <li key={inv.id} className={styles.pendingItem}>
                      <span>{getUserName(inv.toUserId)}</span>
                      <div className={styles.pendingActions}>
                        <button
                          aria-label="Cancel"
                          onClick={async () => {
                            try {
                              await cancelCollabInvite(inv.id);
                              setOutgoingInvites((prev) =>
                                prev.filter((i) => i.id !== inv.id),
                              );
                              refreshInvites();
                            } catch (err) {
                              console.error("Failed to cancel invite", err);
                            }
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {incomingInvites.length > 0 && (
              <>
                <h3>Incoming Requests</h3>
                <ul className={styles.pendingList}>
                  {incomingInvites.map((inv) => (
                    <li key={inv.id} className={styles.pendingItem}>
                      <span>{getUserName(inv.fromUserId)}</span>
                      <div className={styles.pendingActions}>
                        <button
                          aria-label="Accept"
                          onClick={async () => {
                            try {
                              await acceptCollabInvite(inv.id);
                              setIncomingInvites((prev) =>
                                prev.filter((i) => i.id !== inv.id),
                              );
                              if (!collaborators.includes(inv.fromUserId)) {
                                const updated = [
                                  ...collaborators,
                                  inv.fromUserId,
                                ];
                                await updateUserProfile({
                                  ...userData,
                                  collaborators: updated,
                                });
                                if (setUserData)
                                  setUserData({
                                    ...userData,
                                    collaborators: updated,
                                  });
                              }
                              refreshInvites();
                            } catch (err) {
                              console.error("Failed to accept invite", err);
                            }
                          }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          aria-label="Decline"
                          onClick={async () => {
                            try {
                              await declineCollabInvite(inv.id);
                              setIncomingInvites((prev) =>
                                prev.filter((i) => i.id !== inv.id),
                              );
                              refreshInvites();
                            } catch (err) {
                              console.error("Failed to decline invite", err);
                            }
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
      <InviteCollaboratorModal
        isOpen={inviteOpen}
        onClose={closeInviteModal}
        onInvite={sendInvite}
      />

      <Modal
        isOpen={!!selectedUserId}
        onRequestClose={closeModal}
        contentLabel="Edit User"
        className="admin-modal-content"
        overlayClassName="admin-modal-overlay"
      >
        {selectedUserId && (
          <div className="admin-modal-form" style={{position: 'relative'}}>
            <button
              aria-label="Close"
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                zIndex: 20,
                padding: 4,
                lineHeight: 1
              }}
            >
              <X size={22} color="#888" />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }}>
              <UserProfilePicture
                thumbnail={editValues[selectedUserId]?.thumbnail || ''}
                localPreview={localPreviews[selectedUserId]}
                onChange={(e) => handleThumbnailChange(e, selectedUserId)}
              />
              {editValues[selectedUserId]?.role && (
                <span
                  className={`${styles.roleTag} ${
                    styles[
                      "role" +
                        (editValues[selectedUserId]?.role || "")
                          .toLowerCase()
                          .replace(/^[a-z]/, (c) => c.toUpperCase())
                    ] || ""
                  }`}
                  style={{ cursor: 'pointer', position: 'relative', marginTop: 8, alignSelf: 'flex-start', minWidth: 80, textAlign: 'left', padding: '4px 12px', fontWeight: 500, fontSize: 13, borderRadius: 9999 }}
                  title={editValues[selectedUserId]?.role}
                  onClick={e => {
                    e.stopPropagation();
                    setEditValues(prev => ({
                      ...prev,
                      showRoleDropdown: prev.showRoleDropdown === selectedUserId ? null : selectedUserId
                    }));
                  }}
                  onMouseOver={e => { e.currentTarget.style.boxShadow = '0 0 0 2px #aaa'; }}
                  onMouseOut={e => { e.currentTarget.style.boxShadow = ''; }}
                >
                  {editValues[selectedUserId]?.role ? editValues[selectedUserId].role[0].toUpperCase() + editValues[selectedUserId].role.slice(1).toLowerCase() : ''}
                  {editValues.showRoleDropdown === selectedUserId && (
                    <div
                      ref={el => {
                        if (el && !el._clickAwayAdded) {
                          el._clickAwayAdded = true;
                          setTimeout(() => {
                            const handler = (e) => {
                              if (!el.contains(e.target)) {
                                setEditValues(prev => ({ ...prev, showRoleDropdown: null }));
                                document.removeEventListener('mousedown', handler);
                              }
                            };
                            document.addEventListener('mousedown', handler);
                          }, 0);
                        }
                      }}
                      style={{
                      position: 'absolute',
                      top: '110%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                      background: '#222',
                      borderRadius: '16px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                      padding: '8px 6px',
                      border: '1px solid #333',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 'auto',
                      minWidth: '0',
                      maxWidth: 'fit-content',
                    }}>
                      {ROLES.map(role => (
                        <div
                          key={role.value}
                          style={{
                            padding: '4px 10px',
                            cursor: 'pointer',
                            background:
                              role.value === 'admin' ? '#d9534f'
                              : role.value === 'designer' ? '#0275d8'
                              : role.value === 'builder' ? '#f0ad4e'
                              : role.value === 'vendor' ? '#5cb85c'
                              : role.value === 'client' ? '#6f42c1'
                              : '#444',
                            color: '#fff',
                            fontWeight: 500,
                            fontSize: 12,
                            borderRadius: '16px',
                            minWidth: 60,
                            maxWidth: 100,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            margin: '2px 4px',
                            border: editValues[selectedUserId]?.role === role.value ? '2px solid #fff' : 'none',
                            transition: 'transform 0.2s cubic-bezier(.4,0,.2,1)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateX(8px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            setEditValues(prev => ({ ...prev, showRoleDropdown: null }));
                            changeRole(selectedUserId, role.value);
                          }}
                        >
                          {role.label}
                        </div>
                      ))}
                    </div>
                  )}
                </span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor={`email-${selectedUserId}`} className="admin-form-label">Email</label>
              <input
                id={`email-${selectedUserId}`}
                className="admin-form-input"
                value={editValues[selectedUserId]?.email || ''}
                onChange={(e) => handleChange(selectedUserId, 'email', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor={`first-${selectedUserId}`} className="admin-form-label">First Name</label>
              <input
                id={`first-${selectedUserId}`}
                className="admin-form-input"
                value={editValues[selectedUserId]?.firstName || ''}
                onChange={(e) => handleChange(selectedUserId, 'firstName', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor={`last-${selectedUserId}`} className="admin-form-label">Last Name</label>
              <input
                id={`last-${selectedUserId}`}
                className="admin-form-input"
                value={editValues[selectedUserId]?.lastName || ''}
                onChange={(e) => handleChange(selectedUserId, 'lastName', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor={`phone-${selectedUserId}`} className="admin-form-label">Phone</label>
              <input
                id={`phone-${selectedUserId}`}
                className="admin-form-input"
                value={editValues[selectedUserId]?.phoneNumber || ''}
                onChange={(e) => handleChange(selectedUserId, 'phoneNumber', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor={`company-${selectedUserId}`} className="admin-form-label">Company</label>
              <input
                id={`company-${selectedUserId}`}
                className="admin-form-input"
                value={editValues[selectedUserId]?.company || ''}
                onChange={(e) => handleChange(selectedUserId, 'company', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor={`occupation-${selectedUserId}`} className="admin-form-label">Occupation</label>
              <input
                id={`occupation-${selectedUserId}`}
                className="admin-form-input"
                value={editValues[selectedUserId]?.occupation || ''}
                onChange={(e) => handleChange(selectedUserId, 'occupation', e.target.value)}
              />
            </div>
            <div className="assigned-collaborators-section">
              <label className="admin-form-label">Collaborators</label>
              {allUsers.length > 10 && (
                <input
                  type="text"
                  placeholder="Search users..."
                  className="admin-form-input"
                  value={collabFilter}
                  onChange={(e) => setCollabFilter(e.target.value)}
                />
              )}
              <div className="assigned-collaborators-grid">
                {allUsers
                  .filter((u) => u.userId !== selectedUserId)
                  .filter((u) => {
                    const search = collabFilter.toLowerCase();
                    if (!search) return true;
                    return (
                      (u.firstName || '').toLowerCase().includes(search) ||
                      (u.lastName || '').toLowerCase().includes(search) ||
                      (u.email || '').toLowerCase().includes(search) ||
                      (u.username || '').toLowerCase().includes(search)
                    );
                  })
                  .map((u) => {
                    const checked = (assignedCollaborators[selectedUserId] || []).includes(u.userId);
                    return (
                      <label key={u.userId} className="collaborator-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCollaboratorSelection(selectedUserId, u.userId)}
                        />
                        {u.thumbnail ? (
                          <img src={u.thumbnail} alt="" className="collaborator-thumb" />
                        ) : (
                          <div className="collaborator-thumb" />
                        )}
                        <span className="collaborator-name">
                          {u.firstName} {u.lastName}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
            {isAdmin && (
              <div className="assigned-projects-section">
                <label className="admin-form-label">Assigned Projects</label>
                {projects.length > 10 && (
                  <input
                    type="text"
                    placeholder="Search projects..."
                    className="admin-form-input"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                  />
                )}
                <div className="assigned-projects-grid">
                  {projects
                    .filter((p) =>
                      p.title.toLowerCase().includes(projectFilter.toLowerCase())
                    )
                    .map((p) => {
                      const checked = (assignedProjects[selectedUserId] || []).includes(p.projectId);
                      return (
                        <label key={p.projectId} className="project-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProjectSelection(selectedUserId, p.projectId)}
                          />
                          <ProjectAvatar
                            thumb={p.thumbnails && p.thumbnails[0]}
                            name={p.title}
                            className="project-thumb"
                          />
                          <span className="project-name">{p.title}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="modal-button secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleSaveClick}
                disabled={loadingUserId === selectedUserId}
              >
                {loadingUserId === selectedUserId ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onRequestClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={confirmSaveChanges}
        message="Save changes to this user?"
        confirmLabel="Save"
        cancelLabel="Cancel"
        className="admin-modal-content"
        overlayClassName="admin-modal-overlay"
      />
    </div>
  );
}