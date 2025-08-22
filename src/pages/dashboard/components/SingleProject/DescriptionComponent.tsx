import React, { useState, useEffect } from "react";
import LexicalEditor from "../../../../components/LexicalEditor/LexicalEditor";

interface DescriptionComponentProps {
  activeProject: {
    projectId: string;
    description?: string; // no longer used to seed; server/Yjs owns hydration
  };
  updateProjectDetails?: (project: any) => void; // not used (server persists)
  registerToolbar?: (toolbar: any) => void;
}

const DescriptionComponent: React.FC<DescriptionComponentProps> = ({
  activeProject,
  registerToolbar,
}) => {
  const [isDirty, setIsDirty] = useState(false);

  // Reset dirty flag on project switch
  useEffect(() => {
    setIsDirty(false);
  }, [activeProject.projectId]);

  return (
    <LexicalEditor
      key={activeProject.projectId}          // force a clean mount per room
      // If your LexicalEditor expects a room/doc prop, pass it here:
      // roomId={activeProject.projectId}
      // docName={activeProject.projectId}
      initialContent=""                      // let Yjs seed from the server
      onChange={() => setIsDirty(true)}      // UI-only; no client saves
      registerToolbar={registerToolbar}
    />
  );
};

export default DescriptionComponent;
