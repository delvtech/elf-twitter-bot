/*
 * Copyright 2021 Element Finance, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ethers } from "hardhat";
import {
  getElementDeploymentAddresses,
  getBaseTokenAddress,
} from "../elf-sdk/src/helpers/getElementAddresses";
import {
  getTermTokenSymbols,
  TermTokenSymbolsResult,
} from "../elf-sdk/src/helpers/getTermTokenSymbols";
import { DeploymentAddresses } from "../elf-sdk/typechain/DeploymentAddresses";
import { getTimeUntilExpiration } from "../elf-sdk/src/helpers/getTimeUntilExpiration";
import { getLatestBlockTimestamp } from "../elf-sdk/src/helpers/getLatestBlockTimestamp";
import { getTotalSupply } from "../elf-sdk/src/helpers/getTotalSupply";
import { getReserves } from "../elf-sdk/src/helpers/getReserves";
import { getUnitSeconds } from "../elf-sdk/src/helpers/getUnitSeconds";
import { calcSpotPricePt } from "../elf-sdk/src/helpers/calcSpotPrice";
import { calcFixedAPR } from "../elf-sdk/src/helpers/calcFixedAPR";

async function main() {

  const [signer] = await ethers.getSigners();

  // get the official list of Element deployed addresses.
  const deploymentAddresses: DeploymentAddresses = <DeploymentAddresses>(
    await getElementDeploymentAddresses(
      "https://raw.githubusercontent.com/element-fi/elf-deploy/main/addresses/goerli.json"
    )
  );

  for (const trancheListKey in deploymentAddresses.tranches) {
    const trancheList = deploymentAddresses.tranches[trancheListKey];
    for (const tranche of trancheList) {
      const ptPool = tranche.ptPool.address;
      const trancheAddress = tranche.address;
      const balancerVaultAddress = deploymentAddresses.balancerVault;

      // get the symbols for the term address
      const termTokenSymbols: TermTokenSymbolsResult =
        await getTermTokenSymbols(trancheAddress, signer);

      const blockTimeStamp = await getLatestBlockTimestamp();
      const timeRemainingSeconds = await getTimeUntilExpiration(
        ptPool,
        signer,
        blockTimeStamp
      );

      const base = await getBaseTokenAddress(
        deploymentAddresses,
        trancheListKey
      );

      const totalSupply = await getTotalSupply(ptPool, signer);
      let reserves = await getReserves(ptPool, balancerVaultAddress, signer);
      const ptIndex = reserves.tokens[0].toLowerCase() == base ? 1 : 0;
      let baseIndex = reserves.tokens[0].toLowerCase() == base ? 0 : 1;
      const ptReserves = reserves.balances[ptIndex];
      let baseReserves = reserves.balances[baseIndex];
      const baseDecimals = reserves.decimals[baseIndex];

      const unitSeconds = await getUnitSeconds(ptPool, signer);
      const ptSpotPrice = calcSpotPricePt(
        baseReserves.toString(),
        ptReserves.toString(),
        totalSupply.toString(),
        timeRemainingSeconds,
        unitSeconds,
        baseDecimals
      );

      const fixedAPR = calcFixedAPR(ptSpotPrice, timeRemainingSeconds).toFixed(
        2
      );

      var row = trancheListKey + "," + fixedAPR
      var fs = require('fs');
      fs.write("values.csv", row, 'a'); 

    }
  }
}

main();
