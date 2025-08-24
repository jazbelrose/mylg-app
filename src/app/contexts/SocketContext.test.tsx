import React from "react";
import { render, act } from "@testing-library/react";
import { SocketProvider } from "./SocketContext";
import "@testing-library/jest-dom";

// ---- Mock contexts ----
jest.mock("./AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("./DataProvider", () => ({
  useData: jest.fn(),
}));
jest.mock("./DMConversationContext", () => ({
  useDMConversation: jest.fn(),
}));

import { useAuth } from "./AuthContext";
import { useData } from "./DataProvider";
import { useDMConversation } from "./DMConversationContext";

// ---- Types ----
type MockSocketHandler = ((event: { data: string }) => void) | null;

class MockWebSocket {
  public onmessage: MockSocketHandler = null;
  public onopen: (() => void) | null = null;
  public readyState = 1;

  constructor() {
    // expose for test access
    (global as any).mockSocket = this;
  }
  send(_: string) {}
  close() {}
}

describe("SocketContext collaborator updates", () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();

    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

    (useAuth as jest.Mock).mockReturnValue({
      getAuthTokens: jest.fn().mockResolvedValue({ idToken: "token" }),
    });

    (useDMConversation as jest.Mock).mockReturnValue({
      activeDmConversationId: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
    global.WebSocket = originalWebSocket;
    delete (global as any).mockSocket;
  });

  it("debounces refreshUsers and fetchUserProfile calls", async () => {
    const refreshUsers = jest.fn();
    const fetchUserProfile = jest.fn();

    (useData as jest.Mock).mockReturnValue({
      setUserData: jest.fn(),
      setDmThreads: jest.fn(),
      userId: "u1",
      setProjects: jest.fn(),
      setUserProjects: jest.fn(),
      setActiveProject: jest.fn(),
      updateProjectFields: jest.fn(),
      setProjectMessages: jest.fn(),
      deletedMessageIds: new Set<string>(),
      markMessageDeleted: jest.fn(),
      activeProject: null,
      fetchProjects: jest.fn(),
      fetchUserProfile,
      refreshUsers,
    });

    render(
      <SocketProvider>
        <div />
      </SocketProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const socket: MockWebSocket = (global as any).mockSocket;

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "collaborators-updated" }) });
      socket.onmessage?.({ data: JSON.stringify({ type: "collaborators-updated" }) });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(refreshUsers).toHaveBeenCalledTimes(1);
    expect(fetchUserProfile).toHaveBeenCalledTimes(1);

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "collaborators-updated" }) });
      jest.advanceTimersByTime(1000);
    });

    expect(refreshUsers).toHaveBeenCalledTimes(2);
    expect(fetchUserProfile).toHaveBeenCalledTimes(2);
  });
});
