const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers");

let pDAYL, presale, busd;
const rate = ethers.utils.parseUnits("40", 0);
const depositors = require("../migration/depositor.json");

describe("Test Presale DAYL Success Senario", function () {
  before(async () => {
    [owner, alice, bob, treasury, vault] = await ethers.getSigners();
    console.log(
      "users:\n",
      "owner:",
      owner.address,
      "\n",
      "alice",
      alice.address,
      "\n"
    );

    //deploy contracts
    const timeNow = (await ethers.provider.getBlock("latest")).timestamp;
    console.log(
      "Deploying Contracts: [block time now:",
      new Date(timeNow * 1000),
      "]"
    );

    const PresaleDAYL = await ethers.getContractFactory("PresaleDAYL");
    pDAYL = await PresaleDAYL.deploy();
    console.log("\tDAYL token Contract deployed at: ", pDAYL.address);

    const BUSD = await ethers.getContractFactory("TestBUSD");
    busd = await BUSD.deploy();
    console.log("\tBUSD token Contract deployed at: ", busd.address);

    const presaleInfo = {
      _startTime: timeNow,
      _endTime: timeNow + 3600, // 1 hour later
      _claimTime: timeNow + 7200, // 2 hours later (or as needed)
      _presaleDAYL: pDAYL.address,
      _busd: busd.address,
      _rate: rate,
      _softCap: ethers.utils.parseUnits("10000", 18),
      _hardCap: ethers.utils.parseUnits("100000", 18),
      _maxPerWallet: ethers.utils.parseUnits("5000", 18),
      _minPerWallet: ethers.utils.parseUnits("100", 18),
      _treasury: treasury.address,
      _vault: vault.address,
    };

    const Presale = await ethers.getContractFactory("Presale");
    presale = await Presale.deploy(presaleInfo);
    console.log(`\tPresale Contract deployed at:`, presale.address);
  });

  it("Presale DAYL Token: Symbol, Name, Decimals", async () => {
    expect(await pDAYL.symbol()).to.equal("pDAYL");
    expect(await pDAYL.name()).to.equal("Project Daylight");
    expect(await pDAYL.decimals()).to.equal(18);
  });

  // it("Presale DAYL set Presale", async () => {
  //   await pDAYL.setPresale(presale.address)
  //   const addr = await pDAYL.presale()
  //   console.log(`\n\tPresale address in DAYL token: ${addr}`)
  //   expect(addr).to.equal(presale.address)
  // })

  // it("Presale DAYL set Presale by non-owner will be reverted", async () => {
  //   await expect(pDAYL.connect(alice).setPresale(presale.address)).to.revertedWith("Ownable: caller is not the owner")
  // })

  // it("Presale DAYL set Presale to zero will be reverted", async () => {
  //   await expect(pDAYL.setPresale(zeroAddress)).to.revertedWith("Invalid Presale Address")
  // })

  it("Presale DAYL mint tokens", async () => {
    let balt = await pDAYL.totalSupply();
    console.log("\ttotalSupply", ethers.utils.formatEther(balt));

    await pDAYL.mint(alice.address, ethers.utils.parseEther("100"));
    const bal = await pDAYL.balanceOf(alice.address);
    console.log(`\tAlice got ${utils.formatEther(bal)}`);
    
    balt = await pDAYL.totalSupply();
    console.log("\ttotalSupply", ethers.utils.formatEther(balt));
    expect(bal).to.equal(ethers.utils.parseEther("100"));
  });

  // it("Presale DAYL mint tokens by non-owner will be reverted", async () => {
  //   await expect(
  //     pDAYL.connect(alice).mint(alice.address, ethers.utils.parseEther("100"))
  //   ).to.be.revertedWith("Ownable: caller is not the owner");
  // });

  it("Burn Presale tokens", async () => {
    await pDAYL.connect(alice).burn(ethers.utils.parseEther("100"));

    const bal = await pDAYL.balanceOf(alice.address);
    console.log(`\tAlice got ${utils.formatEther(bal)}`);
    expect(bal).to.equal(utils.parseEther("0"));
  });

  //test busd
  it("Mint Test BUSD", async () => {
    await busd.connect(alice).mint(ethers.utils.parseUnits("1000", 18));
    await busd.connect(bob).mint(ethers.utils.parseUnits("1000", 18));

    const balanceOfAlice = await busd.balanceOf(alice.address);
    console.log(
      "\tAlice got",
      ethers.utils.formatEther(balanceOfAlice),
      "BUSD"
    );
  });

  it("Set White List users", async () => {
    await presale.addWhitelists([alice.address]);
    const aliceListed = await presale.whitelisted(alice.address);

    console.log(`\tAlice Listed: ${aliceListed}`);

    expect(aliceListed).to.equal(true);
  });

  it("Deposit will be revert with minimum check msg", async () => {
    await expect(
      presale
        .connect(alice)
        .deposit(rate.mul(ethers.utils.parseUnits("70", 18)))
    ).to.be.revertedWith("Invalid BUSD deposit");
  });

  it("Alice Deposit BUSD", async () => {
    await busd
      .connect(alice)
      .approve(presale.address, ethers.utils.parseUnits("1000", 18));

    await presale
      .connect(alice)
      .deposit(rate.mul(ethers.utils.parseUnits("1000", 18)));

    const aliceInfo = await presale.userInfo(alice.address);
    console.log(
      `\tAlice Deposited:`,
      ethers.utils.formatUnits(aliceInfo.depositAmount, 18)
    );
    console.log(
      `\tAlice Total Reward: ${utils.formatEther(aliceInfo.totalReward)} pDAYL`
    );

    expect(aliceInfo.depositAmount).to.equal(
      ethers.utils.parseUnits("1000", 18)
    );

    expect(aliceInfo.totalReward).to.equal(ethers.utils.parseEther("40000"));

    const timeNow = (await ethers.provider.getBlock("latest")).timestamp;
    console.log("\tblock time now:", new Date(timeNow * 1000), "]");
  });

  it("Move BUSD to valut during presale", async () => {
    const total = await presale.totalBUSD();
    console.log("\tTotal BUSD: ", utils.formatUnits(total, 18));

    const vaultBal = await busd.balanceOf(vault.address);
    console.log("\tVault BUSD: ", utils.formatUnits(vaultBal, 18));

    expect(vaultBal).to.equal(total.div(10));
  });

  it("Deposit Will be reverted - Not listed user", async () => {
    await expect(presale.deposit(rate)).to.revertedWith("Not Whitelisted User");
  });

  it("Deposit Will be reverted - Not enough BUSD or No Approve", async () => {
    await expect(presale.connect(alice).deposit(rate)).to.revertedWith(
      "ERC20: insufficient allowance"
    );
  });

  it("Set White List users more", async () => {
    await presale.addWhitelists([bob.address]);

    let whiteListed = await presale.whitelisted(bob.address);

    expect(whiteListed).to.equal(true);
  });

  it("Bob Deposit 100 BUSD", async () => {
    await busd
      .connect(bob)
      .approve(presale.address, utils.parseUnits("10000", 18));
    console.log("\tbob approved 10000 BUSD");

    await presale.connect(bob).deposit(rate.mul(utils.parseUnits("100", 18)));

    const bobInfo = await presale.userInfo(bob.address);
    console.log(
      `\tBob Deposited: ${utils.formatUnits(bobInfo.depositAmount, 18)}`
    );

    expect(bobInfo.depositAmount).to.equal(utils.parseUnits("100", 18));
    console.log(
      `\tBob Total Reward: ${utils.formatEther(bobInfo.totalReward)}`
    );
    expect(bobInfo.totalReward).to.equal(utils.parseEther("4000"));
  });

  it("Move BUSD during presale", async () => {
    const total = await presale.totalBUSD();
    console.log("\tTotal BUSD: ", utils.formatUnits(total, 18));
    const vaultBal = await busd.balanceOf(vault.address);
    console.log("\tVault BUSD: ", utils.formatUnits(vaultBal, 18));
    expect(vaultBal).to.equal(total.div(10));
  });

  it("Mint Test BUSD", async () => {
    await busd.connect(alice).mint(utils.parseUnits("300000", 18));
    await busd.connect(bob).mint(utils.parseUnits("300000", 18));
  });

  it("Deposit will be revert with maximum check msg", async () => {
    await expect(
      presale.connect(bob).deposit(rate.mul(utils.parseUnits("5001", 18)))
    ).to.revertedWith("Invalid BUSD deposit");
  });

  it("Deposit Until SoftCap reaches", async () => {
    await busd
      .connect(alice)
      .approve(presale.address, utils.parseEther("4000"));

    await presale
      .connect(alice)
      .deposit(rate.mul(utils.parseUnits("4000", 18)));

    const aliceInfo = await presale.userInfo(alice.address);
    console.log(
      `\tAlice Deposited: ${utils.formatUnits(aliceInfo.depositAmount, 18)}`
    );
    console.log(
      `\tAlice Total Reward: ${utils.formatEther(aliceInfo.totalReward)}`
    );

    expect(aliceInfo.depositAmount).to.equal(utils.parseUnits("5000", 18));
    expect(aliceInfo.totalReward).to.equal(utils.parseEther("200000"));
  });

  // it("Withdraw BUSD", async () => {
  //   const total = await presale.totalBUSD()
  //   await presale.moveFunds()
  //   const tVal = await busd.balanceOf(treasury.address)
  //   const vVal = await busd.balanceOf(vault.address)

  //   console.log(`\n\tVault have ${utils.formatUnits(tVal, 18)}`)
  //   console.log(`\n\tTreasury have ${utils.formatUnits(vVal, 18)}`)

  //   expect(tVal).to.equal(total.mul(9).div(10))
  //   expect(vVal).to.equal(total.div(10))
  // })

  it("Bob Deposit More: ", async () => {
    await presale.connect(bob).deposit(rate.mul(utils.parseUnits("4900", 18)));

    const bobInfo = await presale.userInfo(bob.address);
    console.log(
      `\tBob Deposited: ${utils.formatUnits(bobInfo.depositAmount, 18)}`
    );
    expect(bobInfo.depositAmount).to.equal(utils.parseUnits("5000", 18));

    console.log(
      `\tBob Total Reward: ${utils.formatEther(bobInfo.totalReward)}`
    );
    expect(bobInfo.totalReward).to.equal(utils.parseEther("200000"));
  });

  it("Revert Claim since presale not ended", async () => {
    await expect(presale.connect(bob).claimToken()).to.revertedWith(
      "Unable to claim any tokens"
    );
  });

  it("Spent time to the end", async () => {
    await network.provider.send("evm_increaseTime", [8000]);
    await network.provider.send("evm_mine");

    const timeNow = (await ethers.provider.getBlock("latest")).timestamp;
    console.log("\tblock time now:", new Date(timeNow * 1000), "");
  });

  it("Withdraw BUSD will be failed because totalBUSD >= softCap", async () => {
    await expect(presale.connect(alice).withdraw()).to.revertedWith(
      "Unable to withdraw"
    );
  });

  it("Bob Claim Token", async () => {
    let bobClaimable = await presale.claimableAmount(bob.address);
    console.log(`\tBob can claim ${utils.formatEther(bobClaimable)}`);

    expect(bobClaimable).to.equal(utils.parseEther("200000"));

    oldBal = await pDAYL.balanceOf(bob.address);
    await presale.connect(bob).claimToken();
    newBal = await pDAYL.balanceOf(bob.address);

    console.log(
      `\tBob Withdrawn Amount: ${utils.formatEther(newBal.sub(oldBal))} DAYL`
    );

    expect(bobClaimable).to.equal(newBal.sub(oldBal));

    bobClaimable = await presale.claimableAmount(bob.address);
    console.log(`\tbob can claim ${utils.formatEther(bobClaimable)}`);
    expect(bobClaimable).to.equal(0);
  });

  it("Revert Claim since no claimable amount", async () => {
    await expect(presale.connect(bob).claimToken()).to.revertedWith(
      "Unable to claim any tokens"
    );
  });

  it("Set Vault Ratio will be reverted", async () => {
    await expect(presale.connect(alice).setVaultRatio(10)).to.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(presale.setVaultRatio(101)).to.revertedWith(
      "Invalid Ratio Value"
    );
  });

  it("Set Vault Ratio", async () => {
    await presale.setVaultRatio(10);
    const ratio = await presale.vaultRatio();
    console.log(`\n\tVault Ratio is ${Number(ratio)}`);
  });

  it("Check Total BUSD", async () => {
    const total = await presale.totalBUSD();
    console.log(`\n\tTotal BUSD deposit: ${utils.formatUnits(total, 18)}`);
    expect(total).to.equal(utils.parseUnits("10000", 18));
  });

  // it("Withdraw BUSD", async () => {
  //   const total = await presale.totalBUSD()
  //   await presale.moveFunds()
  //   const tVal = await busd.balanceOf(treasury.address)
  //   const vVal = await busd.balanceOf(vault.address)

  //   console.log(`\n\tVault have ${utils.formatUnits(tVal, 18)}`)
  //   console.log(`\n\tTreasury have ${utils.formatUnits(vVal, 18)}`)

  //   expect(tVal).to.equal(total.mul(9).div(10))
  //   expect(vVal).to.equal(total.div(10))
  // })

  it("Test Migrate", async () => {
    const accounts = depositors.map((d) => d.address);
    const deposits = depositors.map((d) =>
      utils.parseUnits(d.amount.toString(), 12)
    );
    await presale.migrateUserDetail(accounts, deposits);
    console.log("\tPresale set migration: ");
    const totalBUSD = await presale.totalBUSD();
    const totalPresale = await presale.totalPresale();
    console.log(
      "Total BUSD: ",
      utils.formatUnits(totalBUSD, 18),
      "Total DAYL: ",
      utils.formatEther(totalPresale)
    );
  });
});
