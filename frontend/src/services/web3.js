import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';

let provider = null;
let signer = null;

export async function getProvider() {
  if (!provider && window.ethereum) {
    provider = new BrowserProvider(window.ethereum);
  }
  return provider;
}

export async function getSigner() {
  if (!signer) {
    const p = await getProvider();
    signer = await p.getSigner();
  }
  return signer;
}

export async function getAccount() {
  const p = await getProvider();
  const accounts = await p.listAccounts();
  return accounts[0] || null;
}

export async function getBalance(address) {
  const p = await getProvider();
  const balance = await p.getBalance(address);
  return formatEther(balance);
}

export function getContract(address, abi) {
  return async () => {
    const s = await getSigner();
    return new Contract(address, abi, s);
  };
}

export { formatEther, parseEther };
