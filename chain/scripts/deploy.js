const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function deployContract(name, ...args) {
  const Factory = await hre.ethers.getContractFactory(name);
  const contract = await Factory.deploy(...args);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`${name} deployed to: ${address}`);

  return { name, address, contract };
}

async function main() {
  // Deploy contracts in dependency order (update this list as contracts are added)
  const deploymentOrder = ["TravellerID"];

  const deployedAddresses = {};

  for (const contractName of deploymentOrder) {
    const { address } = await deployContract(contractName);
    deployedAddresses[contractName] = address;
  }

  const output = {
    network: hre.network.name,
    chainId: hre.network.config.chainId ?? null,
    deployedAt: new Date().toISOString(),
    contracts: deployedAddresses,
  };

  const outputPath = path.join(__dirname, "..", "deployedAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Saved deployed addresses to: ${outputPath}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
