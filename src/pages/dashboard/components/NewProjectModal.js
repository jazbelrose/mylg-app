import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Row, Col } from 'antd';
import { uploadData } from 'aws-amplify/storage';
import NewProjectUploadFiles from './NewProject/NewProjectUploadFiles';
import NewProjectAddress from './NewProject/NewProjectAddress';
import { useData } from '../../app/contexts/DataProvider';
import { useAuth } from '../../app/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../../utils/slug';
import { parseBudget } from '../../utils/budgetUtils';
import {
  POST_PROJECTS_URL,
  POST_PROJECT_TO_USER_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from '../../utils/api';

/**
 * Modal form for creating a new project.
 * Keeps existing submit logic, file upload and map/address picker.
 */
export default function NewProjectModal({ open, onCancel, onCreated }) {
  const [form] = Form.useForm();
  const [projectName, setProjectName] = useState('');
  const [budget, setBudget] = useState('');
  const [finishline, setFinishLine] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState('');
  const [location, setLocation] = useState({ lat: 34.0522, lng: -118.2437 });
  const [address, setAddress] = useState('Los Angeles, CA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const { userId, setActiveProject, setProjects, setUserProjects } = useData();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setProjectName('');
      setBudget('');
      setFinishLine('');
      setDescription('');
      setSelectedFiles([]);
      setSelectedFileNames('');
      setLocation({ lat: 34.0522, lng: -118.2437 });
      setAddress('Los Angeles, CA');
      setValidationMessage('');
      setUploadProgress(0);
    }
  }, [open, form]);

  const collectFormData = () => {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(
      currentDate.getDate()
    ).padStart(2, '0')}`;
    const defaultAdmins = [
      { userId: '7e1581a0-2dda-4ad9-a2aa-17dd7f81d3b2' },
      { userId: 'abe70c08-6743-44b5-99a9-f9638f606b1a' },
    ];
    let team = [...defaultAdmins];
    if (!defaultAdmins.find((admin) => admin.userId === userId)) {
      team.push({ userId });
    }
    return {
      TableName: 'Projects',
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
          total: parseBudget(budget),
        },
        contact: {
          contact: 'N/A',
          name: 'N/A',
          phone: 'N/A',
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
        uploads: [],
      },
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
    } catch (error) {
      console.error('Error uploading files:', error);
    }
    return uploadedFileUrls;
  };

  const validateForm = () => {
    if (!projectName || !budget || !finishline || !description || !address) {
      return false;
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!validateForm()) {
      setValidationMessage('Please fill all fields');
      setTimeout(() => setValidationMessage(''), 2000);
      return;
    }
    setValidationMessage('');
    if (isSubmitting) return;
    setIsSubmitting(true);
    const initialProjectData = collectFormData();
    try {
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
      const updateUserProfileResponse = await apiFetch(
        `${POST_PROJECT_TO_USER_URL}?TableName=userProfiles&userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newProjectId: realProjectId }),
        }
      );
      if (!updateUserProfileResponse.ok) {
        throw new Error('Error updating user profile with new project ID');
      }
      console.log('User profile updated with new project.');
      const uploadedFileUrls = await handleFileUpload(realProjectId);
      const updateData = {
        uploads: uploadedFileUrls,
      };
      const updateResponse = await apiFetch(
        `${POST_PROJECTS_URL}?TableName=Projects&projectId=${realProjectId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );
      if (!updateResponse.ok) {
        throw new Error('Error updating project with file URLs');
      }
      const newProject = {
        ...initialProjectData.Item,
        projectId: realProjectId,
        uploads: uploadedFileUrls,
      };
      handleNewProjectCreated(newProject);
      onCreated?.(newProject);
      onCancel?.();
    } catch (error) {
      console.error('There was an error with the submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewProjectCreated = (newProject) => {
    setProjects((prev) => (Array.isArray(prev) ? [...prev, newProject] : [newProject]));
    setUserProjects((prev) => (Array.isArray(prev) ? [...prev, newProject] : [newProject]));
    setUser((prev) => {
      if (!prev) return prev;
      const prevProjects = Array.isArray(prev.projects) ? prev.projects : [];
      return { ...prev, projects: [...prevProjects, newProject.projectId] };
    });
    setActiveProject(newProject);
    const slug = slugify(newProject.title);
    navigate(`/dashboard/projects/${slug}`);
  };

  return (
    <Modal
      open={open}
      title="Create Project"
      onCancel={onCancel}
      maskClosable={false}
      destroyOnClose
      okButtonProps={{ style: { display: 'none' } }}
      aria-label="Create project modal"
    >
      <Form form={form} layout="vertical" onFinish={handleFinalSubmit} autoComplete="off">
        <Row gutter={[8, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="projectName"
              label="Project Name"
              rules={[{ required: true, message: 'Project name required' }]}
            >
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                aria-label="Project Name"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="budget"
              label="Budget"
              rules={[{ required: true, message: 'Budget required' }]}
            >
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-label="Budget"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[8, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="finishline"
              label="Finish Line"
              rules={[{ required: true, message: 'Finish line required' }]}
            >
              <Input
                type="date"
                value={finishline}
                onChange={(e) => setFinishLine(e.target.value)}
                aria-label="Finish Line"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Uploads" name="uploads">
              <NewProjectUploadFiles
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                selectedFileNames={selectedFileNames}
                setSelectedFileNames={setSelectedFileNames}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="Address"
          required
        >
          <NewProjectAddress
            location={location}
            setLocation={setLocation}
            address={address}
            setAddress={setAddress}
          />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Description required' }]}
        >
          <Input.TextArea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Description"
          />
        </Form.Item>
        {validationMessage && (
          <div className="validation-message" style={{ color: 'red', marginBottom: 8 }}>
            {validationMessage}
          </div>
        )}
        {isSubmitting && selectedFiles.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              className="upload-progress-bar"
              style={{ width: '100%', background: '#eee', height: 8, borderRadius: 4 }}
            >
              <div
                className="upload-progress-completed"
                style={{
                  width: `${uploadProgress}%`,
                  background: '#1890ff',
                  height: '100%',
                  borderRadius: 4,
                }}
              />
            </div>
            <div className="upload-progress-text" style={{ fontSize: 12, marginTop: 4 }}>
              Uploading {uploadProgress}%
            </div>
          </div>
        )}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            block
            aria-label="Submit"
          >
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

