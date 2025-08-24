import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("react-router-dom", () => ({
  useParams: jest.fn(),
}));

jest.mock("../components/BudgetPage/BudgetHeaderCard", () => ({
  __esModule: true,
  default: ({ projectId }: { projectId?: string }) => (
    <div>header-{projectId}</div>
  ),
}));

jest.mock("../components/BudgetPage/BudgetPiePanel", () => ({
  __esModule: true,
  default: ({ projectId }: { projectId?: string }) => <div>pie-{projectId}</div>,
}));

jest.mock("../components/BudgetPage/BudgetItemsTable", () => ({
  __esModule: true,
  default: ({ projectId }: { projectId?: string }) => <div>table-{projectId}</div>,
}));

jest.mock("../components/BudgetPage/ClientInvoicePreviewModal", () => ({
  __esModule: true,
  default: ({ projectId }: { projectId?: string }) => <div>modal-{projectId}</div>,
}));

jest.mock("../components/BudgetPage/TasksLinkedToBudget", () => ({
  __esModule: true,
  default: ({ projectId }: { projectId?: string }) => <div>tasks-{projectId}</div>,
}));

const { useParams } = require("react-router-dom") as { useParams: jest.Mock };

let BudgetPage: React.ComponentType;

beforeEach(() => {
  useParams.mockReturnValue({ projectId: "p1" });
  BudgetPage = require("../components/BudgetPage/BudgetPage").default;
});

afterEach(() => {
  jest.resetModules();
});

test("renders budget child components with projectId", () => {
  render(<BudgetPage />);
  expect(screen.getByText("header-p1")).toBeInTheDocument();
  expect(screen.getByText("pie-p1")).toBeInTheDocument();
  expect(screen.getByText("table-p1")).toBeInTheDocument();
  expect(screen.getByText("modal-p1")).toBeInTheDocument();
  expect(screen.getByText("tasks-p1")).toBeInTheDocument();
});
