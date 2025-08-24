import React from "react";

interface Props {
  projectId?: string;
}

const TasksLinkedToBudget: React.FC<Props> = ({ projectId }) => {
  return <div>TasksLinkedToBudget {projectId}</div>;
};

export default TasksLinkedToBudget;
