const { ethers } = require("hardhat");
const { deployPDAYL, deployPresale, deployBUSD } = require("./utils");

async function main() {
  const [owner, treasury, vault] = await ethers.getSigners();
  const me = (await ethers.getSigners()).at(19);
  console.log("\nDeploying Contracts");
  console.log("\towner:", owner.address);
  console.log("\ttreasury:", treasury.address);
  console.log("\tvault:", vault.address);

  const dayl = await deployPDAYL(owner);
  console.log("\tPresale DAYL Token deployed at:", dayl.address);

  const busd = await deployBUSD(owner);
  console.log("\tPresale BUSD Token deployed at:", busd.address);

  const timeNow = (await ethers.provider.getBlock("latest")).timestamp;
  const rate = ethers.utils.parseUnits("40", 0);
  const presaleParams = {
    _startTime: timeNow,
    _endTime: timeNow + 36000, // 10 hour later
    _claimTime: timeNow + 36000 + 3600, // 2 hours later (or as needed)
    _presaleDAYL: dayl.address,
    _busd: busd.address,
    _rate: rate,
    _softCap: ethers.utils.parseUnits("10000", 18),
    _hardCap: ethers.utils.parseUnits("100000", 18),
    _maxPerWallet: ethers.utils.parseUnits("5000", 18),
    _minPerWallet: ethers.utils.parseUnits("100", 18),
    _treasury: treasury.address,
    _vault: vault.address,
  };
  const presale = await deployPresale(owner, presaleParams);
  console.log("\tPresale deployed at:", presale.address);

  //give my wallet 100000 BUSDs 
  await busd.connect(me).mint(ethers.utils.parseEther("100000"));//me is the 20th signer.
  const walletBalance = await busd.balanceOf(me.address);
  console.log("wallet balance:", me.address, ethers.utils.formatEther(walletBalance));

  saveFrontendFiles([dayl, busd, presale]);
}

async function saveFrontendFiles(contracts) {
  const fs = require("fs");
  const path = require("path");

  const dir = path.join(__dirname, "..", "contractInfo");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFileSync(
    path.join(dir, "contract-addresses.json"),
    JSON.stringify(
      {
        dayl: contracts[0].address,
        busd: contracts[1].address,
        presale: contracts[2].address,
      },
      undefined,
      2
    )
  );

  console.log("\tcontract adresses saved in", dir, "\\contractAddresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
