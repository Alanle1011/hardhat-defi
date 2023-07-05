const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../script/getWeth");
const { CompilationJobCreationErrorReason } = require("hardhat/types");

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();

  // LendingPoolAddressesProvider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPool = await getLendingPool(deployer);
  console.log(`LendingPool address ${lendingPool.address}`);

  //deposit!
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  //approve
  await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  console.log(`Depositing ...`);
  const tx = await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited!");

  //

  //check How much we have borrowed, How much we can borrowed
  let { availableBorrowsETH, totalDebtETH } = await getBorrowedUserData(
    lendingPool,
    deployer
  );
  const daiPrice = await getDaiPrice();
  const amountDaffiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);

  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );

  //Borrow asset
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await getBorrowedUserData(lendingPool, deployer);

  //Repay
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowedUserData(lendingPool, deployer);
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveERC20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("Repaid!");
}

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowWei,
    1,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log(`You've borrowed!`);
}

async function getDaiPrice() {
  const daiETHPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );

  const price = (await daiETHPriceFeed.latestRoundData())[1];
  console.log("the DAI/ETH price is " + price.toString());
  return price;
}

async function getBorrowedUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);

  console.log(`you have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`you have ${totalDebtETH} worth of debt`);
  console.log(`you can borrow ${availableBorrowsETH} ETH`);
  return { availableBorrowsETH, totalDebtETH };
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );
  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

async function approveERC20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
