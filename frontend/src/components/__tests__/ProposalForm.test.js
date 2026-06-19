import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../services/api');
import api from '../../services/api';
import ProposalForm from '../proposals/ProposalForm';

const defaultProps = {
  jobId: 'job-123',
  jobTitle: 'Build a DApp',
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  api.post.mockResolvedValue({ data: {} });
  api.get.mockResolvedValue({ data: {} });
});

test('renders modal with job title', () => {
  render(<ProposalForm {...defaultProps} />);
  expect(screen.getByText('Apply for Job')).toBeInTheDocument();
  expect(screen.getByText('Build a DApp')).toBeInTheDocument();
});

test('calls onClose when close button clicked', () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.click(screen.getByText('×'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});

test('calls onClose when overlay clicked', () => {
  render(<ProposalForm {...defaultProps} />);
  const overlay = document.querySelector('.modal-overlay');
  fireEvent.click(overlay);
  expect(defaultProps.onClose).toHaveBeenCalled();
});

test('prevents click inside modal from closing', () => {
  render(<ProposalForm {...defaultProps} />);
  const modalBox = document.querySelector('.modal-box');
  fireEvent.click(modalBox);
  expect(defaultProps.onClose).not.toHaveBeenCalled();
});

test('calls onCancel when Cancel button clicked', () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.click(screen.getByText('Cancel'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});

test('shows validation error when bid amount is empty', async () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.click(screen.getByText('Submit Proposal'));
  expect(await screen.findByText('Bid amount is required and must be greater than 0')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('shows validation error when bid amount is 0', async () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '0' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  expect(await screen.findByText('Bid amount is required and must be greater than 0')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('shows validation error when bid amount is negative', async () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '-1' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  expect(await screen.findByText('Bid amount is required and must be greater than 0')).toBeInTheDocument();
});

test('submits form successfully with minimum fields', async () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '2.5' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/jobs/job-123/proposals', {
      cover_letter: null,
      bid_amount: 2.5,
      estimated_days: null,
    });
  });
  expect(defaultProps.onSuccess).toHaveBeenCalledWith('submitted');
});

test('submits form with all fields', async () => {
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '5.0' } });
  fireEvent.change(screen.getByPlaceholderText('14'), { target: { value: '10' } });
  fireEvent.change(screen.getByPlaceholderText(/Introduce yourself/), { target: { value: 'I am great for this' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/jobs/job-123/proposals', {
      cover_letter: 'I am great for this',
      bid_amount: 5.0,
      estimated_days: 10,
    });
  });
});

test('disables submit button while submitting', async () => {
  api.post.mockImplementation(() => new Promise(() => {}));
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  expect(await screen.findByText('Submitting...')).toBeInTheDocument();
});

test('handles server error on submit', async () => {
  api.post.mockRejectedValue({
    response: { data: { detail: 'Insufficient balance' } },
  });
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '3' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  expect(await screen.findByText('Insufficient balance')).toBeInTheDocument();
  expect(defaultProps.onSuccess).not.toHaveBeenCalled();
});

test('handles already_applied error gracefully', async () => {
  api.post.mockRejectedValue({
    response: { data: { detail: 'You have already proposed on this job' } },
  });
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  await waitFor(() => {
    expect(defaultProps.onSuccess).toHaveBeenCalledWith('already_applied');
  });
});

test('shows generic error when no detail in response', async () => {
  api.post.mockRejectedValue({ response: { data: {} } });
  render(<ProposalForm {...defaultProps} />);
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  expect(await screen.findByText('Failed to submit proposal. Please try again.')).toBeInTheDocument();
});

test('renders with different jobId', async () => {
  render(<ProposalForm {...defaultProps} jobId="job-456" jobTitle="Smart Contract Audit" />);
  expect(screen.getByText('Smart Contract Audit')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1' } });
  fireEvent.click(screen.getByText('Submit Proposal'));
  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/jobs/job-456/proposals', expect.any(Object));
  });
});
