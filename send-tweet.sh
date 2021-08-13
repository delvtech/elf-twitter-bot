#! /bin/bash

source twitter.env

npx hardhat run src/index.ts --network mainnet
