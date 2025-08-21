import React, { useState, useEffect, useCallback } from "react";
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
  const [selectedDescription, setSelectedDescription] = useState<string>(initialDescription);
  const [lastSavedDescription, setLastSavedDescription] = useState<string>(initialDescription);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const { userId } = useData();

  const debouncedSave = useCallback(
    debounce((description: string) => {
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
        projectId: activeProject.projectId,
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
            if (typeof updateProjectDetails === "function") {
              updateProjectDetails({ ...activeProject, description });
            }
          } else {
            console.error("Failed to update description");
          }
        })
        .catch((error) => console.error("Error updating description:", error));
    }, 5000),
    [activeProject, lastSavedDescription, updateProjectDetails, userId]
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
    if (!isDirty) {
      setSelectedDescription(newDescription);
      setLastSavedDescription(newDescription);
    } else {
      console.warn("Unsaved changes present; not overriding description");
    }
  }, [activeProject, isDirty]);

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
