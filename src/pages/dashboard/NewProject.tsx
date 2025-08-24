import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '../../components/ModalWithStack';
import { uploadData } from 'aws-amplify/storage';
import NewProjectHeader from './components/NewProject/NewProjectHeader';
import ProjectName from './components/NewProject/NewProjectName';
import NewProjectBudget from './components/NewProject/NewProjectBudget';
import NewProjectFinishline from './components/NewProject/NewProjectFinishLine';
import NewProjectUploadFiles from './components/NewProject/NewProjectUploadFiles';
import NewProjectAddress from './components/NewProject/NewProjectAddress';
import NewProjectDescription from './components/NewProject/NewProjectDescription';
import { useData } from '../../app/contexts/DataProvider';
import { useAuth } from '../../app/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../../utils/slug';
import { parseBudget } from '../../utils/budgetUtils';
import { POST_PROJECTS_URL, SEND_PROJECT_NOTIFICATION_URL, POST_PROJECT_TO_USER_URL, S3_PUBLIC_BASE, apiFetch, } from '../../utils/api';
const NewProject: React.FC = () => {
    const [projectName, setProjectName] = useState<string>('');
    const [budget, setBudget] = useState<string>('');
    const [finishline, setFinishLine] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [selectedFileNames, setSelectedFileNames] = useState<string>("");
    const [location, setLocation] = useState<{lat: number, lng: number}>({ lat: 34.0522, lng: -118.2437 });
    const [address, setAddress] = useState<string>('Los Angeles, CA');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const { userName, userId, setActiveProject, setProjects, setUserProjects } = useData();
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [validationError, setValidationError] = useState<string>('');
    const [validationMessage, setValidationMessage] = useState<string>('');
    const collectFormData = () => {
        const currentDate = new Date();
        const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        // Define default admin team members
        const defaultAdmins = [
            { userId: "7e1581a0-2dda-4ad9-a2aa-17dd7f81d3b2" },
            { userId: "abe70c08-6743-44b5-99a9-f9638f606b1a" }
        ];
        // Create the team list starting with the default admins
        let team = [...defaultAdmins];
        // If the current user is not already in the default admins, add them
        if (!defaultAdmins.find(admin => admin.userId === userId)) {
            team.push({ userId });
        }
        return {
            TableName: "Projects",
            Item: {
                title: projectName,
                date: formattedDate,
                dateCreated: formattedDate,
                milestone: '10',
                finishline: finishline || formattedDate,
                description: description,
                location: location,
                address: address,
                budget: {
                    date: formattedDate,
                    total: parseBudget(budget)
                },
                contact: {
                    contact: 'N/A',
                    name: 'N/A',
                    phone: 'N/A'
                },
                galleries: [],
                invoiceDate: formattedDate,
                invoices: [],
                slug: 'project-slug',
                status: '10%',
                tags: [],
                team: team,
                revisionHistory: [],
                thumbnails: [],
                downloads: [],
                color: '#FA3356',
                uploads: []
            }
        };
    };
    const handleFileUpload = async (projectId) => {
        const uploadedFileUrls = [];
        try {
            let completed = 0;
            const totalFiles = selectedFiles.length;
            const uploadPromises = selectedFiles.map(async (file) => {
                const filename = `projects/${projectId}/uploads/${file.name}`;
                const result = await uploadData({
                    key: filename,
                    data: file,
                    options: {
                        accessLevel: 'public',
                    },
                });
                console.log('File uploaded:', result);
                const fileUrl = `${S3_PUBLIC_BASE}/${filename}`;
                uploadedFileUrls.push({ fileName: file.name, url: fileUrl });
                completed += 1;
                setUploadProgress(Math.round((completed / totalFiles) * 100));
            });
            await Promise.all(uploadPromises);
        }
        catch (error) {
            console.error('Error uploading files:', error);
        }
        return uploadedFileUrls;
    };
    const handleNotification = async (projectData) => {
        try {
            const response = await apiFetch(SEND_PROJECT_NOTIFICATION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData),
            });
            if (!response.ok) {
                throw new Error('Failed to send notification');
            }
            console.log('Notification sent successfully');
        }
        catch (error) {
            console.error('Error sending notification:', error);
        }
    };
    // Validation function
    const validateForm = () => {
        if (!projectName || !budget || !finishline || !description || !address) {
            return false; // Validation fails if any required field is empty
        }
        return true; // Validation passes if all required fields are filled
    };
    /**
     * Final submit handler for creating a new project.
     * - Collects project data.
     * - Sends the data to the backend to create the project.
     * - Updates the user's profile and uploads files.
     * - Sends a notification email.
     */
    const handleFinalSubmit = async () => {
        if (!validateForm()) {
            setValidationMessage('Please fill all fields');
            setTimeout(() => setValidationMessage(''), 2000);
            return;
        }
        setValidationMessage('');
        if (isSubmitting)
            return;
        setIsSubmitting(true);
        const initialProjectData = collectFormData();
        try {
            // Create project
            const createResponse = await apiFetch(POST_PROJECTS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initialProjectData),
            });
            if (!createResponse.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await createResponse.json();
            const realProjectId = data.projectId;
            // Update user profile
            const updateUserProfileResponse = await apiFetch(`${POST_PROJECT_TO_USER_URL}?TableName=userProfiles&userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newProjectId: realProjectId }),
            });
            if (!updateUserProfileResponse.ok) {
                throw new Error('Error updating user profile with new project ID');
            }
            console.log("User profile updated with new project.");
            // Upload files
            const uploadedFileUrls = await handleFileUpload(realProjectId);
            const updateData = {
                uploads: uploadedFileUrls
            };
            // Update project with uploads
            const updateResponse = await apiFetch(`${POST_PROJECTS_URL}?TableName=Projects&projectId=${realProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            if (!updateResponse.ok) {
                throw new Error('Error updating project with file URLs');
            }
            const newProject = {
                ...initialProjectData.Item,
                projectId: realProjectId,
                uploads: uploadedFileUrls
            };
            // // Send notification
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
            console.log('Success!');
            setSubmissionSuccess(true);
            handleNewProjectCreated(newProject);
        }
        catch (error) {
            console.error('There was an error with the submission:', error);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleNewProjectCreated = (newProject) => {
        // Add the new project to the local project lists
        setProjects(prev => Array.isArray(prev) ? [...prev, newProject] : [newProject]);
        setUserProjects(prev => Array.isArray(prev) ? [...prev, newProject] : [newProject]);
        // Update the authenticated user's profile locally with the new project ID
        setUser(prev => {
            if (!prev)
                return prev;
            const prevProjects = Array.isArray(prev.projects) ? prev.projects : [];
            return { ...prev, projects: [...prevProjects, newProject.projectId] };
        });
        // Set the new project as active and navigate to it
        setActiveProject(newProject);
        const slug = slugify(newProject.title);
        navigate(`/dashboard/projects/${slug}`);
    };
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    return (_jsxs("div", { className: "dashboard-wrapper active-project-details", style: { paddingBottom: '5px' }, children: [_jsx(NewProjectHeader, {}), _jsx("div", { className: "column-0", style: { marginBottom: '5px' }, children: _jsx(ProjectName, { projectName: projectName, setProjectName: setProjectName }) }), _jsxs("div", { className: 'newProject-dashboard-layout', style: { marginBottom: '5px' }, children: [_jsxs("div", { className: "new-project-col1", style: { marginRight: '5px' }, children: [_jsx(NewProjectBudget, { budget: budget, setBudget: setBudget, style: { marginBottom: '5px' } }), _jsx(NewProjectFinishline, { finishline: finishline, setFinishLine: setFinishLine })] }), _jsx("div", { className: "new-project-col2", children: _jsx(NewProjectUploadFiles, { selectedFiles: selectedFiles, setSelectedFiles: setSelectedFiles, selectedFileNames: selectedFileNames, setSelectedFileNames: setSelectedFileNames }) })] }), _jsxs("div", { className: 'newProject-dashboard-layout', children: [_jsx(NewProjectAddress, { location: location, setLocation: setLocation, address: address, setAddress: setAddress, style: { marginRight: '5px' } }), _jsx(NewProjectDescription, { description: description, setDescription: setDescription })] }), _jsx("div", { className: 'newProject-dashboard-layout' }), _jsx("div", { className: "column-final-btn", children: _jsx("div", { className: `final-btn-container ${submissionSuccess ? 'final-btn-container-success' : ''}`, children: !submissionSuccess ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "submit", className: "final-submit-button", onClick: handleFinalSubmit, disabled: isSubmitting, children: isSubmitting ? (_jsx("div", { className: "submit-spinner", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 50 50", className: "submit-spinner-svg", children: _jsx("circle", { className: "submit-spinner-path", cx: "25", cy: "25", r: "20", fill: "none" }) }) })) : validationMessage ? (validationMessage) : ('Submit') }), isSubmitting && selectedFiles.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "upload-progress-bar", children: _jsx("div", { className: "upload-progress-completed", style: { width: `${uploadProgress}%` } }) }), _jsxs("div", { className: "upload-progress-text", children: ["Uploading ", uploadProgress, "%"] })] }))] })) : (_jsx("div", { className: "success-animation", children: _jsxs("svg", { className: "checkmark", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 52 52", children: [_jsx("circle", { className: "checkmark__circle", cx: "26", cy: "26", r: "25", fill: "none" }), _jsx("path", { className: "checkmark__check", fill: "none", d: "M14.1 27.2l7.1 7.2 16.7-16.8" })] }) })) }) })] }));
};
export default NewProject;
