import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  PropsWithChildren,
} from "react";
import { useAuth } from "./AuthContext";
import { useProjects } from "./DataProvider";
import {
  fetchPendingInvites,
  sendProjectInvite,
  acceptProjectInvite,
  declineProjectInvite,
  cancelProjectInvite,
} from "../../utils/api";

export interface Invite {
  inviteId: string;
  projectId: string;
  recipientUsername: string;
  [k: string]: unknown;
}

interface InvitesValue {
  pendingInvites: Invite[];
  handleSendInvite: (projectId: string, recipientUsername: string) => Promise<void>;
  handleAcceptInvite: (inviteId: string) => Promise<void>;
  handleDeclineInvite: (inviteId: string) => Promise<void>;
  handleCancelInvite: (inviteId: string) => Promise<void>;
}

const InvitesContext = createContext<InvitesValue | undefined>(undefined);

export const useInvites = (): InvitesValue => {
  const ctx = useContext(InvitesContext);
  if (!ctx) throw new Error("useInvites must be used within InvitesProvider");
  return ctx;
};

export const InvitesProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();
  const { fetchProjects } = useProjects();
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

  useEffect(() => {
    if (!userId) {
      setPendingInvites([]);
      return;
    }
    const loadInvites = async () => {
      try {
        const items = await fetchPendingInvites(userId);
        setPendingInvites(Array.isArray(items) ? (items as Invite[]) : []);
      } catch (err) {
        console.error("Failed to fetch invites", err);
      }
    };
    loadInvites();
  }, [userId]);

  const handleSendInvite = async (projectId: string, recipientUsername: string) => {
    try {
      await sendProjectInvite(projectId, recipientUsername);
      if (userId) {
        const items = await fetchPendingInvites(userId);
        setPendingInvites(Array.isArray(items) ? (items as Invite[]) : []);
      }
    } catch (err) {
      console.error("Failed to send invite", err);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptProjectInvite(inviteId);
      setPendingInvites((prev) => prev.filter((inv) => inv.inviteId !== inviteId));
      await fetchProjects();
    } catch (err) {
      console.error("Failed to accept invite", err);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineProjectInvite(inviteId);
      setPendingInvites((prev) => prev.filter((inv) => inv.inviteId !== inviteId));
    } catch (err) {
      console.error("Failed to decline invite", err);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelProjectInvite(inviteId);
      setPendingInvites((prev) => prev.filter((inv) => inv.inviteId !== inviteId));
    } catch (err) {
      console.error("Failed to cancel invite", err);
    }
  };

  return (
    <InvitesContext.Provider
      value={{
        pendingInvites,
        handleSendInvite,
        handleAcceptInvite,
        handleDeclineInvite,
        handleCancelInvite,
      }}
    >
      {children}
    </InvitesContext.Provider>
  );
};

export default InvitesProvider;