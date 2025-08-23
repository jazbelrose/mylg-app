import React, { useState, ChangeEvent, FormEvent } from 'react';
import Modal from '../../../../components/ModalWithStack';

interface NewProjectBudgetProps {
  budget: string;
  setBudget: (value: string) => void;
  style?: React.CSSProperties;
}

const NewProjectBudget: React.FC<NewProjectBudgetProps> = ({ budget, setBudget, style }) => {
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const handleBudgetClick = () => setShowBudgetModal(true);
  const closeBudgetModal = () => setShowBudgetModal(false);

  const handleBudgetChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBudget(event.target.value);
  };

  const handleSubmitBudget = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Budget Set:', budget);
    closeBudgetModal();
  };

  return (
    <>
      <div
        className="dashboard-item new-project-budget"
        onClick={handleBudgetClick}
        style={style}
      >
        <span>{budget ? `$${budget}` : 'Budget'}</span>
        <span>+</span>
      </div>
      <Modal
        isOpen={showBudgetModal}
        onRequestClose={closeBudgetModal}
        contentLabel="Budget Modal"
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
        <form onSubmit={handleSubmitBudget} className="modal-form">
          <label className="modal-label">Budget</label>
          <div className="currency-input-wrapper">
            <span className="currency-prefix">$</span>
            <input
              type="text"
              value={budget}
              onChange={handleBudgetChange}
              className="modal-input currency-input"
            />
          </div>
          <button type="submit" className="modal-button primary">
            Done
          </button>
        </form>
      </Modal>
    </>
  );
};

export default NewProjectBudget;
