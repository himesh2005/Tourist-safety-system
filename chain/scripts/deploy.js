const fs = require("fs");
const path = require("path");

async function main() {
  const TravellerID = await ethers.getContractFactory("TravellerID");

  const contract = await TravellerID.deploy();

  // ✅ ethers v6
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("TravellerID deployed to:", address);

  // ✅ save for server auto-read
  const out = {
    CONTRACT_ADDRESS: address,
    updatedAt: new Date().toISOString()
  };

  const outPath = path.join(__dirname, "..", "deployed.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Saved deployed.json ->", outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
