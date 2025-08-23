import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import Modal from '../../components/ModalWithStack';
import ConfirmModal from '../../components/ConfirmModal';
import { uploadData } from 'aws-amplify/storage';
import { useData } from '../../app/contexts/DataProvider';
import { updateUserProfile, fetchUserProfilesBatch, updateUserRole, POST_PROJECT_TO_USER_URL, S3_PUBLIC_BASE, apiFetch, } from '../../utils/api';
import UserProfilePicture from '../../components/UserProfilePicture';
import ProjectAvatar from '../../components/ProjectAvatar';
import './AdminUserManagement.css';
if (typeof document !== 'undefined') {
    Modal.setAppElement('#root');
}
// Keep a mapping of role values (lowercase) to display labels so that the
// dropdown works even if the stored role values use lowercase strings. This
// avoids a mismatch where the select element always defaults to the first
// option because the value isn't found in the list of options.
const ROLES = [
    { label: 'Admin', value: 'admin' },
    { label: 'Designer', value: 'designer' },
    { label: 'Builder', value: 'builder' },
    { label: 'Vendor', value: 'vendor' },
    { label: 'Client', value: 'client' },
];
export default function AdminUserManagement() {
    const { allUsers, refreshUsers, userData, isAdmin, projects, fetchProjects, } = useData();
    const [editValues, setEditValues] = useState({});
    const [loadingUserId, setLoadingUserId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [localPreviews, setLocalPreviews] = useState({});
    const [assignedProjects, setAssignedProjects] = useState({});
    const [assignedCollaborators, setAssignedCollaborators] = useState({});
    const [projectFilter, setProjectFilter] = useState('');
    const [collabFilter, setCollabFilter] = useState('');
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
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
    if (!isAdmin) {
        return _jsx("div", { children: "Access Denied" });
    }
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
            }
            else {
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
            }
            else {
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
        console.log('Thumbnail uploaded:', result);
        return `${S3_PUBLIC_BASE}/${filename}?t=${Date.now()}`;
    };
    const handleThumbnailChange = async (e, userId) => {
        const file = e.target.files[0];
        if (!file)
            return;
        const previewURL = URL.createObjectURL(file);
        setLocalPreviews((p) => {
            const prevUrl = p[userId];
            if (prevUrl)
                URL.revokeObjectURL(prevUrl);
            return { ...p, [userId]: previewURL };
        });
        try {
            const uploadedURL = await handleFileUpload(userId, file);
            handleChange(userId, 'thumbnail', uploadedURL);
        }
        catch (err) {
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
        if (!vals)
            return;
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
            await updateUserProfile(payload);
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
        }
        catch (err) {
            console.error('Failed to update user', err);
            alert('Failed to update user');
        }
        finally {
            setLoadingUserId(null);
            setSelectedUserId(null);
        }
    };
    const togglePending = async (userId) => {
        setLoadingUserId(userId);
        try {
            const [profile] = await fetchUserProfilesBatch([userId]);
            if (!profile)
                throw new Error('User not found');
            const newVal = !profile.pending;
            await updateUserProfile({ ...profile, pending: newVal });
            setEditValues((prev) => ({
                ...prev,
                [userId]: { ...prev[userId], pending: newVal },
            }));
            await refreshUsers();
        }
        catch (err) {
            console.error('Failed to update pending flag', err);
            alert('Failed to update user');
        }
        finally {
            setLoadingUserId(null);
        }
    };
    const changeRole = async (userId, role) => {
        setLoadingUserId(userId);
        try {
            // updateUserRole now fetches the profile and persists the updated role
            const updated = await updateUserRole(userId, role);
            setEditValues((prev) => ({
                ...prev,
                [userId]: { ...prev[userId], role: updated.role || role },
            }));
            await refreshUsers();
        }
        catch (err) {
            console.error('Failed to update user role', err);
            alert('Failed to update user role');
        }
        finally {
            setLoadingUserId(null);
        }
    };
    return (_jsxs("div", { className: "admin-users-container", children: [_jsxs("table", { className: "admin-users-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "sortable", children: "Email" }), _jsx("th", { className: "sortable", children: "First" }), _jsx("th", { className: "sortable", children: "Last" }), _jsx("th", { className: "sortable", children: "Role" }), _jsx("th", { className: "sortable", children: "Phone" }), _jsx("th", { className: "sortable", children: "Company" }), _jsx("th", { className: "sortable", children: "Pending" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: allUsers.map((u) => {
                            return (_jsxs("tr", { children: [_jsx("td", { children: u.email }), _jsx("td", { children: u.firstName }), _jsx("td", { children: u.lastName }), _jsx("td", { children: _jsx("select", { value: editValues[u.userId]?.role || '', onChange: (e) => changeRole(u.userId, e.target.value), disabled: loadingUserId === u.userId, children: ROLES.map((r) => (_jsx("option", { value: r.value, children: r.label }, r.value))) }) }), _jsx("td", { children: u.phoneNumber }), _jsx("td", { children: u.company }), _jsx("td", { children: _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: editValues[u.userId]?.pending || false, onChange: () => togglePending(u.userId) }), _jsx("span", { className: "slider" })] }) }), _jsx("td", { children: _jsx("button", { className: "edit-button", onClick: () => openModalForUser(u.userId), children: "Edit" }) })] }, u.userId));
                        }) })] }), _jsx(Modal, { isOpen: !!selectedUserId, onRequestClose: closeModal, contentLabel: "Edit User", className: "admin-modal-content", overlayClassName: "admin-modal-overlay", children: selectedUserId && (_jsxs("div", { className: "admin-modal-form", children: [_jsx(UserProfilePicture, { thumbnail: editValues[selectedUserId]?.thumbnail || '', localPreview: localPreviews[selectedUserId], onChange: (e) => handleThumbnailChange(e, selectedUserId) }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: `email-${selectedUserId}`, className: "admin-form-label", children: "Email" }), _jsx("input", { id: `email-${selectedUserId}`, className: "admin-form-input", value: editValues[selectedUserId]?.email || '', onChange: (e) => handleChange(selectedUserId, 'email', e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: `first-${selectedUserId}`, className: "admin-form-label", children: "First Name" }), _jsx("input", { id: `first-${selectedUserId}`, className: "admin-form-input", value: editValues[selectedUserId]?.firstName || '', onChange: (e) => handleChange(selectedUserId, 'firstName', e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: `last-${selectedUserId}`, className: "admin-form-label", children: "Last Name" }), _jsx("input", { id: `last-${selectedUserId}`, className: "admin-form-input", value: editValues[selectedUserId]?.lastName || '', onChange: (e) => handleChange(selectedUserId, 'lastName', e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: `phone-${selectedUserId}`, className: "admin-form-label", children: "Phone" }), _jsx("input", { id: `phone-${selectedUserId}`, className: "admin-form-input", value: editValues[selectedUserId]?.phoneNumber || '', onChange: (e) => handleChange(selectedUserId, 'phoneNumber', e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: `company-${selectedUserId}`, className: "admin-form-label", children: "Company" }), _jsx("input", { id: `company-${selectedUserId}`, className: "admin-form-input", value: editValues[selectedUserId]?.company || '', onChange: (e) => handleChange(selectedUserId, 'company', e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { htmlFor: `occupation-${selectedUserId}`, className: "admin-form-label", children: "Occupation" }), _jsx("input", { id: `occupation-${selectedUserId}`, className: "admin-form-input", value: editValues[selectedUserId]?.occupation || '', onChange: (e) => handleChange(selectedUserId, 'occupation', e.target.value) })] }), _jsxs("div", { className: "assigned-collaborators-section", children: [_jsx("label", { className: "admin-form-label", children: "Collaborators" }), allUsers.length > 10 && (_jsx("input", { type: "text", placeholder: "Search users...", className: "admin-form-input", value: collabFilter, onChange: (e) => setCollabFilter(e.target.value) })), _jsx("div", { className: "assigned-collaborators-grid", children: allUsers
                                        .filter((u) => u.userId !== selectedUserId)
                                        .filter((u) => {
                                        const search = collabFilter.toLowerCase();
                                        if (!search)
                                            return true;
                                        return ((u.firstName || '').toLowerCase().includes(search) ||
                                            (u.lastName || '').toLowerCase().includes(search) ||
                                            (u.email || '').toLowerCase().includes(search) ||
                                            (u.username || '').toLowerCase().includes(search));
                                    })
                                        .map((u) => {
                                        const checked = (assignedCollaborators[selectedUserId] || []).includes(u.userId);
                                        return (_jsxs("label", { className: "collaborator-option", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: () => toggleCollaboratorSelection(selectedUserId, u.userId) }), u.thumbnail ? (_jsx("img", { src: u.thumbnail, alt: "", className: "collaborator-thumb" })) : (_jsx("div", { className: "collaborator-thumb" })), _jsxs("span", { className: "collaborator-name", children: [u.firstName, " ", u.lastName] })] }, u.userId));
                                    }) })] }), isAdmin && (_jsxs("div", { className: "assigned-projects-section", children: [_jsx("label", { className: "admin-form-label", children: "Assigned Projects" }), projects.length > 10 && (_jsx("input", { type: "text", placeholder: "Search projects...", className: "admin-form-input", value: projectFilter, onChange: (e) => setProjectFilter(e.target.value) })), _jsx("div", { className: "assigned-projects-grid", children: projects
                                        .filter((p) => p.title
                                        .toLowerCase()
                                        .includes(projectFilter.toLowerCase()))
                                        .map((p) => {
                                        const checked = (assignedProjects[selectedUserId] || []).includes(p.projectId);
                                        return (_jsxs("label", { className: "project-option", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: () => toggleProjectSelection(selectedUserId, p.projectId) }), _jsx(ProjectAvatar, { thumb: p.thumbnails && p.thumbnails[0], name: p.title, className: "project-thumb" }), _jsx("span", { className: "project-name", children: p.title })] }, p.projectId));
                                    }) })] })), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "modal-button secondary", onClick: closeModal, children: "Cancel" }), _jsx("button", { className: "modal-button primary", onClick: handleSaveClick, disabled: loadingUserId === selectedUserId, children: loadingUserId === selectedUserId ? 'Saving...' : 'Save' })] })] })) }), _jsx(ConfirmModal, { isOpen: isSaveConfirmOpen, onRequestClose: () => setIsSaveConfirmOpen(false), onConfirm: confirmSaveChanges, message: "Save changes to this user?", confirmLabel: "Save", cancelLabel: "Cancel", className: "admin-modal-content", overlayClassName: "admin-modal-overlay" })] }));
}
