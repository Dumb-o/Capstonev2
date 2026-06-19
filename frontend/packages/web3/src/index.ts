import { BrowserProvider } from "ethers";

export function getProvider() {
  if (typeof window === "undefined") {
    throw new Error("MetaMask provider is not available on the server.");
  }
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Install MetaMask and refresh.");
  }
  return new BrowserProvider(window.ethereum);
}

export async function loginWithMetaMask() {
  const provider = getProvider();

  const accounts = await provider.send("eth_requestAccounts", []);
  const address = accounts[0];

  const challengeRes = await fetch("http://localhost:8000/api/auth/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!challengeRes.ok) {
    const text = await challengeRes.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {}
    throw new Error(detail);
  }

  const { nonce } = await challengeRes.json();

  const signer = await provider.getSigner();
  const signature = await signer.signMessage(nonce);

  const loginRes = await fetch("http://localhost:8000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature }),
  });

  if (!loginRes.ok) {
    const text = await loginRes.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {}
    throw new Error(detail);
  }

  return loginRes.json();
}

export async function ensureCorrectNetwork(providerInstance) {
  const currentChainId = await providerInstance.send("eth_chainId");
  const HARDHAT_CHAIN_ID = "0x539";

  if (currentChainId !== HARDHAT_CHAIN_ID) {
    try {
      await providerInstance.send("wallet_switchEthereumChain", [
        { chainId: HARDHAT_CHAIN_ID },
      ]);
    } catch (switchError) {
      if (switchError?.code === 4902) {
        await providerInstance.send("wallet_addEthereumChain", [
          {
            chainId: HARDHAT_CHAIN_ID,
            chainName: "Localhost 8545",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ]);
      } else {
        throw switchError;
      }
    }
  }
}
