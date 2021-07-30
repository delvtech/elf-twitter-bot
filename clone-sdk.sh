#! /bin/bash

# Clone GitHub repository for the SDK
git clone https://github.com/element-fi/elf-sdk.git
cd elf-sdk

# SDK setup
npm install
npm run load-contracts
npm run generate interfaces
npm run build

# test that it's working
# npx hardhat run examples/poolDetails.ts --network goerli
