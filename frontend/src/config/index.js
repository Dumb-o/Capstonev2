const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
  contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS || '',
  ipfsGateway: process.env.REACT_APP_IPFS_GATEWAY || '/ipfs',
};

export default config;
