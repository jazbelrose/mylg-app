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
      key={activeProject.projectId}          
      initialContent=""                     
      onChange={() => setIsDirty(true)}      
      registerToolbar={registerToolbar}
    />
  );
};

export default DescriptionComponent;
