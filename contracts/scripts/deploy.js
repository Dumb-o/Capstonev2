const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const GigEscrow = await hre.ethers.getContractFactory("GigEscrow");
  const escrow = await GigEscrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("GigEscrow deployed to:", address);

  const backendEnvPath = path.resolve(__dirname, "../../backend/app/.env");
  const envContent = `CONTRACT_ADDRESS=${address}\nDEPLOYER_ADDRESS=${deployer.address}\n`;
  fs.writeFileSync(backendEnvPath, envContent, { flag: "a" });
  console.log("Contract address written to backend .env");

  const artifactsPath = path.resolve(__dirname, "../artifacts/contracts/GigEscrow.sol/GigEscrow.json");
  const targetPath = path.resolve(__dirname, "../../backend/app/contracts/GigEscrow.json");
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(artifactsPath, targetPath);
  console.log("ABI copied to backend");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
