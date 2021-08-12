# elf-twitter-bot

**⚠️  This is a work in progress!  ⚠️**

## Overview
Uses the [elf-sdk](https://github.com/element-fi/elf-sdk) to pull fixed APR's from Element and periodically tweet them to [@ElementFiBot](https://twitter.com/ElementFiBot).

## Install
```bash
git clone https://github.com/element-fi/elf-twitter-bot.git
npm install

npm install twit

./clone-sdk

 npx hardhat run src/index.ts --network  mainnet
