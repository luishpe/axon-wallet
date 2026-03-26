// @ts-nocheck
// src/solana/connection.js
// The single connection to the Solana blockchain via Helius.
// Every other file imports from here — one connection shared across the app.

import { Connection, clusterApiUrl } from '@solana/web3.js'

const HELIUS_MAINNET = import.meta.env.VITE_RPC_MAINNET
const HELIUS_DEVNET  = import.meta.env.VITE_RPC_DEVNET

// Change this to 'mainnet' when ready for real money
// Keep it on 'devnet' while testing — devnet uses fake SOL
const NETWORK = 'devnet'

export const isDevnet = NETWORK === 'devnet'

export const connection = new Connection(
  NETWORK === 'mainnet'
    ? HELIUS_MAINNET
    : (HELIUS_DEVNET || clusterApiUrl('devnet')),
  'confirmed'
)

export const networkLabel = NETWORK === 'mainnet' ? 'Mainnet' : 'Devnet'