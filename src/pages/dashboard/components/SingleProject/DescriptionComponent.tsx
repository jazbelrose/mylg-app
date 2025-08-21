import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import LexicalEditor from "../../../../components/LexicalEditor/LexicalEditor";
import { debounce } from "lodash";
import { useData } from "../../../../app/contexts/DataProvider";
import { API_BASE_URL } from "../../../../utils/api";

interface DescriptionComponentProps {
  activeProject: {
    projectId: string;
    description?: string;
  };
  updateProjectDetails?: (project: any) => void;
  registerToolbar?: (toolbar: any) => void;
}

const DescriptionComponent: React.FC<DescriptionComponentProps> = ({
  activeProject,
  updateProjectDetails,
  registerToolbar,
}) => {
  const initialDescription = activeProject.description || "";
  console.log("[DescriptionComponent] activeProject:", activeProject);
  console.log("[DescriptionComponent] initialDescription:", initialDescription);
  const [selectedDescription, setSelectedDescription] = useState<string>(initialDescription);
  const [lastSavedDescription, setLastSavedDescription] = useState<string>(initialDescription);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const { userId } = useData();
  const lastSavedDescriptionRef = useRef(lastSavedDescription);
  const activeProjectRef = useRef(activeProject);
  const updateProjectDetailsRef = useRef(updateProjectDetails);
  
  // Keep refs in sync
  useEffect(() => {
    lastSavedDescriptionRef.current = lastSavedDescription;
    activeProjectRef.current = activeProject;
    updateProjectDetailsRef.current = updateProjectDetails;
  }, [lastSavedDescription, activeProject, updateProjectDetails]);

  const debouncedSave = useMemo(
    () => debounce((description: string) => {
      if (description.trim() === "" && lastSavedDescriptionRef.current.trim() !== "") {
        console.warn("Ignoring save of an empty description");
        return;
      }
      if (description === lastSavedDescriptionRef.current) {
        console.log("No changes detected. Skipping update.");
        return;
      }
      console.log("Sending description to API:", description);
      const apiUrl = `${API_BASE_URL}/editProject?projectId=${activeProjectRef.current.projectId}`;
      const payload = {
        projectId: activeProjectRef.current.projectId,
        description,
        author: userId || "Unknown",
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
            setIsDirty(false); // Reset dirty state after successful save
            if (typeof updateProjectDetailsRef.current === "function") {
              updateProjectDetailsRef.current({ ...activeProjectRef.current, description });
            }
          } else {
            console.error("Failed to update description");
          }
        })
        .catch((error) => console.error("Error updating description:", error));
    }, 5000),
    [userId] // Only userId as dependency since other values are accessed via refs
  );

  useEffect(() => {
    if (selectedDescription !== lastSavedDescription) {
      debouncedSave(selectedDescription);
    }
  }, [selectedDescription, lastSavedDescription, debouncedSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedDescription !== lastSavedDescription) {
        debouncedSave.flush();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedDescription, lastSavedDescription, debouncedSave]);

  useEffect(() => {
    const newDescription = activeProject.description || "";
    console.log("[DescriptionComponent] Project changed, newDescription:", newDescription);
    console.log("[DescriptionComponent] Current isDirty:", isDirty);
    
    if (!isDirty) {
      // Only reset if no unsaved changes
      setSelectedDescription(newDescription);
      setLastSavedDescription(newDescription);
      console.log("[DescriptionComponent] Reset state for new project");
    } else {
      console.warn("Unsaved changes present; not overriding description");
    }
    
    // Reset isDirty when project changes - this was missing
    setIsDirty(false);
  }, [activeProject.projectId, activeProject.description, isDirty]); // Include all dependencies

  return (
    <LexicalEditor
      initialContent={selectedDescription}
      onChange={(content: string) => {
        setSelectedDescription(content);
        setIsDirty(true);
      }}
      registerToolbar={registerToolbar}
    />
  );
};

export default DescriptionComponent;
