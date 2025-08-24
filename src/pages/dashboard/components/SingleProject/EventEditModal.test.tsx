import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EventEditModal from "./EventEditModal";
import Modal from "../../../../components/ModalWithStack";

beforeAll(() => {
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.appendChild(root);
  Modal.setAppElement(root);
});

test("uses last event date as default after adding", () => {
  render(
    <EventEditModal
      isOpen={true}
      onRequestClose={() => {}}
      events={[]}
      defaultDate="2024-05-01"
      defaultDescription=""
      onSubmit={() => {}}
    />
  );

  const dateInput = screen.getByLabelText(/event date/i) as HTMLInputElement;
  const hoursInput = screen.getByLabelText(/hours/i) as HTMLInputElement;
  const addButton = screen.getByRole("button", { name: /add event/i });

  fireEvent.change(dateInput, { target: { value: "2023-02-10" } });
  fireEvent.change(hoursInput, { target: { value: "2" } });
  fireEvent.click(addButton);

  expect(dateInput.value).toBe("2023-02-10");

  fireEvent.change(dateInput, { target: { value: "2023-03-15" } });
  fireEvent.change(hoursInput, { target: { value: "1" } });
  fireEvent.click(addButton);

  expect(dateInput.value).toBe("2023-03-15");
});

test("displays event description for existing events", () => {
  render(
    <EventEditModal
      isOpen={true}
      onRequestClose={() => {}}
      events={[
        { id: "1", date: "2024-05-01", hours: "2", description: "Setup" },
      ]}
      defaultDate="2024-05-01"
      defaultDescription=""
      onSubmit={() => {}}
    />
  );

  expect(screen.getByText("Setup")).toBeInTheDocument();
});
