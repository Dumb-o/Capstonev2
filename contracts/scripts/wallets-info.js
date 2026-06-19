// Print the first 2 funded Hardhat accounts and save wallet info to file.
const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const rows = [];
  for (let i = 0; i < Math.min(2, accounts.length); i++) {
    const pk = hre.ethers.Wallet.fromMnemonic(
      hre.network.config.accounts?.mnemonic ||
        "test test test test test test test test test test test junk"
    ).privateKey;
    const address = accounts[i].address;
    rows.push({ index: i, address, privateKey: pk });
  }
  console.log("\n=== Hardhat Local Wallets ===\n");
  rows.forEach((r) => {
    console.log(`Account #${r.index}`);
    console.log(`  Address:    ${r.address}`);
    console.log(`  Private Key: ${r.privateKey}`);
    console.log(`  Role:       ${r.index === 0 ? "client" : "freelancer"}`);
    console.log();
  });

  const targetPath = require("path").resolve(
    __dirname,
    "wallets-info.txt"
  );
  const contents = [
    "Hardhat Local Account Info",
    "==========================",
    "",
    ...rows.flatMap((r) => [
      `Account #${r.index}`,
      `  Address:    ${r.address}`,
      `  Private Key: ${r.privateKey}`,
      `  Role:       ${r.index === 0 ? "client" : "freelancer"}`,
      "",
    ]),
    "Import these private keys into MetaMask for testing.",
  ]
    .join("\n")
    .concat("\n");
  require("fs").writeFileSync(targetPath, contents, { flag: "w" });
  console.log(`Wallet info saved to: ${targetPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
