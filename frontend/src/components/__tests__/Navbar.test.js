import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../test-utils';

const mockLogout = jest.fn();

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn(),
  AppProvider: ({ children }) => <>{children}</>,
}));

import { useApp } from '../../context/AppContext';
import Navbar from '../shared/Navbar';

const mockUseApp = useApp;

beforeEach(() => {
  mockLogout.mockClear();
  delete process.env.REACT_APP_ADMIN_MODE;
});

test('renders landing variant with Features link on home page', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: false, user: null },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/' });
  expect(screen.getByText('FreeLedger')).toBeInTheDocument();
  expect(screen.getByText('Features')).toBeInTheDocument();
  expect(screen.getByText('How It Works')).toBeInTheDocument();
  expect(screen.getByText('Get Started')).toBeInTheDocument();
  expect(screen.getByText('Login')).toBeInTheDocument();
});

test('renders dashboard variant when not on home page', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Alice', role: 'freelancer' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Contracts')).toBeInTheDocument();
  expect(screen.getByText('Messages')).toBeInTheDocument();
});

test('shows FREELANCER PORTAL tag for freelancer role', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Bob', role: 'freelancer' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('FREELANCER PORTAL')).toBeInTheDocument();
});

test('shows CLIENT PORTAL tag for client role', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Carol', role: 'client' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('CLIENT PORTAL')).toBeInTheDocument();
});

test('shows admin-specific links for admin role', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Admin', role: 'admin' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/admin' });
  expect(screen.getByText('ADMIN PORTAL')).toBeInTheDocument();
  const adminLinks = screen.getAllByText('Admin');
  expect(adminLinks.length).toBeGreaterThanOrEqual(1);
  expect(adminLinks[0].closest('a')).toHaveAttribute('href', '/admin');
});

test('shows Post a Job and Browse Freelancers links for client role', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Client', role: 'client' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('Post a Job')).toBeInTheDocument();
  expect(screen.getByText('Browse Freelancers')).toBeInTheDocument();
});

test('shows Find Jobs for freelancer role', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Freelancer', role: 'freelancer' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('Find Jobs')).toBeInTheDocument();
});

test('shows Explore Jobs for client role', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Client', role: 'client' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('Explore Jobs')).toBeInTheDocument();
});

test('shows user avatar and role in dashboard variant', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Alice', role: 'freelancer' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('freelancer')).toBeInTheDocument();
  expect(screen.getByText('A')).toBeInTheDocument();
});

test('shows Logout button for authenticated user', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Test', role: 'freelancer' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  const logoutBtn = screen.getByText('Logout');
  expect(logoutBtn).toBeInTheDocument();
});

test('calls logout and navigates on Logout click', async () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Test', role: 'freelancer' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  fireEvent.click(screen.getByText('Logout'));
  await waitFor(() => {
    expect(mockLogout).toHaveBeenCalled();
  });
});

test('does not show Logout or user chip when not authenticated', () => {
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: false, user: null },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.queryByText('Logout')).not.toBeInTheDocument();
});

test('uses wallet address when username not available', () => {
  mockUseApp.mockReturnValue({
    state: {
      isAuthenticated: true,
      user: { role: 'freelancer' },
      walletAddress: '0xABC123',
    },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('0xABC1')).toBeInTheDocument();
});

test('shows admin mode landing when REACT_APP_ADMIN_MODE is true', () => {
  process.env.REACT_APP_ADMIN_MODE = 'true';
  mockUseApp.mockReturnValue({
    state: { isAuthenticated: true, user: { username: 'Admin', role: 'admin' } },
    logout: mockLogout,
  });
  renderWithRouter(<Navbar />, { route: '/dashboard' });
  expect(screen.getByText('ADMIN PORTAL')).toBeInTheDocument();
});
