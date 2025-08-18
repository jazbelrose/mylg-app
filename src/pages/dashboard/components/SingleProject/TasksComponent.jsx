import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Select,
  Button,
  Dropdown,
  Modal,
  Form,
  Input,
  Tooltip,
  DatePicker,
  AutoComplete,
  ConfigProvider,
  theme,
  message
} from 'antd';
import { NOMINATIM_SEARCH_URL, apiFetch } from '../../../../utils/api';
import {
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  DownOutlined
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { fetchTasks, createTask, updateTask, deleteTask } from '../../../../utils/api';
import { fetchUserProfilesBatch } from '../../../../utils/api';
import useBudgetData from './useBudgetData';
import '../../components/SingleProject/tasks-table.css';

/**
 * Task table with in-place editing using Ant Design components.
 * Displays tasks and allows editing status, comments, and other fields.
 */
const statusOptions = [
  { value: 'TODO', label: 'To Do' },
  { value: 'INPROGRESS', label: 'In Progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'COMPLETE', label: 'Complete' }
];

const TasksComponent = ({ projectId, userId, team = [] }) => {
  const [tasks, setTasks] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentTask, setCommentTask] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [assignForm] = Form.useForm();
  const [assignLocationSearch, setAssignLocationSearch] = useState('');
  const [assignLocationSuggestions, setAssignLocationSuggestions] = useState([]);
  const [assignTaskLocation, setAssignTaskLocation] = useState({ lat: '', lng: '' });
  const [assignTaskAddress, setAssignTaskAddress] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  // Get user's current location for sorting address suggestions
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserLocation(null);
        }
      );
    }
  }, []);
  // Location search for assign modal
  // Sort suggestions by proximity to userLocation if available
  const sortByProximity = (suggestions, userLoc) => {
    if (!userLoc) return suggestions;
    return [...suggestions].sort((a, b) => {
      const distA = Math.sqrt(Math.pow(userLoc.lat - parseFloat(a.lat), 2) + Math.pow(userLoc.lng - parseFloat(a.lon), 2));
      const distB = Math.sqrt(Math.pow(userLoc.lat - parseFloat(b.lat), 2) + Math.pow(userLoc.lng - parseFloat(b.lon), 2));
      return distA - distB;
    });
  };

  const fetchAssignLocationSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setAssignLocationSuggestions([]);
      return;
    }
    try {
      const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(query)}&addressdetails=1&limit=5`;
      const response = await apiFetch(url);
      let results = await response.json();
      results = sortByProximity(results, userLocation);
      setAssignLocationSuggestions(results);
    } catch (err) {
      setAssignLocationSuggestions([]);
    }
  };

  const handleAssignLocationSearchChange = (e) => {
    setAssignLocationSearch(e.target.value);
    fetchAssignLocationSuggestions(e.target.value);
  };

  const handleAssignLocationSuggestionSelect = (s) => {
    setAssignTaskLocation({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setAssignTaskAddress(s.display_name);
    setAssignLocationSearch(s.display_name);
    setAssignLocationSuggestions([]);
    // Set in form
    assignForm.setFieldsValue({ location: { lat: parseFloat(s.lat), lng: parseFloat(s.lon) }, address: s.display_name });
  };
  const [editForm] = Form.useForm();
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [taskLocation, setTaskLocation] = useState({ lat: '', lng: '' });
  const [taskAddress, setTaskAddress] = useState('');
  // Location search for modal
  const fetchLocationSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    try {
      const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(query)}&addressdetails=1&limit=5`;
      const response = await apiFetch(url);
      const results = await response.json();
      setLocationSuggestions(results);
    } catch (err) {
      setLocationSuggestions([]);
    }
  };

  const handleLocationSearchChange = (e) => {
    setLocationSearch(e.target.value);
    fetchLocationSuggestions(e.target.value);
  };

  const handleLocationSuggestionSelect = (s) => {
    setTaskLocation({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setTaskAddress(s.display_name);
    setLocationSearch(s.display_name);
    setLocationSuggestions([]);
    // Set in form
    editForm.setFieldsValue({ location: { lat: parseFloat(s.lat), lng: parseFloat(s.lon) }, address: s.display_name });
  };
  const { budgetItems } = useBudgetData(projectId);
  const [teamProfiles, setTeamProfiles] = useState([]);
  // Fetch user profiles for team userIds
  useEffect(() => {
    const fetchProfiles = async () => {
      if (Array.isArray(team) && team.length > 0) {
        const userIds = team.map((member) => member.userId).filter(Boolean);
        const profiles = await fetchUserProfilesBatch(userIds);
        setTeamProfiles(profiles);
      } else {
        setTeamProfiles([]);
      }
    };
    fetchProfiles();
  }, [team]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks(projectId);
        // Ensure each task has both projectId and taskId
        const mapped = data.map((t) => ({ ...t, id: t.taskId, projectId: t.projectId, name: (t.name || '').toUpperCase() }));
        setTasks(mapped);
      } catch (err) {
        console.error('Failed to fetch tasks', err);
        setTasks([]);
      }
    };
    loadTasks();
  }, [projectId]);

// Helper
const getDisplayName = (m = {}) => {
  const first = m.firstName || "";
  const last  = m.lastName  || "";
  const name  = `${first} ${last}`.trim();
  return name || m.displayName || m.username || m.userId || "";
};

// Assignee select options
const assigneeOptions = Array.isArray(teamProfiles) && teamProfiles.length > 0
  ? teamProfiles.map((p) => ({
      value: `${(p.firstName || "")}${(p.lastName || "")}__${p.userId}`,
      label: getDisplayName(p) || p.userId,
    }))
  : [];

  const priorityOptions = ['Low', 'Medium', 'High'].map((p) => ({ value: p, label: p }));
  const budgetOptions = budgetItems.map((it) => {
    const desc = (it.descriptionShort || it.description || '').slice(0, 50);
    return {
      value: it.budgetItemId,
      label: `${it.elementId} (${desc})`,
      elementId: it.elementId
    };
  });
  const taskNameOptions = budgetItems.map((it) => {
    const labelBase = (it.descriptionShort || it.description || '').split(' ').slice(0, 6).join(' ');
    return { label: labelBase, value: labelBase, elementId: it.elementId };
  });

  // Deduplicate by value (task name)
  const uniqueTaskNameOptions = Array.from(
    taskNameOptions.reduce((map, opt) => {
      if (!map.has(opt.value)) {
        map.set(opt.value, opt);
      }
      return map;
    }, new Map()).values()
  );

  const handleAssignTask = async () => {
    try {
      const values = await assignForm.validateFields();
      const id = uuidv4();
      const normalizedName = (values.name || '').toUpperCase();
      const payload = {
        projectId,
        taskId: id,
        assignedTo: values.assignedTo || '',
        budgetItemId: values.budgetCode || '',
        comments: '',
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : '',
        name: normalizedName,
        priority: values.priority || '',
        status: 'TODO',
        location: values.location || assignTaskLocation,
        address: values.address || assignTaskAddress
      };
      const saved = await createTask(payload);
      const mapped = { ...saved, id: saved.taskId, projectId: saved.projectId };
      setTasks((prev) => [...prev, mapped]);
      assignForm.resetFields();
      setAssignTaskLocation({ lat: '', lng: '' });
      setAssignTaskAddress('');
      setAssignLocationSearch('');
      setAssignLocationSuggestions([]);
    } catch (err) {
      console.error('Failed to assign task', err);
      message.error('Failed to assign task');
    }
  };

  const openTaskModal = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
    editForm.setFieldsValue(
      task || {
        name: '',
        assignedTo: '',
        dueDate: '',
        priority: '',
        budgetItemId: '',
        eventId: '',
        location: { lat: '', lng: '' },
        address: ''
      }
    );
    setTaskLocation(task?.location || { lat: '', lng: '' });
    setTaskAddress(task?.address || '');
    setLocationSearch(task?.address || '');
    setLocationSuggestions([]);
  };

  const saveTask = async () => {
    try {
      const values = await editForm.validateFields();
      const id = editingTask?.taskId || editingTask?.id || uuidv4();
      const normalizedName = (values.name || '').toUpperCase();
      const payload = {
        projectId,
        taskId: id,
        assignedTo: values.assignedTo || editingTask?.assignedTo || '',
        budgetItemId: values.budgetItemId || editingTask?.budgetItemId || '',
        comments: editingTask?.comments || '',
        dueDate: values.dueDate
          ? values.dueDate.format
            ? values.dueDate.format('YYYY-MM-DD')
            : values.dueDate
          : editingTask?.dueDate || '',
        name: normalizedName,
        priority: values.priority || editingTask?.priority || '',
        status: editingTask?.status || 'TODO',
        location: values.location || taskLocation,
        address: values.address || taskAddress
      };
      const saved = editingTask
        ? await updateTask(payload)
        : await createTask(payload);
      const mapped = { ...saved, id: saved.taskId, projectId: saved.projectId };
      setTasks((prev) => {
        const exists = prev.find((t) => t.id === mapped.id);
        return exists
          ? prev.map((t) => (t.id === mapped.id ? mapped : t))
          : [...prev, mapped];
      });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      editForm.resetFields();
      setTaskLocation({ lat: '', lng: '' });
      setTaskAddress('');
      setLocationSearch('');
      setLocationSuggestions([]);
    } catch (err) {
      console.error('Failed to save task', err);
      message.error('Failed to save task');
    }
  };

  const handleStatusChange = (id, status) => {
    // Normalize status to backend enums
    const normalized = typeof status === 'string' ? status.toUpperCase().replace(/\s+/g, '') : 'TODO';
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: normalized } : t)));
  };

  const openCommentModal = (task) => {
    setCommentTask(task);
    setCommentText(task.comments || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = () => {
    setTasks((prev) =>
      prev.map((t) => (t.id === commentTask.id ? { ...t, comments: commentText } : t))
    );
    setIsCommentModalOpen(false);
    setCommentTask(null);
  };

  const handleMenuClick = async (key, task) => {
    if (key === 'edit') {
      openTaskModal(task);
    } else if (key === 'delete') {
      const previousTasks = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      try {
        // Pass both projectId and taskId to deleteTask
        await deleteTask({ projectId: task.projectId, taskId: task.taskId || task.id });
      } catch (err) {
        console.error('Failed to delete task', err);
        setTasks(previousTasks);
        message.error('Failed to delete task');
      }
    }
  };

  const columns = [
    {
      title: 'Task',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
      render: (text) => (text || '').toUpperCase()
    },
    {
      title: 'Assignee',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 120,
      ellipsis: true,
      render: (text) => {
        // Display only firstName lastName if format is firstNamelastName__userId
        if (typeof text === 'string' && text.includes('__')) {
          const [name] = text.split('__');
          // Add space between first and last name if possible
          return name.replace(/([a-z])([A-Z])/g, '$1 $2');
        }
        return text;
      }
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      ellipsis: true
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      ellipsis: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      className: 'status-column',
      onHeaderCell: () => ({ colSpan: 3 }),
      render: (text, record) => (
        <Select
          aria-label="status-select"
          value={text}
          size="small"
          style={{ width: '100%', minWidth: 120 }}
          onChange={(value) => handleStatusChange(record.id, value)}
          options={statusOptions}
        />
      )
    },
    {
      title: '',
      dataIndex: 'comments',
      key: 'comments',
      width: 32,
      align: 'center',
      className: 'comment-column',
      onHeaderCell: () => ({ colSpan: 0 }),
      render: (text, record) => (
        <Tooltip title={text || 'Add comment'}>
          <Button
            type="text"
            size="small"
            aria-label="comment-button"
            icon={<MessageOutlined />}
            onClick={() => openCommentModal(record)}
          />
        </Tooltip>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      align: 'center',
      className: 'actions-column',
      onHeaderCell: () => ({ colSpan: 0 }),
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
              { key: 'delete', label: 'Delete', icon: <DeleteOutlined /> }
            ],
            onClick: ({ key }) => handleMenuClick(key, record)
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            size="small"
            aria-label="actions-dropdown"
            icon={<DownOutlined />}
          />
        </Dropdown>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="tasks-component">
        <div className="tasks-card">
          <Form form={assignForm} layout="vertical" className="assign-task-form">
            <h3>Assign Task</h3>
            <div className="form-row">
              <Form.Item
                label="Task Name"
                name="name"
                rules={[{ required: true, message: 'Task name required' }]}
              >
                <AutoComplete
                  size="small"
                  options={uniqueTaskNameOptions}
                  listHeight={160}
                  placeholder="Enter or select task"
                  filterOption={(inputValue, option) =>
                    option?.value?.toUpperCase().includes(inputValue.toUpperCase())
                  }
                />
              </Form.Item>
              <Form.Item label="Assigned To" name="assignedTo">
                <Select size="small" options={assigneeOptions} />
              </Form.Item>
              <Form.Item label="Due Date" name="dueDate">
                <DatePicker size="small" format="YYYY-MM-DD" />
              </Form.Item>
            </div>
            <div className="form-row">
              <Form.Item label="Priority" name="priority">
                <Select size="small" options={priorityOptions} />
              </Form.Item>
              <Form.Item label="Budget Element Id" name="budgetCode">
                <Select
                  size="small"
                  options={budgetOptions}
                  showSearch
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                  // Show only elementId in field after selection
                  optionLabelProp="elementId"
                  getPopupContainer={trigger => trigger.parentNode}
                  value={assignForm.getFieldValue('budgetCode')}
                  onChange={value => assignForm.setFieldsValue({ budgetCode: value })}
                  dropdownRender={menu => menu}
                />
              </Form.Item>
              <Form.Item label="Address" name="address">
                <Input
                  placeholder="Search address"
                  value={assignLocationSearch}
                  onChange={handleAssignLocationSearchChange}
                  autoComplete="off"
                />
                {assignLocationSuggestions.length > 0 && (
                  <div className="suggestions-list" style={{ position: 'absolute', zIndex: 10, background: '#222', border: '1px solid #444', borderRadius: 4, width: '100%' }}>
                    {assignLocationSuggestions.map((s, idx) => (
                      <div
                        key={s.place_id}
                        onClick={() => handleAssignLocationSuggestionSelect(s)}
                        style={{
                          padding: '6px 10px',
                          cursor: 'pointer',
                          borderBottom: idx < assignLocationSuggestions.length - 1 ? '1px solid #333' : 'none',
                          background: 'inherit',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#eee';
                          e.currentTarget.firstChild.style.color = '#222';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'inherit';
                          e.currentTarget.firstChild.style.color = '#fff';
                        }}
                      >
                        <span style={{ fontWeight: idx === 0 ? 'bold' : 'normal', color: '#fff' }}>{s.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Show selected address below input */}
                {assignTaskAddress && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>{assignTaskAddress}</div>
                )}
              </Form.Item>
            </div>
            <div className="form-row actions">
              <Button
                type="primary"
                size="small"
                className="modal-submit-button"
                onClick={handleAssignTask}
                style={{ background: '#FA3356', borderColor: '#FA3356' }}
              >
                Save
              </Button>
            </div>
          </Form>
<div
  className="tasks-table-wrapper"
  style={{ maxHeight: 400, overflow: "auto", position: "relative", paddingBottom: 0 }}
>
  <Table
    rowKey="id"
    columns={columns}
    dataSource={tasks}
    pagination={false}
    size="small"
    tableLayout="fixed"
    className="tasks-table custom-sticky-scrollbar"
    scroll={{ x: "max-content", y: 340 }}
    locale={{ emptyText: "No tasks yet!" }}
    sticky={{ offsetHeader: 0, offsetScroll: 0 }}
    style={{ fontSize: '11px' }}
  />
</div>


          <Modal
            title={editingTask ? 'Edit Task' : 'Add Task'}
            open={isTaskModalOpen}
            onOk={saveTask}
            onCancel={() => setIsTaskModalOpen(false)}
            centered
            okButtonProps={{
              style: { background: '#FA3356', borderColor: '#FA3356' }
            }}
          >
            <Form layout="vertical" form={editForm} preserve={false}>
              <Form.Item
                label="Task"
                name="name"
                rules={[{ required: true, message: 'Task name required' }]}
              >
                <AutoComplete
                  options={taskNameOptions}
                  listHeight={160}
                  placeholder="Enter or select task"
                  filterOption={(inputValue, option) =>
                    option?.value?.toUpperCase().includes(inputValue.toUpperCase())
                  }
                />
              </Form.Item>
              <Form.Item label="Assignee" name="assignedTo">
                <Select size="small" options={assigneeOptions} />
              </Form.Item>
              <Form.Item label="Due Date" name="dueDate">
                <Input type="date" />
              </Form.Item>
              <Form.Item label="Priority" name="priority">
                <Input />
              </Form.Item>
              <Form.Item label="Budget Code" name="budgetItemId">
                <Select options={budgetOptions} />
                <Input />
              </Form.Item>
              <Form.Item label="Event ID" name="eventId">
                <Input />
              </Form.Item>
              <Form.Item label="Location" name="location">
                <Input
                  placeholder="{lat, lng}"
                  value={taskLocation.lat && taskLocation.lng ? `${taskLocation.lat}, ${taskLocation.lng}` : ''}
                  readOnly
                />
                <Input
                  placeholder="Search address"
                  value={locationSearch}
                  onChange={handleLocationSearchChange}
                />
                {locationSuggestions.length > 0 && (
                  <div className="suggestions-list">
                    {locationSuggestions.map((s) => (
                      <div key={s.place_id} onClick={() => handleLocationSuggestionSelect(s)}>
                        {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </Form.Item>
              <Form.Item label="Address" name="address">
                <Input
                  placeholder="Search address"
                  value={locationSearch}
                  onChange={handleLocationSearchChange}
                  autoComplete="off"
                />
                {locationSuggestions.length > 0 && (
                  <div className="suggestions-list" style={{ position: 'absolute', zIndex: 10, background: '#222', border: '1px solid #444', borderRadius: 4, width: '100%' }}>
                    {locationSuggestions.map((s, idx) => (
                      <div
                        key={s.place_id}
                        onClick={() => handleLocationSuggestionSelect(s)}
                        style={{
                          padding: '6px 10px',
                          cursor: 'pointer',
                          borderBottom: idx < locationSuggestions.length - 1 ? '1px solid #333' : 'none',
                          background: 'inherit',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#eee';
                          e.currentTarget.firstChild.style.color = '#222';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'inherit';
                          e.currentTarget.firstChild.style.color = '#fff';
                        }}
                      >
                        <span style={{ fontWeight: idx === 0 ? 'bold' : 'normal', color: '#fff' }}>{s.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Show selected address below input */}
                {taskAddress && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>{taskAddress}</div>
                )}
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="Edit Comment"
            open={isCommentModalOpen}
            onOk={saveComment}
            onCancel={() => setIsCommentModalOpen(false)}
            centered
            okButtonProps={{
              style: { background: '#FA3356', borderColor: '#FA3356' }
            }}
          >
            <Input.TextArea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
            />
          </Modal>
        </div>
      </div>
    </ConfigProvider>
  );
};

TasksComponent.propTypes = {
  projectId: PropTypes.string,
  userId: PropTypes.string,
  team: PropTypes.arrayOf(PropTypes.object),
};

export default TasksComponent;
