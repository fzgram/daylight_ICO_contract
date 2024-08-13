const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers");

const contractAddresses = require("../contractInfo/contract-addresses.json");
const busdAbi =
  require("../artifacts/contracts/TestBUSD.sol/TestBUSD.json").abi;
const daylAbi =
  require("../artifacts/contracts/PresaleDAYL.sol/PresaleDAYL.json").abi;
const presaleAbi =
  require("../artifacts/contracts/Presale.sol/Presale.json").abi;
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

const rate = utils.parseUnits("40", 0);
async function main() {
  //get signers
  const [owner, treasury, valut, bob, alice] = await ethers.getSigners();

  //get contracts
  const busd = new ethers.Contract(contractAddresses.busd, busdAbi, provider);
  const dayl = new ethers.Contract(contractAddresses.dayl, daylAbi, provider);
  const presale = new ethers.Contract(
    contractAddresses.presale,
    presaleAbi,
    provider
  );

  //show users
  console.log("\nGet users from localnet");
  console.log("\towner:", owner.address);
  console.log("\tbob:", bob.address);
  console.log("\talice:", alice.address);

  //show some initial values
  console.log("Get contracts' some infomation");
  let tokenName = await busd.name();
  let tokenSymbol = await busd.symbol();
  console.log("\tbusd contract:", tokenName, tokenSymbol);

  tokenName = await dayl.name();
  tokenSymbol = await dayl.symbol();
  console.log("\tdayl contract:", tokenName, tokenSymbol);

  const softCap = await presale.softCap();
  const hardCap = await presale.hardCap();
  console.log(
    "\tpresale contract:",
    `softCap: ${utils.formatEther(softCap)}`,
    `hardCap: ${utils.formatEther(hardCap)}`
  );

  //give some BUSD to bob and alice
  console.log("Give 10000 BUSDs to bob and alice, respectively");
  let balance = await busd.balanceOf(alice.address);
  await busd.connect(alice).burn(balance);
  await busd.connect(alice).mint(utils.parseEther("10000"));
  balance = await busd.balanceOf(alice.address);
  console.log("\talice balance: ", utils.formatEther(balance));

  balance = await busd.balanceOf(bob.address);
  await busd.connect(bob).burn(balance);
  await busd.connect(bob).mint(utils.parseEther("10000"));
  balance = await busd.balanceOf(bob.address);
  console.log("\tbob balance: ", utils.formatEther(balance));

  //block timestamp
  let timeNow = (await ethers.provider.getBlock("latest")).timestamp;
  console.log("Block time now:", new Date(timeNow * 1000));

  //bob deposits 5000BUSD
  console.log("Bob deposits 5000BUSD");
  await busd.connect(bob).approve(presale.address, utils.parseEther("5000"));
  await presale.connect(owner).addWhitelists([bob.address]); // warn: must be added by owner.
  await presale.connect(bob).deposit(rate.mul(utils.parseEther("5000")));

  const bobInfo = await presale.userInfo(bob.address);
  console.log(`\tbob deposited:`, utils.formatEther(bobInfo.depositAmount));
  balance = await busd.balanceOf(bob.address);
  console.log("\tbob balance", utils.formatEther(balance));

  //bob is going to deposit 4000BUSD now but it will be reverted because the total deposit amount is over the maxPerWallet
  console.log(
    "Bob is going to deposit again but fails because the amount is over the maxPerWallet"
  );
  await busd.connect(bob).approve(presale.address, utils.parseEther("4000"));
  await expect(
    presale.connect(bob).deposit(rate.mul(utils.parseEther("4000")))
  ).to.revertedWith("Invalid BUSD deposit");

  //alice deposits 5000BUSD
  console.log("Alice deposits 5000BUSD");
  await busd.connect(alice).approve(presale.address, utils.parseEther("5000"));
  await presale.connect(owner).addWhitelists([alice.address]); // warn: must be added by owner.
  await presale.connect(alice).deposit(rate.mul(utils.parseEther("5000")));

  const aliceInfo = await presale.userInfo(alice.address);
  console.log(`\talice deposited:`, utils.formatEther(aliceInfo.depositAmount));
  balance = await busd.balanceOf(alice.address);
  console.log("\talice balance", utils.formatEther(balance));

  //bob claim pDAYL tokens but he will fail since presale not ended
  console.log(
    `Bob is going to claim pDAYL tokens but he will fail since presale not ended`
  );
  await expect(presale.connect(bob).claimToken()).to.be.revertedWith(
    "Unable to claim any tokens"
  );

  //Spent time to the end
  console.log("Spent time to the end");
  await network.provider.send("evm_increaseTime", [8000]);
  await network.provider.send("evm_mine");
  timeNow = (await ethers.provider.getBlock("latest")).timestamp;
  console.log("\tblock time now:", new Date(timeNow * 1000), "");

  //bob claim pDAYL tokens again and will success
  console.log(`Bob will claim pDAYL tokens successly`);
  await presale.connect(bob).claimToken();
  const daylBalance = await dayl.balanceOf(bob.address);
  console.log("\tbob pDAYL balance:", utils.formatEther(daylBalance))
}

main();
