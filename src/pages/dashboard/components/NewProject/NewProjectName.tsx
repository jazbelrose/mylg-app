import React, { useState, ChangeEvent, FormEvent } from 'react';
import Modal from '../../../../components/ModalWithStack';

interface NewProjectNameProps {
  projectName: string;
  setProjectName: (name: string) => void;
}

const NewProjectName: React.FC<NewProjectNameProps> = ({ projectName, setProjectName }) => {
  const [showModal, setShowModal] = useState(false);

  const handleProjectNameClick = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleProjectNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProjectName(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Project Name Set:', projectName);
    closeModal();
  };

  return (
    <>
      <div className="dashboard-item project-name " onClick={handleProjectNameClick}>
        <span>{projectName || 'Project Name'}</span>
        <span>+</span>
      </div>
      <Modal
        isOpen={showModal}
        onRequestClose={closeModal}
        contentLabel="Project Name Modal"
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)'
          },
          content: {
            display: 'flex',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            width: '300px',
            height: '400px',
            margin: 'auto',
            paddingTop: '50px',
            borderRadius: '20px'
          }
        }}
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={handleProjectNameChange}
            className="modal-input"
          />
          <button
            type="submit"
            className="modal-button primary"
            style={{ padding: '10px 25px', borderRadius: '10px' }}
          >
            Done
          </button>
        </form>
      </Modal>
    </>
  );
};

export default NewProjectName;
