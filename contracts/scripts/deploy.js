const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const CLIENT_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const FREELANCER_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const CLIENT_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const FREELANCER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n=== Deploying GigEscrow ===\n");
  console.log("Deployer:", deployer.address);

  const GigEscrow = await hre.ethers.getContractFactory("GigEscrow");
  const escrow = await GigEscrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("GigEscrow deployed to:", address);

  const backendEnvPath = path.resolve(__dirname, "../../backend/.env");
  const envContent = `CONTRACT_ADDRESS=${address}\n`;
  fs.writeFileSync(backendEnvPath, envContent, { flag: "a" });
  console.log("CONTRACT_ADDRESS appended to backend/.env\n");

  const artifactsPath = path.resolve(__dirname, "../artifacts/contracts/GigEscrow.sol/GigEscrow.json");
  const targetPath = path.resolve(__dirname, "../../backend/app/contracts/GigEscrow.json");
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(artifactsPath, targetPath);
  console.log("ABI copied to backend/app/contracts/\n");

  const infoPath = path.resolve(__dirname, "contract-address.txt");
  const info = [
    `Contract: ${address}`,
    `Deployer: ${deployer.address}`,
    "",
    "=== Dedicated Development Wallets ===",
    `Client Wallet (Hardhat #0):`,
    `  Address:    ${CLIENT_WALLET}`,
    `  Private Key: ${CLIENT_PK}`,
    `  Role:       client`,
    "",
    `Freelancer Wallet (Hardhat #1):`,
    `  Address:    ${FREELANCER_WALLET}`,
    `  Private Key: ${FREELANCER_PK}`,
    `  Role:       freelancer`,
    "",
    "Import both wallets into MetaMask for testing.",
  ].join("\n");
  fs.writeFileSync(infoPath, info);
  console.log("Wallet info written to scripts/contract-address.txt");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
