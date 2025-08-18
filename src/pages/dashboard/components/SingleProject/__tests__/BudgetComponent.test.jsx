import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../../../app/contexts/DataProvider', () => ({
  useData: () => ({ user: null, isAdmin: false, isBuilder: false, isDesigner: false })
}));

jest.mock('../../../../../app/contexts/SocketContext', () => ({
  useSocket: () => ({ ws: null })
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('../ClientInvoicePreviewModal', () => ({
  __esModule: true,
  default: () => null
}));

jest.mock('../VisxPieChart', () => ({
  __esModule: true,
  default: () => null
}));

let mockBudgetHeader;
let mockBudgetItems;

const mockUseBudgetData = jest.fn();
jest.mock('../useBudgetData', () => ({
  __esModule: true,
  default: mockUseBudgetData,
}));

const BudgetComponent = require('../BudgetComponent.jsx').default;

beforeEach(() => {
  mockBudgetHeader = { headerBallPark: 5000, headerFinalTotalCost: 0 };
  mockBudgetItems = [];
  mockUseBudgetData.mockImplementation(() => ({
    budgetHeader: mockBudgetHeader,
    budgetItems: mockBudgetItems,
    refresh: jest.fn(),
    loading: false
  }));
});

test('shows headerBallPark when no line items', () => {
  const { rerender } = render(<BudgetComponent activeProject={{ projectId: 'p1', title: 'Test' }} />);
  expect(screen.getByText('$5,000')).toBeInTheDocument();

  mockBudgetHeader = { ...mockBudgetHeader, headerBallPark: 6000 };
  mockUseBudgetData.mockImplementation(() => ({
    budgetHeader: mockBudgetHeader,
    budgetItems: mockBudgetItems,
    refresh: jest.fn(),
    loading: false
  }));
  rerender(<BudgetComponent activeProject={{ projectId: 'p1', title: 'Test' }} />);
  expect(screen.getByText('$6,000')).toBeInTheDocument();
});

test('shows final total cost when line items exist', () => {
  mockBudgetItems = [{ itemFinalCost: 100 }];
  mockBudgetHeader = { headerBallPark: 5000, headerFinalTotalCost: 8000 };
  mockUseBudgetData.mockImplementation(() => ({
    budgetHeader: mockBudgetHeader,
    budgetItems: mockBudgetItems,
    refresh: jest.fn(),
    loading: false
  }));
  const { rerender } = render(<BudgetComponent activeProject={{ projectId: 'p1', title: 'Test' }} />);
  expect(screen.getByText('$8,000')).toBeInTheDocument();

  mockBudgetItems = [];
  mockBudgetHeader = { headerBallPark: 7000, headerFinalTotalCost: 0 };
  mockUseBudgetData.mockImplementation(() => ({
    budgetHeader: mockBudgetHeader,
    budgetItems: mockBudgetItems,
    refresh: jest.fn(),
    loading: false
  }));
  rerender(<BudgetComponent activeProject={{ projectId: 'p1', title: 'Test' }} />);
  expect(screen.getByText('$7,000')).toBeInTheDocument();
});
