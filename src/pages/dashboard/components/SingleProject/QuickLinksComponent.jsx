
import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Modal from "../../../../components/ModalWithStack";
import { X, Pencil, Trash2 } from "lucide-react";
import { useData } from "../../../../app/contexts/DataProvider";
import { Link2 } from "lucide-react";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
import SpinnerOverlay from "../../../../components/SpinnerOverlay";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../../../utils/api";

if (typeof document !== 'undefined') {
  Modal.setAppElement('#root');
}


// Simple helper to generate unique IDs for new links
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

const QuickLinksComponent = forwardRef(({ style, hideTrigger = false }, ref) => {
  const { activeProject, updateProjectFields } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ id: "", name: "", url: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const apiUrl = `${API_BASE_URL}/editProject?projectId=${activeProject?.projectId}`;
  // Fetch quick links when modal opens
  // Fetch quick links when modal opens
  const fetchQuickLinks = async () => {
    if (!activeProject || !activeProject.projectId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch quick links");
      }
      const data = await response.json();
      if (data.quickLinks) {
        setLinks([...data.quickLinks]); // Ensure fresh data is loaded
      }
    } catch (error) {
      console.error("Error fetching quick links:", error);
      setError("Failed to fetch quick links.");
      toast.error("Failed to fetch quick links.");
    } finally {
      setLoading(false);
    }
  };

  // Ensure quickLinks are updated every time the project changes
  useEffect(() => {
    if (activeProject?.quickLinks) {
      const linksWithIds = activeProject.quickLinks.map((l) =>
        l.id ? l : { ...l, id: generateId() }
      );
      setLinks(linksWithIds); // Sync with project data
    }
  }, [activeProject]);

  const openModal = () => {
    setIsModalOpen(true);
    fetchQuickLinks(); // Always fetch fresh links when opening modal
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setNewLink({ id: "", name: "", url: "" });
    setError("");
  };

  useImperativeHandle(ref, () => ({ openModal }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewLink({ ...newLink, [name]: value });
    if (errorMessage) setErrorMessage("");
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const updateQuickLinksToAPI = async (updatedLinks) => {
    if (!activeProject || !activeProject.projectId) {
      console.error("Active project or project ID is undefined");
      return;
    }
    try {
      setSaving(true);
      await enqueueProjectUpdate(
        updateProjectFields,
        activeProject.projectId,
        { quickLinks: updatedLinks }
      );
      toast.success("Quick Links saved");
    } catch (error) {
      console.error("Error updating Quick Links:", error);
      setError("Failed to update Quick Links.");
      toast.error("Failed to update Quick Links.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!newLink.name || !newLink.url) {
      setErrorMessage("Both fields are required.");
      return;
    }

    if (!validateUrl(newLink.url)) {
      setErrorMessage("Please enter a valid URL.");
      return;
    }

    setErrorMessage("");

    let updatedLinks;
    if (editingIndex !== null) {
      updatedLinks = [...links];
      updatedLinks[editingIndex] = newLink;
    } else {
      const linkWithId = { ...newLink, id: generateId() };
      updatedLinks = [linkWithId, ...links]; // New links appear at the top
    }

    setLinks(updatedLinks);
    await updateQuickLinksToAPI(updatedLinks);
    setEditingIndex(null); // Reset editing state first
    setNewLink({ id: "", name: "", url: "" }); // Then clear the input fields
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setNewLink(links[index]);
    setIsModalOpen(true);
  };

  const handleDelete = async (index) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    setLinks(updatedLinks);
    await updateQuickLinksToAPI(updatedLinks);
  };

  return (
    <>
      {!hideTrigger && (
        <div
          className="dashboard-item files files-shared-style"
          onClick={openModal}
          style={{
            ...style,
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-start", // Outer container aligned at the top
          }}
        >
          {/* Inner container for icon and text aligned together */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <Link2 size={24} style={{ marginRight: "8px", marginTop: "1px" }} />
            <span>Quick Links</span>
          </div>
          <span style={{ marginLeft: "auto", alignSelf: "flex-start" }}>
            &gt;
          </span>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Quick Links Modal"
        style={{
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 1000, // Ensure it's on top
          },
          content: {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "95%", // Adjust for mobile screens
            maxWidth: "500px",
            height: "auto", // Allow modal to expand dynamically
            minHeight: "65vh", // Ensures it doesn’t shrink too much
            maxHeight: "95vh", // Prevents overflow
            borderRadius: "10px",
            padding: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        {loading && <SpinnerOverlay />}
        {error && (
          <div style={{ color: "#FA3356", marginBottom: "10px" }}>{error}</div>
        )}
        {saving && (
          <div style={{ color: "#FA3356", marginBottom: "10px" }}>Saving...</div>
        )}
        {/* Header: Add Quick Links + Close Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <h3 style={{ margin: 0, color: "#fff", fontSize: "1.2rem" }}>
            Add Quick Links
          </h3>
          <button
            onClick={closeModal}
            aria-label="Close modal"
            style={{ background: "none", border: "none", color: "#fff" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Links Appear at the Top */}
        <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: "15px" }}>
          {links.length > 0 && (
            <div className="quick-links-list">
              {links.map((link, index) => (
                <div
                  key={link.id}
                  className="quick-link-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px",
                    borderBottom: "1px solid #444",
                  }}
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#FA3356", textDecoration: "none" }}
                  >
                    {link.name}
                  </a>
                  <div>
                    <button
                      onClick={() => handleEdit(index)}
                      aria-label="Edit link"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        marginRight: "10px",
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      aria-label="Delete link"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#FA3356",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Fields and Add Button at the Bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "auto",
          }}
        >
          <input
            type="text"
            name="name"
            placeholder="Enter name"
            value={newLink.name}
            onChange={handleInputChange}
            className="modal-input"
            style={{ marginBottom: "5px" }}
          />
          <input
            type="url"
            name="url"
            placeholder="Enter URL"
            value={newLink.url}
            onChange={handleInputChange}
            className="modal-input"
            style={{ marginBottom: "5px" }}
          />
          {errorMessage && (
            <span style={{ color: "#ff6b6b", fontSize: "0.9rem" }}>
              {errorMessage}
            </span>
          )}

          <button
            onClick={handleSubmit}
            disabled={!newLink.name || !newLink.url || Boolean(errorMessage)}
            style={{
              width: "100%",
              padding: "10px",
              background: "#FA3356",
              color: "#fff",
              border: "none",
              opacity: !newLink.name || !newLink.url || errorMessage ? 0.6 : 1,
              cursor:
                !newLink.name || !newLink.url || errorMessage
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {editingIndex !== null ? "Save Changes" : "Add Link"}
          </button>
        </div>
      </Modal>
    </>
  );
});

export default QuickLinksComponent;
