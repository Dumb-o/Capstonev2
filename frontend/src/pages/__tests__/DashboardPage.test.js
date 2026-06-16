import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../test-utils';

const mockLogout = jest.fn();

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn(),
  AppProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../../services/api');
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import DashboardPage from '../DashboardPage';

const mockUseApp = useApp;

beforeEach(() => {
  jest.clearAllMocks();
  mockLogout.mockClear();
  api.get.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: {} });
});

function mockClientUser() {
  mockUseApp.mockReturnValue({
    state: {
      user: { id: 'u1', username: 'TestClient', role: 'client', bio: 'Bio here' },
      isAuthenticated: true,
      walletAddress: null,
    },
    logout: mockLogout,
  });
}

function mockFreelancerUser() {
  mockUseApp.mockReturnValue({
    state: {
      user: { id: 'u2', username: 'TestFreelancer', role: 'freelancer', bio: 'Bio here', skills: ['React'] },
      isAuthenticated: true,
      walletAddress: null,
    },
    logout: mockLogout,
  });
}

test('renders client dashboard with welcome message', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: {} });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('Welcome back, TestClient 👋')).toBeInTheDocument();
});

test('renders freelancer dashboard with welcome message', async () => {
  mockFreelancerUser();
  api.get.mockImplementation((url) => {
    if (url === '/recommendations/jobs') return Promise.resolve({ data: [] });
    if (url === '/proposals/mine') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('Welcome back, TestFreelancer 👋')).toBeInTheDocument();
});

test('client dashboard shows "Post New Project" button', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('+ Post New Project')).toBeInTheDocument();
});

test('client dashboard shows profile completeness', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('Profile Complete')).toBeInTheDocument();
});

test('freelancer dashboard shows Browse Jobs button', async () => {
  mockFreelancerUser();
  api.get.mockImplementation((url) => {
    if (url === '/recommendations/jobs') return Promise.resolve({ data: [] });
    if (url === '/proposals/mine') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('Browse Jobs')).toBeInTheDocument();
});

test('freelancer dashboard shows active contracts section', async () => {
  mockFreelancerUser();
  api.get.mockImplementation((url) => {
    if (url === '/recommendations/jobs') return Promise.resolve({ data: [] });
    if (url === '/proposals/mine') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [{ id: 'c1', title: 'Test Contract', status: 'active', total_amount: '5', client_name: 'Client', created_at: new Date().toISOString() }] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('Test Contract')).toBeInTheDocument();
});

test('client dashboard shows open jobs empty state', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText("You haven't posted any jobs yet.")).toBeInTheDocument();
});

test('client dashboard shows post job form when button clicked', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  fireEvent.click(await screen.findByText('+ Post New Project'));
  expect(screen.getByPlaceholderText('e.g. Full Stack Developer Needed')).toBeInTheDocument();
});

test('client dashboard calls api.post when posting a job', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  fireEvent.click(await screen.findByText('+ Post New Project'));
  fireEvent.change(screen.getByPlaceholderText('e.g. Full Stack Developer Needed'), { target: { value: 'React Dev' } });
  fireEvent.change(screen.getByPlaceholderText('5.0'), { target: { value: '10' } });
  fireEvent.click(screen.getByText('Post Job'));
  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/jobs', expect.objectContaining({
      title: 'React Dev',
      budget: 10,
    }));
  });
});

test('client dashboard shows proposals received section', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [{ id: 'p1', job_id: 'j1', job_title: 'Job Title', bid_amount: '2', freelancer_name: 'Freelancer', status: 'pending', estimated_days: 10 }] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  const proposalsHeadings = await screen.findAllByText('Proposals Received');
  expect(proposalsHeadings.length).toBeGreaterThanOrEqual(1);
});

test('freelancer dashboard shows recommended jobs empty state', async () => {
  mockFreelancerUser();
  api.get.mockImplementation((url) => {
    if (url === '/recommendations/jobs') return Promise.resolve({ data: [] });
    if (url === '/proposals/mine') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('No recommended jobs right now.')).toBeInTheDocument();
});

test('freelancer dashboard shows my proposals empty state', async () => {
  mockFreelancerUser();
  api.get.mockImplementation((url) => {
    if (url === '/recommendations/jobs') return Promise.resolve({ data: [] });
    if (url === '/proposals/mine') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText("You haven't submitted any proposals yet.")).toBeInTheDocument();
});

test('client dashboard shows open jobs count in stats', async () => {
  mockClientUser();
  api.get.mockImplementation((url) => {
    if (url === '/jobs') return Promise.resolve({ data: { jobs: [{ id: 'j1', title: 'Job 1', status: 'open', budget: '5' }] } });
    if (url === '/proposals/received') return Promise.resolve({ data: [] });
    if (url === '/recommendations/freelancers') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('Open Jobs')).toBeInTheDocument();
});

test('freelancer dashboard shows on-chain reputation card', async () => {
  mockFreelancerUser();
  api.get.mockImplementation((url) => {
    if (url === '/recommendations/jobs') return Promise.resolve({ data: [] });
    if (url === '/proposals/mine') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { contracts: [] } });
  });
  renderWithRouter(<DashboardPage />, { route: '/dashboard' });
  expect(await screen.findByText('On-Chain Reputation')).toBeInTheDocument();
});
