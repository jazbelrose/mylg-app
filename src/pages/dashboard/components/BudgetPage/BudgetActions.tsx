import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faClone, faUndo, faRedo } from "@fortawesome/free-solid-svg-icons";

interface BudgetActionsProps {
  selectedRowKeys: string[];
  canEdit: boolean;
  onCreateLineItem: () => void;
  onDeleteItems: () => void;
  onExportExcel: () => void;
  onRevisionModal: () => void;
}

const BudgetActions: React.FC<BudgetActionsProps> = ({
  selectedRowKeys,
  canEdit,
  onCreateLineItem,
  onDeleteItems,
  onExportExcel,
  onRevisionModal,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "10px",
        marginBottom: "10px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {canEdit && (
        <>
          <button
            onClick={onCreateLineItem}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "14px",
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Line Item
          </button>

          {selectedRowKeys.length > 0 && (
            <button
              onClick={onDeleteItems}
              style={{
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "14px",
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
              Delete ({selectedRowKeys.length})
            </button>
          )}

          <button
            onClick={onRevisionModal}
            style={{
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "14px",
            }}
          >
            <FontAwesomeIcon icon={faClone} />
            Create Revision
          </button>
        </>
      )}

      <button
        onClick={onExportExcel}
        style={{
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "14px",
        }}
      >
        Export Excel
      </button>

      <div style={{ marginLeft: "auto", display: "flex", gap: "5px" }}>
        <button
          style={{
            backgroundColor: "#666",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
          title="Undo"
        >
          <FontAwesomeIcon icon={faUndo} />
        </button>
        
        <button
          style={{
            backgroundColor: "#666",
            color: "white",
            border: "none",
            padding: "6px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
          title="Redo"
        >
          <FontAwesomeIcon icon={faRedo} />
        </button>
      </div>
    </div>
  );
};

export default BudgetActions;