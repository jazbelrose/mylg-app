import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TasksComponent from "./TasksComponent";
import {
  fetchTasks,
  deleteTask,
  fetchUserProfilesBatch,
} from "../../../../utils/api";
import { message } from "antd";

jest.mock("../../../../utils/api", () => ({
  __esModule: true,
  fetchTasks: jest.fn(() => Promise.resolve([])),
  createTask: jest.fn((t) => Promise.resolve(t)),
  updateTask: jest.fn((t) => Promise.resolve(t)),
  deleteTask: jest.fn(() => Promise.resolve({})),
  fetchUserProfilesBatch: jest.fn(() => Promise.resolve([])),
}));

const mockUseBudgetData = jest.fn(() => ({ budgetItems: [] }));
jest.mock("./useBudgetData", () => ({
  __esModule: true,
  default: (...args: any[]) => mockUseBudgetData(...args),
}));

beforeAll(() => {
  // matchMedia shim for antd/select etc.
  // @ts-expect-error polyfill for JSDOM
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
});

beforeEach(() => {
  mockUseBudgetData.mockReturnValue({ budgetItems: [] });

  (fetchTasks as jest.Mock).mockResolvedValue([]);
  (fetchTasks as jest.Mock).mockClear();

  (deleteTask as jest.Mock).mockResolvedValue({});
  (deleteTask as jest.Mock).mockClear();

  (fetchUserProfilesBatch as jest.Mock).mockResolvedValue([]);
  (fetchUserProfilesBatch as jest.Mock).mockClear();
});

test("shows no tasks message when list is empty", async () => {
  render(<TasksComponent team={[]} />);
  expect(await screen.findByText("No tasks yet!")).toBeInTheDocument();
});

test("Assigned To select displays team members by full name", async () => {
  const team = [
    { userId: "1", firstName: "Alice", lastName: "Wonderland" },
    { userId: "2", firstName: "Bob", lastName: "Smith" },
  ];
  (fetchUserProfilesBatch as jest.Mock).mockResolvedValue(team);

  render(<TasksComponent team={team} />);

  const select = screen.getByLabelText("Assigned To");
  await userEvent.click(select);

  expect(
    (await screen.findAllByText("Alice Wonderland")).length
  ).toBeGreaterThan(0);
  expect(
    (await screen.findAllByText("Bob Smith")).length
  ).toBeGreaterThan(0);
});

test("Task Name lists budget item descriptions", async () => {
  mockUseBudgetData.mockReturnValue({
    budgetItems: [
      { budgetItemId: "b1", descriptionShort: "First description" },
      { budgetItemId: "b2", descriptionShort: "Second description" },
    ],
  });

  render(<TasksComponent team={[]} />);

  const input = screen.getByLabelText("Task Name");

  await userEvent.type(input, "First");
  expect(
    await screen.findByRole("option", { name: "First description" })
  ).toBeInTheDocument();

  await userEvent.clear(input);
  await userEvent.type(input, "Second");
  expect(
    await screen.findByRole("option", { name: "Second description" })
  ).toBeInTheDocument();
});

test("invokes deleteTask when deleting a task", async () => {
  (fetchTasks as jest.Mock).mockResolvedValue([
    { projectId: "p1", taskId: "1", name: "Sample" },
  ]);

  render(<TasksComponent projectId="p1" team={[]} />);

  await screen.findByText("Sample");
  await userEvent.click(screen.getByLabelText("actions-dropdown"));
  await userEvent.click(await screen.findByText("Delete"));

  await waitFor(() =>
    expect(deleteTask).toHaveBeenCalledWith({ projectId: "p1", taskId: "1" })
  );
});

test("restores task and shows error message when deleteTask fails", async () => {
  (fetchTasks as jest.Mock).mockResolvedValue([{ taskId: "1", name: "Sample" }]);
  (deleteTask as jest.Mock).mockRejectedValueOnce(new Error("fail"));

  const errorSpy = jest.spyOn(message, "error").mockImplementation(() => {});

  render(<TasksComponent projectId="p1" team={[]} />);

  await screen.findByText("Sample");
  await userEvent.click(screen.getByLabelText("actions-dropdown"));
  await userEvent.click(await screen.findByText("Delete"));

  await waitFor(() =>
    expect(errorSpy).toHaveBeenCalledWith("Failed to delete task")
  );
  expect(screen.getByText("Sample")).toBeInTheDocument();

  errorSpy.mockRestore();
});
