import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from "react";
import LexicalEditor from "../../../../components/LexicalEditor/LexicalEditor";
import { debounce } from "lodash";
import { useData } from "../../../../app/contexts/DataProvider";
import { API_BASE_URL } from "../../../../utils/api";
const DescriptionComponent = ({ activeProject, updateProjectDetails, registerToolbar }) => {
    const initialDescription = activeProject.description || "";
    const [selectedDescription, setSelectedDescription] = useState(initialDescription);
    const [lastSavedDescription, setLastSavedDescription] = useState(initialDescription);
    const [isDirty, setIsDirty] = useState(false);
    const { userId } = useData();
    const debouncedSave = useCallback(debounce((description) => {
        // Ignore a save if we're attempting to save an empty description unexpectedly
        if (description.trim() === "" && lastSavedDescription.trim() !== "") {
            console.warn("Ignoring save of an empty description");
            return;
        }
        if (description === lastSavedDescription) {
            console.log("No changes detected. Skipping update.");
            return;
        }
        console.log("Sending description to API:", description);
        const apiUrl = `${API_BASE_URL}/editProject?projectId=${activeProject.projectId}`;
        const payload = {
            projectId: activeProject.projectId, // Ensures we know which project this update belongs to
            description,
            author: userId || "Unknown", // Adapt as needed
            revisionDate: new Date().toISOString(),
        };
        fetch(apiUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
            .then((response) => {
            if (response.ok) {
                console.log("Description updated successfully");
                setLastSavedDescription(description);
                if (typeof updateProjectDetails === "function") {
                    updateProjectDetails({ ...activeProject, description });
                }
            }
            else {
                console.error("Failed to update description");
            }
        })
            .catch((error) => console.error("Error updating description:", error));
    }, 5000), [activeProject, lastSavedDescription, updateProjectDetails]);
    // Auto-save on change using the debounced function
    useEffect(() => {
        if (selectedDescription !== lastSavedDescription) {
            debouncedSave(selectedDescription);
        }
    }, [selectedDescription, lastSavedDescription, debouncedSave]);
    // Save when navigating away (before unload)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (selectedDescription !== lastSavedDescription) {
                debouncedSave.flush();
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [selectedDescription, lastSavedDescription, debouncedSave]);
    // When activeProject changes, update the editor state and reset last saved content.
    useEffect(() => {
        const newDescription = activeProject.description || "";
        if (!isDirty) { // only reset if no unsaved changes
            setSelectedDescription(newDescription);
            setLastSavedDescription(newDescription);
        }
        else {
            console.warn("Unsaved changes present; not overriding description");
        }
    }, [activeProject, isDirty]);
    return (_jsx(LexicalEditor, { initialContent: selectedDescription, onChange: (content) => setSelectedDescription(content), registerToolbar: registerToolbar }));
};
export default DescriptionComponent;
