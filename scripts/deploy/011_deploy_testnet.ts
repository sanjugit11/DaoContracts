import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONTRACTS, INITIAL_MINT, INITIAL_MINT_PROFIT ,INITIAL_REWARD_RATE} from "../constants";
import { waitFor } from "../txHelper";
import { sign } from "crypto";
import {
    OlympusAuthority__factory,
    Distributor__factory,
    OlympusERC20Token__factory,
    OlympusStaking__factory,
    SOlympus__factory,
    GOHM__factory,
    OlympusTreasury__factory,
    OlympusBondDepositoryV2__factory,
    DAI__factory,
} from "../../types";

// TODO: Shouldn't run setup methods if the contracts weren't redeployed.
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.provider.getSigner(deployer);

    const authorityDeployment = await deployments.get(CONTRACTS.authority);
    const ohmDeployment = await deployments.get(CONTRACTS.ohm);
    const sOhmDeployment = await deployments.get(CONTRACTS.sOhm);
    const gOhmDeployment = await deployments.get(CONTRACTS.gOhm);
    const distributorDeployment = await deployments.get(CONTRACTS.distributor);
    const treasuryDeployment = await deployments.get(CONTRACTS.treasury);
    const stakingDeployment = await deployments.get(CONTRACTS.staking);
    // const lusdAllocatorDeployment = await deployments.get(CONTRACTS.lusdAllocator);
    const OlympusBondDepositoryV2 = await deployments.get(CONTRACTS.bondDepo);
    const DaiDeployment = await deployments.get(CONTRACTS.DAI);

    const authorityContract = await OlympusAuthority__factory.connect(authorityDeployment.address,signer );
    const ohm = OlympusERC20Token__factory.connect(ohmDeployment.address, signer);
    const sOhm = SOlympus__factory.connect(sOhmDeployment.address, signer);
    const gOhm = GOHM__factory.connect(gOhmDeployment.address, signer);
    const distributor = Distributor__factory.connect(distributorDeployment.address, signer);
    const staking = OlympusStaking__factory.connect(stakingDeployment.address, signer);
    const treasury = OlympusTreasury__factory.connect(treasuryDeployment.address, signer);
    // const lusdAllocator = LUSDAllocator__factory.connect(lusdAllocatorDeployment.address, signer);
    const BondDepositoryV2 = OlympusBondDepositoryV2__factory.connect(OlympusBondDepositoryV2.address, signer);
    const Dai = DAI__factory.connect(DaiDeployment.address,signer);


    // Mint Gohm
    const GohmAmount = "1000000000000000000000000000"; //10cr
    await waitFor( gOhm.mint(deployer,GohmAmount));
    const GohmBalance = await gOhm.balanceOf(deployer);
    console.log("GohmBalance minted: ", GohmBalance.toString());

    //Mint Ohm
    const OhmAmount = "990000000000000000" ;    //99cr
    await waitFor( ohm.mint(deployer,OhmAmount));
    const ohmBalance = await ohm.balanceOf(deployer);
    console.log("OHM minted: ", ohmBalance.toString());

    // Step 1: Set treasury as vault on authority
    await waitFor(authorityContract.pushVault(treasury.address, true));
    console.log("Set treasury as vault on authority");
    // // Treasury Actions
    // // Step 2: Set distributor as minter on treasury
    await waitFor(treasury.enable(8, distributor.address, ethers.constants.AddressZero)); // Allows distributor to mint ohm.
    console.log("Set distributor as minter on treasury");

    // // Step 3: Set distributor on staking
    await waitFor(staking.setDistributor(distributor.address)); 
    console.log("Set distributor on staking");
    // Step 4: Initialize sOHM and set the index
    await waitFor(sOhm.setIndex("46000000000")); // 46000000000
    console.log("set the index 46000000000 on SOHM");
    await waitFor(sOhm.setgOHM(gOhm.address));    // 0x38C8A2b54f69b9c7C863865C8FB1bdf0c50A6643
    console.log("Set gohm on SoHM");

    // Step 5: Set up distributor with bounty and recipient
    await waitFor(distributor.setBounty("2000000000"));   //2000000000
    console.log("Set bounty 2000000000 in distributer");

    // await waitFor(distributor.addRecipient(staking.address, INITIAL_REWARD_RATE));//4000
    // console.log("")
    //step:6
    await waitFor(Dai.mint(deployer,"600000000000000000000000000")) //6cr
    console.log("Dai mint 6 cr" );
    //step:7
    await waitFor(treasury.enable(0, deployer, ethers.constants.AddressZero)); // Enable the deployer to deposit reserve depositor
    console.log("Enable the deployer to deposit AS depositor tokens" );

    await waitFor(treasury.enable(2, Dai.address, ethers.constants.AddressZero)); // Enable Dai as a reserve Token
    console.log("Enable Dai as a reserve Token" );
    //step:8
    //initlize the sohm for staking contract & treasury
    await waitFor(sOhm.initialize(staking.address, treasuryDeployment.address)); 
    console.log("Set initialize");


    
}


//     // Deposit and mint ohm
//     await waitFor(mockDai.approve(treasury.address, daiAmount)); // Approve treasury to use the dai
//     await waitFor(treasury.deposit(daiAmount, daiDeployment.address, INITIAL_MINT_PROFIT)); // Deposit Dai into treasury, with a profit set, so that we have reserves for staking
//     const ohmMinted = await ohm.balanceOf(deployer);
//     console.log("Ohm minted: ", ohmMinted.toString());

//     // Fund faucet w/ newly minted dai.
//     await waitFor(ohm.approve(faucetDeployment.address, ohmMinted));
//     await waitFor(ohm.transfer(faucetDeployment.address, ohmMinted));

//     faucetBalance = await ohm.balanceOf(faucetDeployment.address);
//     console.log("Faucet balance:", faucetBalance.toString());
// };

func.tags = ["faucet", "testnet"];
func.dependencies = [CONTRACTS.ohm, CONTRACTS.DAI, CONTRACTS.treasury];
func.runAtTheEnd = true;

export default func;
