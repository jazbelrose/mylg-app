import React, { useState, useEffect, ChangeEvent } from 'react';
import { useData } from '../../app/contexts/DataProvider';
import { uploadData } from 'aws-amplify/storage';
import { useAuth } from '../../app/contexts/AuthContext';
import { updatePassword } from 'aws-amplify/auth';
import User from "../../assets/svg/user.svg?react";
import { toast } from 'react-toastify';
import { updateUserProfile, S3_PUBLIC_BASE } from '../../utils/api';
import PaymentsSection from './components/PaymentsSection';
import EditableTextField from '../../components/EditableTextField';
import UserProfilePicture from '../../components/UserProfilePicture';
import { HelpCircle } from 'lucide-react';
interface FormData {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phoneNumber: string;
    thumbnail: string;
    occupation: string;
}

const Settings: React.FC = () => {
    const { refreshUser } = useAuth();
    const { userData, setUserData, toggleSettingsUpdated, projects } = useData();
    const [formData, setFormData] = useState<FormData>({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        company: userData.company || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        thumbnail: userData.thumbnail || '',
        occupation: userData.occupation || '',
    });
    const { firstName, lastName, company, email, phoneNumber, occupation, thumbnail } = formData;
    const [oldPassword, setOldPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
    const [passwordChangeStatus, setPasswordChangeStatus] = useState<string>('');
    const [showPasswordFields, setShowPasswordFields] = useState<boolean>(false);
    const [showSavedWindow, setShowSavedWindow] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [localPreview, setLocalPreview] = useState(null); // Store local file preview
    const [uploadedURL, setUploadedURL] = useState(null); // Store uploaded file URL
    const ROLE_DESCRIPTIONS = {
        admin: 'Full administrative access',
        designer: 'Create and manage designs',
        builder: 'Manage build tasks',
        vendor: 'Vendor access to supply orders',
        client: 'View project progress',
    };
    useEffect(() => {
        if (showSavedWindow) {
            const timeoutId = setTimeout(() => {
                setShowSavedWindow(false);
            }, 3000);
            return () => clearTimeout(timeoutId);
        }
    }, [showSavedWindow]);
    useEffect(() => {
        setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            company: userData.company || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || '',
            occupation: userData.occupation || '',
            thumbnail: userData.thumbnail ? userData.thumbnail + `?t=${Date.now()}` : '',
        });
    }, [userData]);
    const handleFileUpload = async (userId, file) => {
        try {
            if (!(file instanceof Blob) && !(file instanceof File)) {
                throw new Error('Invalid file type');
            }
            // Build filename using userId instead of projectId
            const filename = `userData-thumbnails/${userId}/${file.name}`;
            const result = await uploadData({
                key: filename,
                data: file,
                options: {
                    accessLevel: 'public',
                },
            });
            console.log('Thumbnail uploaded:', result);
            const completeUrl = `${S3_PUBLIC_BASE}/${filename}`;
            // Append a timestamp to force refresh
            return completeUrl + `?t=${Date.now()}`;
        }
        catch (error) {
            console.error('Error uploading thumbnail:', error);
            toast.error('Failed to upload image');
            throw error;
        }
    };
    const handleThumbnailChange = async (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        // Show local preview
        const previewURL = URL.createObjectURL(file);
        if (localPreview) {
            URL.revokeObjectURL(localPreview);
        }
        setLocalPreview(previewURL); // Keep local version visible
        setIsFormDirty(true); // Mark form as modified
        try {
            const uploadedURL = await handleFileUpload(userData.userId, file);
            setUploadedURL(uploadedURL); // Store but don’t update UI yet
            console.log("Uploaded URL stored:", uploadedURL);
        }
        catch (error) {
            console.error("Error uploading profile picture:", error);
            toast.error("Error uploading profile picture");
        }
    };
    useEffect(() => {
        return () => {
            if (localPreview) {
                URL.revokeObjectURL(localPreview);
            }
        };
    }, [localPreview]);
    const checkIfFormIsDirty = () => {
        const initialValues = {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            company: userData.company || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || '',
            occupation: userData.occupation || '',
        };
        const profileDirty = Object.keys(initialValues).some((key) => formData[key] !== initialValues[key]);
        // consider password fields dirty if any have been modified
        const passwordDirty = oldPassword.trim() !== '' ||
            newPassword.trim() !== '' ||
            confirmNewPassword.trim() !== '';
        setIsFormDirty(profileDirty || passwordDirty);
    };
    useEffect(() => {
        checkIfFormIsDirty();
    }, [formData, oldPassword, newPassword, confirmNewPassword]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        let passwordChangeError = false;
        // 🔹 Handle password change if fields are filled
        if (oldPassword && newPassword && confirmNewPassword) {
            if (newPassword !== confirmNewPassword) {
                setPasswordChangeStatus("New passwords do not match.");
                passwordChangeError = true;
            }
            else {
                try {
                    await updatePassword({
                        oldPassword: oldPassword,
                        newPassword: newPassword,
                    });
                    setPasswordChangeStatus("Password successfully changed.");
                }
                catch (error) {
                    console.error("Error changing password:", error);
                    setPasswordChangeStatus("Failed to change password. Please try again.");
                    toast.error("Failed to change password");
                    passwordChangeError = true;
                }
            }
        }
        // 🔹 If password change failed, stop execution
        if (passwordChangeError) {
            setIsSaving(false);
            return;
        }
        try {
            const updatedUserData = {
                ...userData,
                ...formData,
                thumbnail: uploadedURL || formData.thumbnail,
            };
            await updateUserProfile(updatedUserData);
            setUserData(updatedUserData);
            toggleSettingsUpdated();
            setShowSavedWindow(true);
            toast.success('Profile updated');
            setIsFormDirty(false);
            // 🔹 Refresh the user to reflect changes
            await refreshUser(true); // ✅ Refresh user data and tokens
            // 🔹 Reset password fields after success
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setPasswordChangeStatus('');
        }
        catch (error) {
            console.error("Failed to update user profile:", error);
            toast.error("Failed to update profile");
        }
        setIsSaving(false);
    };
    const roleKey = (userData?.role || '').toLowerCase();
    return (_jsx(_Fragment, { children: _jsx("div", { className: "settings-content", children: _jsxs("div", { className: "settings-container", children: [_jsx("h2", { className: "section-heading", children: "Account Info" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "settings-row", children: [_jsx(UserProfilePicture, { thumbnail: thumbnail, localPreview: localPreview, onChange: handleThumbnailChange }), _jsxs("div", { className: "role-display", children: [_jsx("span", { className: `role-badge role-${roleKey}`, title: ROLE_DESCRIPTIONS[roleKey], children: userData?.role }), _jsx("span", { title: ROLE_DESCRIPTIONS[roleKey], children: _jsx(HelpCircle, { size: 14, className: "role-info" }) })] })] }), _jsxs("div", { className: "field-grid", children: [_jsx(EditableTextField, { id: "firstName", label: "First Name", value: firstName, onChange: (v) => setFormData((p) => ({ ...p, firstName: v })) }), _jsx(EditableTextField, { id: "lastName", label: "Last Name", value: lastName, onChange: (v) => setFormData((p) => ({ ...p, lastName: v })) }), _jsx(EditableTextField, { id: "email", label: "Email", type: "email", value: email, onChange: (v) => setFormData((p) => ({ ...p, email: v })) }), _jsx(EditableTextField, { id: "phoneNumber", label: "Phone Number", type: "tel", value: phoneNumber, onChange: (v) => setFormData((p) => ({ ...p, phoneNumber: v })) }), _jsx(EditableTextField, { id: "company", label: "Organization", value: company, onChange: (v) => setFormData((p) => ({ ...p, company: v })) }), _jsx(EditableTextField, { id: "occupation", label: "Occupation", value: occupation, onChange: (v) => setFormData((p) => ({ ...p, occupation: v })) })] }), _jsxs("div", { className: "password-section", children: [_jsx("button", { type: "button", className: "modal-submit-button secondary password-toggle", onClick: () => setShowPasswordFields((p) => !p), children: "Change Password" }), showPasswordFields && (_jsxs("div", { className: "form-group form-group-password", children: [_jsx("label", { htmlFor: "password", children: "Password Change" }), _jsx("input", { type: "password", className: "modal-input-password", value: oldPassword, onChange: (e) => setOldPassword(e.target.value), placeholder: "Old Password" }), _jsx("input", { type: "password", className: "modal-input-password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "New Password" }), _jsx("input", { type: "password", className: "modal-input-password", value: confirmNewPassword, onChange: (e) => setConfirmNewPassword(e.target.value), placeholder: "Confirm New Password" }), passwordChangeStatus && _jsx("div", { children: passwordChangeStatus })] }))] }), _jsx("div", { className: "save-row", children: _jsx("button", { type: "submit", className: "modal-submit-button settings primary", disabled: isSaving || !isFormDirty, children: isSaving ? 'Saving...' : showSavedWindow ? 'Saved' : 'Save' }) })] }), _jsx("hr", { className: "section-divider" }), _jsx(PaymentsSection, { lastInvoiceDate: userData?.invoices?.[0]?.date, lastInvoiceAmount: userData?.invoices?.[0]?.amount, invoiceList: userData?.invoices || [], projectBillingDetails: projects })] }) }) }));
};
export default Settings;
