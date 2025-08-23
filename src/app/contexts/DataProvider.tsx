// src/app/contexts/DataProvider.tsx
import React, { PropsWithChildren } from "react";
import { UserProvider, useUserContext, UserLite, Message } from "./UserContext";
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
    if (!msgId || !emoji || !reactorId) return;

    const updateArr = (arr: Message[] = []) =>
      arr.map((m) => {
        const id = m.messageId || m.optimisticId;
        if (id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        if (users.has(reactorId)) {
          users.delete(reactorId);
        } else {
          users.add(reactorId);
        }
        reactions[emoji] = Array.from(users);
        return { ...m, reactions };
      });

    // Update userData messages (for DM conversations)
    userContext.updateUserDataMessages(updateArr);
    
    // Update project messages
    messagesContext.toggleReaction(msgId, emoji, reactorId, conversationId, conversationType, ws);
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
