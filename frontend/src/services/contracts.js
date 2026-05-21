import api from './api';

export async function createContract(data) {
  const response = await api.post('/contracts', data);
  return response.data;
}

export async function fetchContracts(params = {}) {
  const response = await api.get('/contracts', { params });
  return response.data;
}

export async function fetchContract(id) {
  const response = await api.get(`/contracts/${id}`);
  return response.data;
}

export async function signContract(id) {
  const response = await api.post(`/contracts/${id}/sign`);
  return response.data;
}

export async function fetchMilestones(contractId) {
  const response = await api.get(`/contracts/${contractId}/milestones`);
  return response.data;
}

export async function submitMilestone(contractId, milestoneIndex, data) {
  const response = await api.post(
    `/contracts/${contractId}/milestones/${milestoneIndex}/submit`,
    data
  );
  return response.data;
}

export async function approveMilestone(contractId, milestoneIndex) {
  const response = await api.post(
    `/contracts/${contractId}/milestones/${milestoneIndex}/approve`
  );
  return response.data;
}

export async function rejectMilestone(contractId, milestoneIndex, reason) {
  const response = await api.post(
    `/contracts/${contractId}/milestones/${milestoneIndex}/reject`,
    { reason }
  );
  return response.data;
}
