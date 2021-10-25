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
} from "elf-sdk";
import { getTermTokenSymbols } from "elf-sdk";
import { TermTokenSymbolsResult } from "elf-sdk/src/helpers/getTermTokenSymbols";
import { DeploymentAddresses } from "../elf-sdk/typechain/DeploymentAddresses";
import { getTimeUntilExpiration } from "elf-sdk";
import { getLatestBlockTimestamp } from "elf-sdk";
import { getTotalSupply } from "elf-sdk";
import { getReserves } from "elf-sdk";
import { getUnitSeconds } from "elf-sdk";
import { calcSpotPricePt } from "elf-sdk";
import { calcFixedAPR } from "elf-sdk";
import { ONE_DAY_IN_SECONDS } from "elf-sdk";

// Maps the keys from mainnet.json manifest to a more human-friendly format
const termMap = {"eurscrv":"crvEURS", "mim-3lp3crv-f": "crvMIM", "alusd3crv-f": "crvALUSD", "wbtc":"wBTC","dai":"DAI", "usdc":"USDC", "stecrv":"crvSTETH", "lusd3crv-f":"crvLUSD", "crvtricrypto":"crvTriCrypto", "crv3crypto": "crv3Crypto"};

async function sendTweet(tweetBody: string) {
  // Initialize Twitter env variables
  const CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY || "";
  const CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET || "";
  const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || "";
  const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || "";

  var Twit = require("twit");
  var T = new Twit({
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
    access_token: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
    strictSSL: true, // optional - requires SSL certificates to be valid.
  });

  T.post(
    "statuses/update",
    { status: tweetBody },
    function (err, data, response) {
      console.log(data);
    }
  );
}

async function generateAPR(terms: string[]): Promise<string> {
  // Initialize main body of tweet with first line
  let body = "Today's @element_fi Fixed Rate Report🌤\n\n";

  const [signer] = await ethers.getSigners();

  // get the official list of Element deployed addresses.
  const deploymentAddresses: DeploymentAddresses = <DeploymentAddresses>(
    await getElementDeploymentAddresses(
      "https://raw.githubusercontent.com/element-fi/elf-deploy/main/addresses/mainnet.json"
    )
  );
  for (const trancheListKey of terms) {
    const trancheList = deploymentAddresses.tranches[trancheListKey];
    const termName = termMap[trancheListKey];
    body += termName + ": ";
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
      const timeRemainingDays = Math.ceil(timeRemainingSeconds / ONE_DAY_IN_SECONDS);

      const base = await getBaseTokenAddress(
        deploymentAddresses,
        trancheListKey
      );

      const totalSupply = await getTotalSupply(ptPool, signer);
      let reserves = await getReserves(ptPool, balancerVaultAddress, signer);
      const ptIndex =
        reserves.tokens[0].toLowerCase() == base.toLowerCase() ? 1 : 0;
      let baseIndex =
        reserves.tokens[0].toLowerCase() == base.toLowerCase() ? 0 : 1;
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
      if (+fixedAPR > 0) {
        // append APR percentage and days remaining to the current line formatted: <APR>% (<days_left>d)
        body += fixedAPR + "% (" + timeRemainingDays + "d), ";
      }
    }
    // After above loop, line has a trailing comma and space
    // remove and add newline after this term type
    body = body.substring(0, body.length - 2) + "\n";
  }
  body += "Asset APR (Days Remaining)\n\nFind more rates available at https://app.element.fi/fixedrates/";
  return body;
}

// Randomly chooses numExtraTerms items from termsRemaining
async function pickExtraTerms(termsRemaining: string[], numExtraTerms: number): Promise<string[]> {
  var returnTerms = [];
  for (let i = 0; i < numExtraTerms; i++) {
    // Use random number to choose an index
    var index = Math.floor(Math.random() * (termsRemaining.length));

    // Add element to return array and delete from remaining
    returnTerms.push(termsRemaining[index]);
    termsRemaining.splice(index, 1);
  }
  return returnTerms;
}

async function main() {
  // These are our most popular terms, so we'll show them in every tweet
  const priorityTerms = ["wbtc", "stecrv", "usdc"];

  // Randomly choose 2 of the remaining terms to also appear in tweet
  const termsRemaining = ["dai", "lusd3crv-f", "crv3crypto", "alusd3crv-f", "mim-3lp3crv-f", "eurscrv"];
  const terms = priorityTerms.concat(await pickExtraTerms(termsRemaining, 2));

  const data: string = await generateAPR(terms);
  console.log(data);
  await sendTweet(data);
}

main();
 ``