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

  //bob deposits 3000BUSD
  console.log("Bob deposits 3000BUSD");
  await busd.connect(bob).approve(presale.address, utils.parseEther("3000"));
  await presale.connect(owner).addWhitelists([bob.address]); // warn: must be added by owner.
  await presale.connect(bob).deposit(rate.mul(utils.parseEther("3000")));

  const bobInfo = await presale.userInfo(bob.address);
  console.log(`\tbob deposited:`, utils.formatEther(bobInfo.depositAmount));
  balance = await busd.balanceOf(bob.address);
  console.log("\tbob balance", utils.formatEther(balance));

  //alice deposits 5000BUSD
  console.log("Alice deposits 5000BUSD");
  await busd.connect(alice).approve(presale.address, utils.parseEther("5000"));
  await presale.connect(owner).addWhitelists([alice.address]); // warn: must be added by owner.
  await presale.connect(alice).deposit(rate.mul(utils.parseEther("5000")));

  const aliceInfo = await presale.userInfo(alice.address);
  console.log(`\talice deposited:`, utils.formatEther(aliceInfo.depositAmount));
  balance = await busd.balanceOf(alice.address);
  console.log("\talice balance", utils.formatEther(balance));

  //Spent time to the end
  console.log("Spent time to the end");
  await network.provider.send("evm_increaseTime", [8000]);
  await network.provider.send("evm_mine");
  timeNow = (await ethers.provider.getBlock("latest")).timestamp;
  console.log("\tblock time now:", new Date(timeNow * 1000), "");

  
  //bob claim pDAYL tokens but he will fail since the totally presaled amount is under the softcap
  console.log(
    `Bob is going to claim pDAYL tokens but he will fail since presale fails`
  );
  await expect(presale.connect(bob).claimToken()).to.be.revertedWith(
    "Unable to claim any tokens"
  );

  'Funds move from treasury to presale account'
  console.log('Funds move from treasury to presale account')
  balance = await busd.balanceOf(treasury.address);
  console.log("\ttreasury balance before", utils.formatEther(balance));

  await busd.connect(treasury).fromTreasuryToPresale(presale.address)

  balance = await busd.balanceOf(treasury.address);
  console.log("\ttreasury balance after", utils.formatEther(balance));
  balance = await busd.balanceOf(presale.address);
  console.log("\tpresale balance after", utils.formatEther(balance));

  //bob withdraws BUSD tokens
  console.log(`Bob withdraws BUSD tokens successly since the presale fails`);
  let busdBalance = await busd.balanceOf(bob.address);
  console.log("\tbob BUSD balance before:", utils.formatEther(busdBalance));

  await presale.connect(owner).setWithdrawable();
  await presale.connect(bob).withdraw();

  busdBalance = await busd.balanceOf(bob.address);
  console.log("\tbob BUSD balance after:", utils.formatEther(busdBalance));
}

main();
