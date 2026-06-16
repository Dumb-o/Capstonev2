import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../test-utils';

const mockAuthenticate = jest.fn();
const mockRegisterEmail = jest.fn();
const mockLoginEmail = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../hooks/useAuth', () => ({
  useAuth: (...args) => mockUseAuth(...args),
}));

import Login from '../auth/Login';

const baseAuthValue = {
  authenticate: mockAuthenticate,
  registerEmail: mockRegisterEmail,
  loginEmail: mockLoginEmail,
  loading: false,
  error: null,
};

beforeEach(() => {
  mockAuthenticate.mockClear();
  mockRegisterEmail.mockClear();
  mockLoginEmail.mockClear();
  mockUseAuth.mockClear();
  mockUseAuth.mockReturnValue(baseAuthValue);
  delete process.env.REACT_APP_ADMIN_MODE;
});

test('renders sign in form by default', () => {
  renderWithRouter(<Login />);
  expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
});

test('switches to register tab when Create Account is clicked', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getAllByText('Create Account')[0]);
  expect(await screen.findByPlaceholderText('John')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
});

test('switches back to signin from register tab', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getAllByText('Create Account')[0]);
  fireEvent.click(await screen.findByText('Sign in →'));
  expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
});

test('calls loginEmail on sign in submit', async () => {
  renderWithRouter(<Login />);
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => {
    expect(mockLoginEmail).toHaveBeenCalledWith('a@b.com', 'pass123');
  });
});

test('does not call loginEmail when email is empty', async () => {
  renderWithRouter(<Login />);
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => {
    expect(mockLoginEmail).not.toHaveBeenCalled();
  });
});

test('does not call loginEmail when password is empty', async () => {
  renderWithRouter(<Login />);
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } });
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => {
    expect(mockLoginEmail).not.toHaveBeenCalled();
  });
});

test('calls registerEmail on registration submit', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getAllByText('Create Account')[0]);
  fireEvent.change(await screen.findByPlaceholderText('John'), { target: { value: 'John' } });
  fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'j@d.com' } });
  fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'secret123' } });
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => {
    expect(mockRegisterEmail).toHaveBeenCalledWith('j@d.com', 'secret123', 'John Doe', 'freelancer');
  });
});

test('shows error message when useAuth provides error', () => {
  mockUseAuth.mockReturnValue({ ...baseAuthValue, error: 'Invalid credentials' });
  renderWithRouter(<Login />);
  expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
});

test('disables sign in button while loading', () => {
  mockUseAuth.mockReturnValue({ ...baseAuthValue, loading: true });
  renderWithRouter(<Login />);
  expect(screen.getByText('Signing in...')).toBeDisabled();
});

test('disables register button while loading', async () => {
  mockUseAuth.mockReturnValue({ ...baseAuthValue, loading: true });
  renderWithRouter(<Login />);
  fireEvent.click(screen.getAllByText('Create Account')[0]);
  expect(await screen.findByText('Creating account...')).toBeDisabled();
});

test('disables MetaMask button while loading', () => {
  mockUseAuth.mockReturnValue({ ...baseAuthValue, loading: true });
  renderWithRouter(<Login />);
  expect(screen.getByText('Connect with MetaMask')).toBeDisabled();
});

test('calls authenticate via MetaMask button', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getByText('Connect with MetaMask'));
  await waitFor(() => {
    expect(mockAuthenticate).toHaveBeenCalledWith('freelancer');
  });
});

test('shows admin mode without tabs when REACT_APP_ADMIN_MODE is true', () => {
  process.env.REACT_APP_ADMIN_MODE = 'true';
  renderWithRouter(<Login />);
  expect(screen.queryByText('Create Account')).not.toBeInTheDocument();
  expect(screen.queryByText('Connect with MetaMask')).not.toBeInTheDocument();
});

test('back link navigates to home', () => {
  renderWithRouter(<Login />);
  const backLink = screen.getByText('Back to home');
  expect(backLink.closest('a')).toHaveAttribute('href', '/');
});

test('renders panel features on signin tab', () => {
  renderWithRouter(<Login />);
  expect(screen.getByText('Cryptographic wallet authentication')).toBeInTheDocument();
  expect(screen.getByText('Zero-knowledge identity verification')).toBeInTheDocument();
});

test('renders register panel features after switching tab', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getAllByText('Create Account')[0]);
  expect(await screen.findByText('Free to join, no subscription fees')).toBeInTheDocument();
  expect(screen.getByText('Verifiable on-chain reputation')).toBeInTheDocument();
});

test('calls authenticate with client role when client radio selected', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getByText('Client'));
  fireEvent.click(screen.getByText('Connect with MetaMask'));
  await waitFor(() => {
    expect(mockAuthenticate).toHaveBeenCalledWith('client');
  });
});

test('register tab has MetaMask signup option', async () => {
  renderWithRouter(<Login />);
  fireEvent.click(screen.getAllByText('Create Account')[0]);
  expect(await screen.findByText('Sign up with MetaMask')).toBeInTheDocument();
});

test('renders FreeLedger branding', () => {
  renderWithRouter(<Login />);
  const logos = screen.getAllByText('FreeLedger');
  expect(logos.length).toBeGreaterThanOrEqual(1);
});
