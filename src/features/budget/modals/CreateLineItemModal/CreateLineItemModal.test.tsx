import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../../../../../../components/ModalWithStack";

let CreateLineItemModal: React.ComponentType<any>;

beforeAll(() => {
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.appendChild(root);
  Modal.setAppElement(root);

  // Lazy import inside beforeAll to ensure root is available
  CreateLineItemModal = require("./CreateLineItemModal").default;
});

test("does not autosave when fields change", async () => {
  const onSubmit = jest.fn(() => Promise.resolve({}));

  render(
    <CreateLineItemModal
      isOpen={true}
      onRequestClose={() => {}}
      onSubmit={onSubmit}
    />
  );

  const user = userEvent.setup();
  const desc = screen.getByLabelText("Description");

  await user.type(desc, "Test");

  await new Promise((resolve) => setTimeout(resolve, 1100));
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(screen.getByText("Create"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
});

test("closing with unsaved changes prompts to save for existing items", async () => {
  const onSubmit = jest.fn(() => Promise.resolve({}));
  const onRequestClose = jest.fn();

  const user = userEvent.setup();

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

test("closing with unsaved changes prompts to save for new items", async () => {
  const onSubmit = jest.fn(() => Promise.resolve({}));
  const onRequestClose = jest.fn();

  const user = userEvent.setup();

  render(
    <CreateLineItemModal
      isOpen={true}
      onRequestClose={onRequestClose}
      onSubmit={onSubmit}
    />
  );

  const desc = screen.getByLabelText("Description");

  await user.type(desc, "New item");
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
