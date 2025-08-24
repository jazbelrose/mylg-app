import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ── Mocks ──────────────────────────────────────────────────────────────────────
jest.mock("lucide-react", () => ({
  Folder: () => null,
  FileText: () => null,
  Download: () => null,
  Layout: () => null,
  Upload: () => null,
  PenTool: () => null,
}));

// Ensure a root element exists (some code may query #root)
const root = document.createElement("div");
root.id = "root";
document.body.appendChild(root);

jest.mock("../../../../app/contexts/DataProvider", () => ({
  useData: jest.fn(),
}));

jest.mock("aws-amplify/storage", () => ({
  list: jest.fn().mockResolvedValue({ items: [] }),
  uploadData: jest.fn(),
}));

jest.mock("./PDFPreview", () => (props: { title: string }) => (
  <canvas title={props.title} />
));

jest.mock("../../../../utils/api", () => ({
  API_BASE_URL: "base",
  ZIP_FILES_URL: "zip",
  DELETE_FILE_FROM_S3_URL: "delete",
  DELETE_PROJECT_MESSAGE_URL: "delMsg",
  GET_PROJECT_MESSAGES_URL: "getMsgs",
  EDIT_MESSAGE_URL: "editMsg",
  S3_PUBLIC_BASE: "https://s3",
  apiFetch: jest.fn(() =>
    Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue([]) })
  ),
}));

// ── Imports that use the mocks ─────────────────────────────────────────────────
import FileManagerComponent from "./FileManager";
import { NotificationContainer } from "../../../../components/ToastNotifications";
import { useData } from "../../../../app/contexts/DataProvider";
import { apiFetch } from "../../../../utils/api";

// Helper to type jest.fn() from mocks
const useDataMock = useData as jest.MockedFunction<typeof useData>;
const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

// ── Setup ──────────────────────────────────────────────────────────────────────
beforeEach(() => {
  useDataMock.mockReturnValue({
    activeProject: {
      projectId: "1",
      invoices: [
        { fileName: "file1.txt", url: "https://s3/projects/1/invoices/file1.txt" },
        { fileName: "file2.pdf", url: "https://s3/projects/1/invoices/file2.pdf" },
        { fileName: "file3.txt", url: "https://s3/projects/1/invoices/file3.txt" },
      ],
    },
    user: { userId: "u1", role: "admin" },
    isAdmin: true,
  } as any);
  apiFetchMock.mockClear();
});

// ── Tests ──────────────────────────────────────────────────────────────────────
test.skip("deleting a file via toast confirmation updates the list without closing modal", async () => {
  render(
    <>
      <NotificationContainer />
      <FileManagerComponent folder="invoices" />
    </>
  );

  await userEvent.click(screen.getByText("Invoices"));
  await userEvent.click(screen.getByLabelText("Select files"));
  await userEvent.click(screen.getByText("file1.txt"));
  await userEvent.click(screen.getByLabelText("Delete selected"));

  const yesButton = await screen.findByText("Yes");
  await userEvent.click(yesButton);

  await waitFor(() => {
    expect(screen.queryByText("file1.txt")).not.toBeInTheDocument();
  });

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(apiFetchMock.mock.calls.some((call) => call[0] === "delete")).toBe(true);
});

test("sorts files by selected option including kind", async () => {
  localStorage.setItem("fileManagerViewMode", "list");

  render(
    <>
      <NotificationContainer />
      <FileManagerComponent folder="invoices" />
    </>
  );

  await userEvent.click(screen.getByText("Invoices"));

  const initial = await screen.findAllByText(/file\d\.(txt|pdf)/);
  expect(initial.map((n) => n.textContent)).toEqual([
    "file1.txt",
    "file2.pdf",
    "file3.txt",
  ]);

  const sortTrigger = screen.getByLabelText("Sort files");
  await userEvent.click(sortTrigger);
  await userEvent.click(screen.getByText("Name (Z-A)"));

  await waitFor(() => {
    const sorted = screen.getAllByText(/file\d\.(txt|pdf)/);
    expect(sorted.map((n) => n.textContent)).toEqual([
      "file3.txt",
      "file2.pdf",
      "file1.txt",
    ]);
  });

  await userEvent.click(sortTrigger);
  await userEvent.click(screen.getByText("Type (A-Z)"));

  await waitFor(() => {
    const sorted = screen.getAllByText(/file\d\.(txt|pdf)/);
    expect(sorted.map((n) => n.textContent)).toEqual([
      "file2.pdf",
      "file1.txt",
      "file3.txt",
    ]);
  });
});

test("filters files by kind", async () => {
  render(
    <>
      <NotificationContainer />
      <FileManagerComponent folder="invoices" />
    </>
  );

  await userEvent.click(screen.getByText("Invoices"));

  const filter = await screen.findByLabelText("Filter files");
  await userEvent.click(filter);
  await userEvent.click(screen.getByRole("option", { name: /pdf/i }));

  await waitFor(() => {
    expect(screen.getByText("file2.pdf")).toBeInTheDocument();
    expect(screen.queryByText("file1.txt")).toBeNull();
  });
});

test("previews PDF files in a modal", async () => {
  render(
    <>
      <NotificationContainer />
      <FileManagerComponent folder="invoices" />
    </>
  );

  await userEvent.click(screen.getByText("Invoices"));
  await userEvent.click(await screen.findByText("file2.pdf"));

  await waitFor(() => {
    expect(screen.getByTitle("file2.pdf")).toBeInTheDocument();
  });
});

test("encodes + in S3 keys and renders without repeated errors", async () => {
  const { list } = await import("aws-amplify/storage");
  const listMock = list as jest.MockedFunction<typeof list>;
  listMock.mockClear();
  listMock.mockResolvedValue({
    items: [
      {
        key: "projects/1/invoices/My+Doc.pdf",
        lastModified: "2024-01-01T00:00:00Z",
      } as any,
    ],
  });

  useDataMock.mockReturnValue({
    activeProject: { projectId: "1", invoices: [] },
    user: { userId: "u1", role: "admin" },
    isAdmin: true,
  } as any);

  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  render(
    <>
      <NotificationContainer />
      <FileManagerComponent folder="invoices" />
    </>
  );

  await userEvent.click(screen.getByText("Invoices"));

  const file = await screen.findByText("My+Doc.pdf");
  expect(file).toBeInTheDocument();

  await userEvent.click(file);

  const downloadLink = await screen.findByLabelText("Download image");
  const href = downloadLink.getAttribute("href") ?? "";
  expect(href).toContain("My%2BDoc.pdf");
  expect(href).not.toContain("My+Doc.pdf");

  expect(listMock).toHaveBeenCalled();
  expect(consoleErrorSpy).not.toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});
