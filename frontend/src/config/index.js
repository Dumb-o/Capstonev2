const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS || '',
  ipfsGateway: process.env.REACT_APP_IPFS_GATEWAY || 'http://localhost:8080',
};

export default config;
