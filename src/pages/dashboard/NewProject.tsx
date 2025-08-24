// NewProject.tsx
import React, { useState, useEffect } from "react";
import { uploadData } from "aws-amplify/storage";
import NewProjectHeader from "./components/NewProject/NewProjectHeader";
import ProjectName from "./components/NewProject/NewProjectName";
import NewProjectBudget from "./components/NewProject/NewProjectBudget";
import NewProjectFinishline from "./components/NewProject/NewProjectFinishLine";
import NewProjectUploadFiles from "./components/NewProject/NewProjectUploadFiles";
import NewProjectAddress from "./components/NewProject/NewProjectAddress";
import NewProjectDescription from "./components/NewProject/NewProjectDescription";
import { useData } from "../../app/contexts/DataProvider";
import { useAuth } from "../../app/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { slugify } from "../../utils/slug";
import { parseBudget } from "../../utils/budgetUtils";
import {
  POST_PROJECTS_URL,
  SEND_PROJECT_NOTIFICATION_URL,
  POST_PROJECT_TO_USER_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from "../../utils/api";

// ─────────────────────────────────────────────────────────
// Minimal types 
// ─────────────────────────────────────────────────────────
type LatLng = { lat: number; lng: number };

type UploadedFile = { fileName: string; url: string };

type NewProjectItem = {
  title: string;
  date: string;
  dateCreated: string;
  milestone: string; // "10" etc.
  finishline: string; // YYYY-MM-DD
  description: string;
  location: LatLng;
  address: string;
  budget: { date: string; total: number };
  contact: { contact: string; name: string; phone: string };
  galleries: unknown[];
  invoiceDate: string;
  invoices: unknown[];
  slug: string;
  status: string;
  tags: string[];
  team: Array<{ userId: string }>;
  revisionHistory: unknown[];
  thumbnails: string[];
  downloads: string[];
  color: string;
  uploads: UploadedFile[];
};

type PutProjectPayload = {
  TableName: "Projects";
  Item: NewProjectItem;
};

type CreateProjectResponse = { projectId: string };

type UseDataSlice = {
  userName?: string;
  userId?: string;
  setActiveProject: (p: NewProjectItem & { projectId: string }) => void;
  setProjects: React.Dispatch<React.SetStateAction<any[]>>;
  setUserProjects: React.Dispatch<React.SetStateAction<any[]>>;
};

type UseAuthSlice = {
  setUser: React.Dispatch<
    React.SetStateAction<
      | (Record<string, unknown> & {
          projects?: string[];
        })
      | null
    >
  >;
};

const NewProject: React.FC = () => {
  const [projectName, setProjectName] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [finishline, setFinishLine] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string>("");

  const [location, setLocation] = useState<LatLng>({
    lat: 34.0522,
    lng: -118.2437,
  });
  const [address, setAddress] = useState<string>("Los Angeles, CA");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const { userName, userId, setActiveProject, setProjects, setUserProjects } =
    useData() as UseDataSlice;
  const navigate = useNavigate();
  const { setUser } = useAuth() as UseAuthSlice;

  const [validationMessage, setValidationMessage] = useState<string>("");

  // Collect the payload for initial creation
  const collectFormData = (): PutProjectPayload => {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

    // default admin team members (replace with your policy)
    const defaultAdmins = [
      { userId: "7e1581a0-2dda-4ad9-a2aa-17dd7f81d3b2" },
      { userId: "abe70c08-6743-44b5-99a9-f9638f606b1a" },
    ];

    const team = [
      ...defaultAdmins,
      ...(userId && !defaultAdmins.find((a) => a.userId === userId)
        ? [{ userId }]
        : []),
    ];

    return {
      TableName: "Projects",
      Item: {
        title: projectName,
        date: formattedDate,
        dateCreated: formattedDate,
        milestone: "10",
        finishline: finishline || formattedDate,
        description,
        location,
        address,
        budget: {
          date: formattedDate,
          total: parseBudget(budget),
        },
        contact: {
          contact: "N/A",
          name: "N/A",
          phone: "N/A",
        },
        galleries: [],
        invoiceDate: formattedDate,
        invoices: [],
        slug: "project-slug", // you might prefer slugify(projectName)
        status: "10%",
        tags: [],
        team,
        revisionHistory: [],
        thumbnails: [],
        downloads: [],
        color: "#FA3356",
        uploads: [],
      },
    };
  };

  // Upload files to S3 (Amplify Storage)
  const handleFileUpload = async (projectId: string): Promise<UploadedFile[]> => {
    const uploadedFileUrls: UploadedFile[] = [];
    try {
      let completed = 0;
      const totalFiles = selectedFiles.length;

      const uploadPromises = selectedFiles.map(async (file) => {
        const filename = `projects/${projectId}/uploads/${file.name}`;
        // amplify v6 uploadData signature
        await uploadData({
          key: filename,
          data: file,
          options: { accessLevel: "public" },
        } as any);

        const fileUrl = `${S3_PUBLIC_BASE}/${filename}`;
        uploadedFileUrls.push({ fileName: file.name, url: fileUrl });

        completed += 1;
        setUploadProgress(Math.round((completed / Math.max(1, totalFiles)) * 100));
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    return uploadedFileUrls;
  };

  // Optional: notify via email
  const handleNotification = async (projectData: Record<string, unknown>) => {
    try {
      const response = await apiFetch(SEND_PROJECT_NOTIFICATION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });
      if (!("ok" in response) || !response.ok) {
        throw new Error("Failed to send notification");
      }
      console.log("Notification sent successfully");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Basic validation
  const validateForm = (): boolean => {
    return !!(projectName && budget && finishline && description && address);
  };

  /**
   * Final submit handler for creating a new project.
   * - Collects project data.
   * - Sends the data to the backend to create the project.
   * - Updates the user's profile and uploads files.
   * - (Optional) Sends a notification email.
   */
  const handleFinalSubmit = async () => {
    if (!validateForm()) {
      setValidationMessage("Please fill all fields");
      setTimeout(() => setValidationMessage(""), 2000);
      return;
    }
    setValidationMessage("");
    if (isSubmitting) return;

    setIsSubmitting(true);
    const initialProjectData = collectFormData();

    try {
      // Create project
      const createResponse = await apiFetch(POST_PROJECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialProjectData),
      });

      if (!("ok" in createResponse) || !createResponse.ok) {
        throw new Error("Network response was not ok");
      }
      const data = (await createResponse.json()) as CreateProjectResponse;
      const realProjectId = data.projectId;

      // Update user profile
      const updateUserProfileResponse = await apiFetch(
        `${POST_PROJECT_TO_USER_URL}?TableName=userProfiles&userId=${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newProjectId: realProjectId }),
        }
      );
      if (!("ok" in updateUserProfileResponse) || !updateUserProfileResponse.ok) {
        throw new Error("Error updating user profile with new project ID");
      }
      console.log("User profile updated with new project.");

      // Upload files (if any)
      const uploadedFileUrls = await handleFileUpload(realProjectId);

      // Update project with uploads
      const updateData = { uploads: uploadedFileUrls };
      const updateResponse = await apiFetch(
        `${POST_PROJECTS_URL}?TableName=Projects&projectId=${realProjectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );
      if (!("ok" in updateResponse) || !updateResponse.ok) {
        throw new Error("Error updating project with file URLs");
      }

      const newProject: NewProjectItem & { projectId: string } = {
        ...initialProjectData.Item,
        projectId: realProjectId,
        uploads: uploadedFileUrls,
      };

      // Optional email notification
      // await handleNotification({
      //   projectId: realProjectId,
      //   projectName,
      //   budget,
      //   finishline,
      //   description,
      //   location,
      //   address,
      //   userName,
      // });

      console.log("Success!");
      setSubmissionSuccess(true);
      handleNewProjectCreated(newProject);
    } catch (error) {
      console.error("There was an error with the submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewProjectCreated = (newProject: NewProjectItem & { projectId: string }) => {
    // Add the new project to local lists
    setProjects((prev) => (Array.isArray(prev) ? [...prev, newProject] : [newProject]));
    setUserProjects((prev) => (Array.isArray(prev) ? [...prev, newProject] : [newProject]));

    // Update the authenticated user's profile locally with the new project ID
    setUser((prev) => {
      if (!prev) return prev;
      const prevProjects = Array.isArray(prev.projects) ? prev.projects : [];
      return { ...prev, projects: [...prevProjects, newProject.projectId] };
    });

    // Set active & navigate
    setActiveProject(newProject);
    const slug = slugify(newProject.title);
    navigate(`/dashboard/projects/${slug}`);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="dashboard-wrapper active-project-details"
      style={{ paddingBottom: "5px" }}
    >
      <NewProjectHeader />

      <div className="column-0" style={{ marginBottom: "5px" }}>
        <ProjectName projectName={projectName} setProjectName={setProjectName} />
      </div>

      <div className="newProject-dashboard-layout" style={{ marginBottom: "5px" }}>
        <div className="new-project-col1" style={{ marginRight: "5px" }}>
          <NewProjectBudget
            budget={budget}
            setBudget={setBudget}
            style={{ marginBottom: "5px" }}
          />
          <NewProjectFinishline finishline={finishline} setFinishLine={setFinishLine} />
        </div>

        <div className="new-project-col2">
          <NewProjectUploadFiles
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            selectedFileNames={selectedFileNames}
            setSelectedFileNames={setSelectedFileNames}
          />
        </div>
      </div>

      <div className="newProject-dashboard-layout">
        <NewProjectAddress
          location={location}
          setLocation={setLocation}
          address={address}
          setAddress={setAddress}
          style={{ marginRight: "5px" }}
        />
        <NewProjectDescription description={description} setDescription={setDescription} />
      </div>

      <div className="newProject-dashboard-layout" />

      <div className="column-final-btn">
        <div
          className={`final-btn-container ${
            submissionSuccess ? "final-btn-container-success" : ""
          }`}
        >
          {!submissionSuccess ? (
            <>
              <button
                type="submit"
                className="final-submit-button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="submit-spinner">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 50 50"
                      className="submit-spinner-svg"
                    >
                      <circle
                        className="submit-spinner-path"
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                      />
                    </svg>
                  </div>
                ) : validationMessage ? (
                  validationMessage
                ) : (
                  "Submit"
                )}
              </button>

              {isSubmitting && selectedFiles.length > 0 && (
                <>
                  <div className="upload-progress-bar">
                    <div
                      className="upload-progress-completed"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="upload-progress-text">
                    Uploading {uploadProgress}%
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="success-animation">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                <path
                  className="checkmark__check"
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewProject;
