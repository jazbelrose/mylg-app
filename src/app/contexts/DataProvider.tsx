// src/app/contexts/DataProvider.tsx
import React, { PropsWithChildren } from "react";
import { UserProvider, useUserContext } from "./UserContext";
import { ProjectsProvider, useProjectsContext } from "./ProjectsContext";
import { MessagesProvider, useMessagesContext } from "./MessagesContext";

// Re-export types for backwards compatibility
export type { Role, UserLite, TeamMember, TimelineEvent, Project, Message, DMThread } from "./UserContext";

// ---------- Individual Context Hooks (new, recommended) ----------
export const useAuthData = useUserContext;
export const useProjects = useProjectsContext;
export const useMessages = useMessagesContext;

// ---------- Backwards-compat merged hook (consider deprecating later) ----------
export const useData = () => {
  const userContext = useUserContext();
  const projectsContext = useProjectsContext();
  const messagesContext = useMessagesContext();
  
  // Integrate toggleReaction to update both userData and projectMessages
  const toggleReaction = (
    msgId: string,
    emoji: string,
    reactorId: string,
    conversationId: string,
    conversationType: "dm" | "project",
    ws?: WebSocket
  ) => {
    messagesContext.toggleReaction(
      msgId,
      emoji,
      reactorId,
      conversationId,
      conversationType,
      ws,
      userContext.setUserData
    );
  };

  return {
    ...userContext,
    ...projectsContext,
    ...messagesContext,
    toggleReaction, // Override with integrated version
  };
};

// ---------- Provider ----------
export const DataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <UserProvider>
      <ProjectsProvider>
        <MessagesProvider>
          {children}
        </MessagesProvider>
      </ProjectsProvider>
    </UserProvider>
  );
};

export default DataProvider;
