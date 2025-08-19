import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
jest.setTimeout(10000);
jest.mock('../../../app/contexts/DataProvider', () => ({
    useData: jest.fn(),
}));
jest.mock('../../../app/contexts/SocketContext', () => ({
    useSocket: jest.fn(),
}));
jest.mock('../../../app/contexts/OnlineStatusContext', () => ({
    __esModule: true,
    useOnlineStatus: jest.fn(() => ({ onlineUsers: [] })),
}));
jest.mock('../components/SingleProject/ProjectPageLayout', () => ({
    __esModule: true,
    default: ({ children, header }) => (_jsxs("div", { children: [header, children] })),
}));
jest.mock('../components/SingleProject/TeamModal', () => ({
    __esModule: true,
    default: () => null,
}));
jest.mock('../components/SingleProject/useBudgetData', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('../../../utils/api', () => ({
    fetchBudgetHeaders: jest.fn(),
    fetchBudgetItems: jest.fn(),
    createBudgetItem: jest.fn(),
    updateBudgetItem: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
    useParams: jest.fn(),
    useNavigate: jest.fn(),
    useLocation: jest.fn(),
}));
const { useData } = require('../../../app/contexts/DataProvider');
const { useSocket } = require('../../../app/contexts/SocketContext');
const api = require('../../../utils/api');
const { useParams, useNavigate, useLocation } = require('react-router-dom');
const mockUseBudgetData = require('../components/SingleProject/useBudgetData').default;
let BudgetPage;
beforeEach(() => {
    global.ResizeObserver = class {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
    window.matchMedia ||= () => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
    });
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    useParams.mockReturnValue({ projectSlug: 'proj' });
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: '/dashboard/projects/proj/budget' });
    useData.mockReturnValue({
        activeProject: { projectId: 'p1', title: 'Project 1' },
        projects: [],
        fetchProjectDetails: jest.fn(),
        user: null,
        userId: 'u1',
        setProjects: jest.fn(),
        setSelectedProjects: jest.fn(),
        isAdmin: true,
    });
    useSocket.mockReturnValue({ ws: {} });
    const budgetHeader = { budgetId: 'b1', headerFinalTotalCost: 0, endDate: '', revision: 1 };
    const budgetItems = [
        {
            budgetItemId: 'LINE-1',
            elementKey: 'E1',
            elementId: '1',
            description: 'Item 1',
            quantity: 1,
            itemBudgetedCost: 10,
            itemMarkUp: 0,
            itemFinalCost: 10,
            itemActualCost: 10,
            paymentStatus: 'PAID',
            areaGroup: 'Group A',
            invoiceGroup: 'INV A',
            category: 'Cat A',
            notes: 'Note 1',
        },
        {
            budgetItemId: 'LINE-2',
            elementKey: 'E2',
            elementId: '2',
            description: 'Item 2',
            quantity: 2,
            itemBudgetedCost: 20,
            itemMarkUp: 0,
            itemFinalCost: 20,
            itemActualCost: 20,
            paymentStatus: 'PAID',
            areaGroup: 'Group A',
            invoiceGroup: 'INV B',
            category: 'Cat B',
            notes: 'Note 2',
        },
    ];
    mockUseBudgetData.mockReturnValue({
        budgetHeader,
        setBudgetHeader: jest.fn(),
        budgetItems,
        setBudgetItems: jest.fn(),
        refresh: jest.fn(),
        loading: false,
    });
    api.fetchBudgetHeaders.mockResolvedValue([
        { budgetId: 'b1', headerFinalTotalCost: 0, endDate: '', revision: 1 }
    ]);
    BudgetPage = require('../BudgetPage.js').default;
});
afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
});
test('expanding row keeps column count', async () => {
    const { container } = render(_jsx(BudgetPage, {}));
    const areaOption = (await screen.findAllByText('Area Group'))[0];
    await userEvent.click(areaOption);
    const columnCountBefore = container.querySelectorAll('thead th').length;
    const expandBtn = screen.getAllByLabelText('Expand row')[0];
    await userEvent.click(expandBtn);
    await screen.findByText('Note 1');
    const columnCountAfter = container.querySelectorAll('thead th').length;
    expect(columnCountAfter).toBe(columnCountBefore);
});
test('create modal shows next element key disabled and element id auto populates', async () => {
    render(_jsx(BudgetPage, {}));
    const createBtn = screen.getByRole('button', { name: /create line item/i });
    await userEvent.click(createBtn);
    const input = await screen.findByLabelText('Element Key', { selector: 'input' });
    expect(input).toBeDisabled();
    expect(input).toHaveValue('project-1-0001');
    const categorySelect = screen.getByLabelText('Category', { selector: 'select' });
    await userEvent.selectOptions(categorySelect, 'DECOR');
    const elementIdInput = screen.getByLabelText('Element ID', { selector: 'input' });
    expect(elementIdInput).toBeDisabled();
    expect(elementIdInput).toHaveValue('DECOR-0001');
});
test('clicking row opens edit modal with existing data', async () => {
    render(_jsx(BudgetPage, {}));
    const firstRow = screen.getByText('Item 1').closest('tr');
    await userEvent.click(firstRow);
    const title = await screen.findByText('Edit Item');
    expect(title).toBeInTheDocument();
    const keyInput = screen.getByLabelText('Element Key', { selector: 'input' });
    expect(keyInput).toHaveValue('E1');
});
test('quantity multiplies cost in create modal', async () => {
    render(_jsx(BudgetPage, {}));
    const createBtn = screen.getByRole('button', { name: /create line item/i });
    await userEvent.click(createBtn);
    const qtyInput = await screen.findByLabelText('Quantity', { selector: 'input' });
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '5');
    const budgetInput = screen.getByLabelText('Budgeted Cost', { selector: 'input' });
    await userEvent.type(budgetInput, '100');
    const finalInput = screen.getByLabelText('Final Cost', { selector: 'input' });
    expect(finalInput).toHaveValue('$500');
});
test('cmd/ctrl+enter submits the create modal', async () => {
    render(_jsx(BudgetPage, {}));
    const createBtn = screen.getByRole('button', { name: /create line item/i });
    await userEvent.click(createBtn);
    const categorySelect = await screen.findByLabelText('Category', {
        selector: 'select',
    });
    await userEvent.selectOptions(categorySelect, 'DECOR');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(api.createBudgetItem).toHaveBeenCalled());
});
test('revision buttons trigger createBudgetItem', async () => {
    render(_jsx(BudgetPage, {}));
    api.createBudgetItem.mockResolvedValueOnce({
        budgetItemId: 'HEADER-2',
        revision: 2,
    });
    const revLabel = screen.getByRole('button', { name: /Rev\.1/i });
    await userEvent.click(revLabel);
    const newRevBtn = await screen.findByRole('button', { name: /New/i });
    await userEvent.click(newRevBtn);
    await waitFor(() => expect(api.createBudgetItem).toHaveBeenCalledWith('p1', 'b1', expect.objectContaining({ revision: 2 })));
});
