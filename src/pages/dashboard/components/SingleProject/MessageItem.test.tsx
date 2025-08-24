import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Trash2: () => null,
  Pencil: () => null,
  Smile: () => null,
}));

// Mock OnlineStatusContext
jest.mock("../../../../app/contexts/OnlineStatusContext", () => ({
  useOnlineStatus: () => ({ onlineUsers: [] }),
}));

// Import component under test
const MessageItem = require("./MessageItem").default;

describe("MessageItem edit", () => {
  it("shows author controls and triggers edit callback", async () => {
    const onEditRequest = jest.fn();

    render(
      <MessageItem
        msg={{
          senderId: "u1",
          messageId: "m1",
          text: "hello",
          timestamp: "t1",
        }}
        prevMsg={null}
        userData={{ userId: "u1" }}
        allUsers={[]}
        openPreviewModal={() => {}}
        folderKey=""
        renderFilePreview={() => null}
        getFileNameFromUrl={() => ""}
        onEditRequest={onEditRequest}
      />
    );

    await userEvent.click(screen.getByLabelText("Edit message"));
    expect(onEditRequest).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "m1" })
    );
  });

  it("hides author actions for other users", () => {
    render(
      <MessageItem
        msg={{
          senderId: "u1",
          messageId: "m2",
          text: "hello",
          timestamp: "t2",
        }}
        prevMsg={null}
        userData={{ userId: "u2" }}
        allUsers={[]}
        openPreviewModal={() => {}}
        folderKey=""
        renderFilePreview={() => null}
        getFileNameFromUrl={() => ""}
      />
    );

    expect(screen.queryByLabelText("Edit message")).toBeNull();
    expect(screen.queryByLabelText("Delete message")).toBeNull();
  });
});
