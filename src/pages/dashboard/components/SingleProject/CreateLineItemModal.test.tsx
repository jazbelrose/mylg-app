import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../../../../components/ModalWithStack";

let CreateLineItemModal: React.ComponentType<any>;

beforeAll(() => {
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.appendChild(root);
  Modal.setAppElement(root);

  // Lazy import inside beforeAll to ensure root is available
  CreateLineItemModal = require("./CreateLineItemModal").default;
});

test("autosaves after field change and reuses returned id", async () => {
  jest.useFakeTimers();
  const onSubmit = jest.fn(() => Promise.resolve({ budgetItemId: "id1" }));

  render(
    <CreateLineItemModal
      isOpen={true}
      onRequestClose={() => {}}
      onSubmit={onSubmit}
    />
  );

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const desc = screen.getByLabelText("Description");

  await user.type(desc, "Test");
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

  await user.type(desc, "!");
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  expect(onSubmit.mock.calls[1][0].budgetItemId).toBe("id1");
});

test("closing with unsaved changes prompts to save", async () => {
  jest.useFakeTimers();
  const onSubmit = jest.fn(() => Promise.resolve({}));
  const onRequestClose = jest.fn();

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  render(
    <CreateLineItemModal
      isOpen={true}
      onRequestClose={onRequestClose}
      onSubmit={onSubmit}
      initialData={{ description: "Initial" }}
    />
  );

  const desc = screen.getByLabelText("Description");

  await user.clear(desc);
  await user.type(desc, "Changed");
  await user.click(screen.getByText("Cancel"));

  expect(
    await screen.findByText(
      "You have unsaved changes, do you want to save this line item?"
    )
  ).toBeInTheDocument();

  await user.click(screen.getByText("Yes"));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onRequestClose).toHaveBeenCalled();
});
