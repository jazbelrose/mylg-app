import React, { useEffect, useState, ChangeEvent } from "react";
import { useData } from "../../app/contexts/DataProvider";
import { uploadData } from "aws-amplify/storage";
import { useAuth } from "../../app/contexts/AuthContext";
import { updatePassword } from "aws-amplify/auth";
import User from "../../assets/svg/user.svg?react";
import { toast } from "react-toastify";
import { updateUserProfile, S3_PUBLIC_BASE } from "../../utils/api";
import PaymentsSection from "./components/PaymentsSection";
import EditableTextField from "../../components/EditableTextField";
import UserProfilePicture from "../../components/UserProfilePicture";
import { HelpCircle } from "lucide-react";

type RoleKey = "admin" | "designer" | "builder" | "vendor" | "client" | "";

interface UserData {
  userId: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phoneNumber?: string;
  thumbnail?: string;
  occupation?: string;
  role?: string;
  invoices?: { date?: string; amount?: number }[];
}

interface FormDataShape {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phoneNumber: string;
  thumbnail: string;
  occupation: string;
}

const Settings: React.FC = () => {
  // Contexts (loosely typed to ease drop-in)
  const { refreshUser } = useAuth() as { refreshUser: (force?: boolean) => Promise<void> };
  const { userData, setUserData, toggleSettingsUpdated, projects } = useData() as {
    userData: UserData;
    setUserData: (u: UserData) => void;
    toggleSettingsUpdated: () => void;
    projects: any[];
  };

  const [formData, setFormData] = useState<FormDataShape>({
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    company: userData?.company || "",
    email: userData?.email || "",
    phoneNumber: userData?.phoneNumber || "",
    thumbnail: userData?.thumbnail || "",
    occupation: userData?.occupation || "",
  });

  const { firstName, lastName, company, email, phoneNumber, occupation, thumbnail } = formData;

  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<string>("");
  const [showPasswordFields, setShowPasswordFields] = useState<boolean>(false);
  const [showSavedWindow, setShowSavedWindow] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);

  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadedURL, setUploadedURL] = useState<string | null>(null);

  const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
    admin: "Full administrative access",
    designer: "Create and manage designs",
    builder: "Manage build tasks",
    vendor: "Vendor access to supply orders",
    client: "View project progress",
    "": "",
  };

  useEffect(() => {
    if (showSavedWindow) {
      const timeoutId = setTimeout(() => setShowSavedWindow(false), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [showSavedWindow]);

  // Refresh form when userData changes
  useEffect(() => {
    setFormData({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      company: userData?.company || "",
      email: userData?.email || "",
      phoneNumber: userData?.phoneNumber || "",
      occupation: userData?.occupation || "",
      thumbnail: userData?.thumbnail ? `${userData.thumbnail}?t=${Date.now()}` : "",
    });
  }, [userData]);

  const handleFileUpload = async (userId: string, file: File): Promise<string> => {
    try {
      const filename = `userData-thumbnails/${userId}/${file.name}`;
      const result = await uploadData({
        key: filename,
        data: file,
        options: { accessLevel: "public" },
      });
      // eslint-disable-next-line no-console
      console.log("Thumbnail uploaded:", result);
      const completeUrl = `${S3_PUBLIC_BASE}/${filename}`;
      return `${completeUrl}?t=${Date.now()}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload image");
      throw error;
    }
  };

  const handleThumbnailChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewURL = URL.createObjectURL(file);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(previewURL);
    setIsFormDirty(true);

    try {
      const uploaded = await handleFileUpload(userData.userId, file);
      setUploadedURL(uploaded);
      // eslint-disable-next-line no-console
      console.log("Uploaded URL stored:", uploaded);
    } catch (err) {
      // already toasted inside handleFileUpload
    } finally {
      // reset input value to allow re-uploading same file if needed
      e.target.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const checkIfFormIsDirty = () => {
    const initialValues: Omit<FormDataShape, "thumbnail"> = {
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      company: userData?.company || "",
      email: userData?.email || "",
      phoneNumber: userData?.phoneNumber || "",
      occupation: userData?.occupation || "",
    };

    const profileDirty = (Object.keys(initialValues) as Array<keyof typeof initialValues>).some(
      (key) => formData[key] !== initialValues[key]
    );

    const passwordDirty =
      oldPassword.trim() !== "" || newPassword.trim() !== "" || confirmNewPassword.trim() !== "";

    setIsFormDirty(profileDirty || passwordDirty || Boolean(uploadedURL));
  };

  useEffect(() => {
    checkIfFormIsDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, oldPassword, newPassword, confirmNewPassword, uploadedURL]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    let passwordChangeError = false;

    // Password change flow if fields provided
    if (oldPassword && newPassword && confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        setPasswordChangeStatus("New passwords do not match.");
        passwordChangeError = true;
      } else {
        try {
          await updatePassword({
            oldPassword,
            newPassword,
          });
          setPasswordChangeStatus("Password successfully changed.");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error changing password:", error);
          setPasswordChangeStatus("Failed to change password. Please try again.");
          toast.error("Failed to change password");
          passwordChangeError = true;
        }
      }
    }

    if (passwordChangeError) {
      setIsSaving(false);
      return;
    }

    try {
      const updatedUserData: UserData = {
        ...userData,
        ...formData,
        thumbnail: uploadedURL || formData.thumbnail,
      };

      await updateUserProfile(updatedUserData);
      setUserData(updatedUserData);
      toggleSettingsUpdated();
      setShowSavedWindow(true);
      toast.success("Profile updated");
      setIsFormDirty(false);

      // Refresh user session/profile
      await refreshUser(true);

      // Reset password fields
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordChangeStatus("");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update user profile:", error);
      toast.error("Failed to update profile");
    }

    setIsSaving(false);
  };

  const roleKey = ((userData?.role || "").toLowerCase() as RoleKey) || "";

  return (
    <>
      <div className="settings-content">
        <div className="settings-container">
          <h2 className="section-heading">Account Info</h2>

          <form onSubmit={handleSubmit}>
            <div className="settings-row">
              <UserProfilePicture
                thumbnail={thumbnail}
                localPreview={localPreview || undefined}
                onChange={handleThumbnailChange}
              />
              <div className="role-display">
                <span
                  className={`role-badge role-${roleKey}`}
                  title={ROLE_DESCRIPTIONS[roleKey]}
                >
                  {userData?.role}
                </span>
                <span title={ROLE_DESCRIPTIONS[roleKey]}>
                  <HelpCircle size={14} className="role-info" />
                </span>
              </div>
            </div>

            <div className="field-grid">
              <EditableTextField
                id="firstName"
                label="First Name"
                value={firstName}
                onChange={(v: string) => setFormData((p) => ({ ...p, firstName: v }))}
              />
              <EditableTextField
                id="lastName"
                label="Last Name"
                value={lastName}
                onChange={(v: string) => setFormData((p) => ({ ...p, lastName: v }))}
              />
              <EditableTextField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(v: string) => setFormData((p) => ({ ...p, email: v }))}
              />
              <EditableTextField
                id="phoneNumber"
                label="Phone Number"
                type="tel"
                value={phoneNumber}
                onChange={(v: string) => setFormData((p) => ({ ...p, phoneNumber: v }))}
              />
              <EditableTextField
                id="company"
                label="Organization"
                value={company}
                onChange={(v: string) => setFormData((p) => ({ ...p, company: v }))}
              />
              <EditableTextField
                id="occupation"
                label="Occupation"
                value={occupation}
                onChange={(v: string) => setFormData((p) => ({ ...p, occupation: v }))}
              />
            </div>

            <div className="password-section">
              <button
                type="button"
                className="modal-submit-button secondary password-toggle"
                onClick={() => setShowPasswordFields((p) => !p)}
              >
                Change Password
              </button>

              {showPasswordFields && (
                <div className="form-group form-group-password">
                  <label htmlFor="password">Password Change</label>
                  <input
                    type="password"
                    className="modal-input-password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Old Password"
                  />
                  <input
                    type="password"
                    className="modal-input-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                  />
                  <input
                    type="password"
                    className="modal-input-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm New Password"
                  />
                  {passwordChangeStatus && <div>{passwordChangeStatus}</div>}
                </div>
              )}
            </div>

            <div className="save-row">
              <button
                type="submit"
                className="modal-submit-button settings primary"
                disabled={isSaving || !isFormDirty}
              >
                {isSaving ? "Saving..." : showSavedWindow ? "Saved" : "Save"}
              </button>
            </div>
          </form>

          <hr className="section-divider" />

          <PaymentsSection
            lastInvoiceDate={userData?.invoices?.[0]?.date}
            lastInvoiceAmount={userData?.invoices?.[0]?.amount}
            invoiceList={userData?.invoices || []}
            projectBillingDetails={projects}
          />
        </div>
      </div>
    </>
  );
};

export default Settings;
