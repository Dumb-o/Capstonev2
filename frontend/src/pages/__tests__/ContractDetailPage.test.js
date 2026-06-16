import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../../services/api');
import api from '../../services/api';

const mockRefresh = jest.fn();

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn(),
  AppProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../../hooks/useContracts', () => ({
  useContractDetail: jest.fn(),
}));

import { useApp } from '../../context/AppContext';
import { useContractDetail } from '../../hooks/useContracts';
import ContractDetailPage from '../ContractDetailPage';

const mockUseApp = useApp;
const mockUseContractDetail = useContractDetail;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/contracts/contract-123']}>
      <Routes>
        <Route path="/contracts/:id" element={<ContractDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function makeContract(overrides = {}) {
  const { milestones, dispute, ...contractOverrides } = overrides;
  return {
    contract: {
      id: 'contract-123',
      title: 'Build a DApp',
      status: 'pending_signatures',
      total_amount: '5.0',
      client_id: 'client-1',
      client_name: 'Client One',
      client_signed: false,
      freelancer_id: 'freelancer-1',
      freelancer_name: 'Freelancer One',
      freelancer_signed: false,
      description: 'Build a decentralized application',
      created_at: '2025-01-01T00:00:00Z',
      ...contractOverrides,
    },
    milestones: milestones ?? [
      { id: 'ms1', index: 0, description: 'Setup', amount: '1.0', status: 'approved', due_date: '2025-02-01T00:00:00Z' },
      { id: 'ms2', index: 1, description: 'Development', amount: '3.0', status: 'pending', due_date: '2025-03-01T00:00:00Z' },
    ],
    dispute: dispute ?? null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockClear();
  api.post.mockResolvedValue({ data: {} });
  api.get.mockResolvedValue({ data: {} });
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  window.alert.mockRestore();
});

test('shows loading spinner while contract is loading', () => {
  mockUseContractDetail.mockReturnValue({ contract: null, loading: true, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('shows contract not found when contract is null and not loading', () => {
  mockUseContractDetail.mockReturnValue({ contract: null, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Contract not found')).toBeInTheDocument();
  expect(screen.getByText('View Contracts')).toBeInTheDocument();
});

test('renders contract title', async () => {
  const contractData = makeContract();
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Build a DApp')).toBeInTheDocument();
});

test('shows contract amount in multiple locations', () => {
  const contractData = makeContract();
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  const amounts = screen.getAllByText('5.0 ETH');
  expect(amounts.length).toBeGreaterThanOrEqual(1);
});

test('shows sign button for client when pending_signatures', () => {
  const contractData = makeContract({ client_signed: false, freelancer_signed: false });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Sign as Client')).toBeInTheDocument();
});

test('shows sign button for freelancer when pending_signatures', () => {
  const contractData = makeContract({ client_signed: true, freelancer_signed: false });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'freelancer-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Sign as Freelancer')).toBeInTheDocument();
});

test('calls signContract when sign button clicked', async () => {
  const contractData = makeContract({ client_signed: false, freelancer_signed: false });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  fireEvent.click(screen.getByText('Sign as Client'));
  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/contracts/contract-123/sign');
  });
  expect(mockRefresh).toHaveBeenCalled();
});

test('shows milestones in the list', () => {
  const contractData = makeContract();
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('#1 Setup')).toBeInTheDocument();
  expect(screen.getByText('#2 Development')).toBeInTheDocument();
});

test('shows milestone count', () => {
  const contractData = makeContract();
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Milestones (2)')).toBeInTheDocument();
});

test('shows approve and reject buttons for client on submitted milestone', () => {
  const contractData = makeContract({
    status: 'active',
    milestones: [
      { id: 'ms1', index: 0, description: 'Milestone 1', amount: '2.0', status: 'submitted', due_date: null },
    ],
  });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Approve')).toBeInTheDocument();
  expect(screen.getByText('Reject')).toBeInTheDocument();
});

test('shows no action buttons for non-client/non-freelancer user', () => {
  const contractData = makeContract({
    status: 'active',
    milestones: [
      { id: 'ms1', index: 0, description: 'Milestone 1', amount: '2.0', status: 'submitted', due_date: null },
    ],
  });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'other-user' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  expect(screen.queryByText('Reject')).not.toBeInTheDocument();
});

test('shows no milestones message when milestones array is empty', () => {
  const contractData = makeContract({ milestones: [] });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('No milestones defined.')).toBeInTheDocument();
});

test('shows dispute section when dispute exists', () => {
  const contractData = makeContract({
    status: 'disputed',
    dispute: { status: 'open', reason: 'Breach of contract' },
  });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText((c) => c.includes('Breach of contract'))).toBeInTheDocument();
});

test('raise dispute button shows for active contract', () => {
  const contractData = makeContract({ status: 'active', dispute: null });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Raise Dispute')).toBeInTheDocument();
});

test('dispute modal opens and submits', async () => {
  const contractData = makeContract({ status: 'active', dispute: null });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  fireEvent.click(screen.getByText('Raise Dispute'));
  const textarea = screen.getByPlaceholderText('Describe the issue clearly...');
  fireEvent.change(textarea, { target: { value: 'Not satisfied with work' } });
  fireEvent.click(screen.getByText('Submit Dispute'));
  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/contracts/contract-123/disputes', {
      raised_by: 'client',
      reason: 'Not satisfied with work',
    });
  });
});

test('submit dispute button is disabled when reason is empty', () => {
  const contractData = makeContract({ status: 'active', dispute: null });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  fireEvent.click(screen.getByText('Raise Dispute'));
  expect(screen.getByText('Submit Dispute')).toBeDisabled();
});

test('shows escrow box', () => {
  const contractData = makeContract();
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Escrow')).toBeInTheDocument();
  expect(screen.getByText('Secured in smart contract')).toBeInTheDocument();
});

test('shows description card when description exists', () => {
  const contractData = makeContract({ description: 'Build a decentralized application' });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Description')).toBeInTheDocument();
  expect(screen.getByText('Build a decentralized application')).toBeInTheDocument();
});

test('shows back link to contracts list', () => {
  const contractData = makeContract();
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  const backLink = screen.getByText('← Back');
  expect(backLink.closest('a')).toHaveAttribute('href', '/contracts');
});

test('handles sign error with alert', async () => {
  const contractData = makeContract({ client_signed: false, freelancer_signed: false });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  api.post.mockRejectedValue({ response: { data: { detail: 'Sign failed' } } });
  renderPage();
  fireEvent.click(screen.getByText('Sign as Client'));
  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Sign failed');
  });
});

test('shows deadline when present', () => {
  const contractData = makeContract({ deadline: '2025-06-01T00:00:00Z' });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  expect(screen.getByText('Deadline')).toBeInTheDocument();
});

test('shows job link when job_id present', () => {
  const contractData = makeContract({ job_id: 'job-1', job_title: 'My Job' });
  mockUseContractDetail.mockReturnValue({ contract: contractData, loading: false, refresh: mockRefresh });
  mockUseApp.mockReturnValue({
    state: { user: { id: 'client-1' } },
    logout: jest.fn(),
  });
  renderPage();
  const jobLink = screen.getByText('My Job');
  expect(jobLink.closest('a')).toHaveAttribute('href', '/jobs/job-1');
});
