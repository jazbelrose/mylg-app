import React from "react";
import Modal from "../../../../components/ModalWithStack"

const NewProjectFinishline = ({ finishline, setFinishLine}) => {


    const [showFinishLineModal, setShowFinishLineModal] = React.useState(false);

    const handleFinishLineClick = () => {
        setShowFinishLineModal(true);
      };

      const closeFinishLineModal = () => {
        setShowFinishLineModal(false);
      };

      const handleFinishLineChange = (e) => {
        setFinishLine(e.target.value);
      };
    
      const handleSubmitFinishLine = (e) => {
        e.preventDefault();
        console.log("Finish Line Set:", finishline);
        closeFinishLineModal();
    
      };

return (
    <>



 <div className="dashboard-item new-project-finish-line" onClick={handleFinishLineClick}>
            <span>{finishline || 'Finish Line'}</span>
            <span>+</span>
          </div>

          <Modal
            isOpen={showFinishLineModal}
            onRequestClose={closeFinishLineModal}
            contentLabel="Finish Line Modal"
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
            <form onSubmit={handleSubmitFinishLine} className="modal-form">
              <label className="modal-label">Finish Line</label>
              <input
                type="date"
                value={finishline}
                onChange={handleFinishLineChange} className="modal-input"
                placeholder="Finish Line"
              />
              <button type="submit" className="modal-button primary">Set Finish Line</button>
            </form>
          </Modal>

    






    </>
)
    
}

export default NewProjectFinishline;