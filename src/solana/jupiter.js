// @ts-nocheck
// src/solana/jupiter.js
// Jupiter DEX integration.
// Gets real swap quotes and executes real swaps.
// AXON collects 0.3% fee on every swap.

import { Buffer } from 'buffer'
import { connection } from './connection'
import { Transaction, VersionedTransaction } from '@solana/web3.js'

// ── AXON fee configuration ────────────────────────────────────────────────────
const AXON_FEE_BPS    = 30  // 30 basis points = 0.3%
const AXON_FEE_WALLET = 'YOUR_FEE_WALLET_ADDRESS_HERE'

const JUPITER_API = 'https://quote-api.jup.ag/v6'

export const TOKENS = {
  SOL:  'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP:  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  WIF:  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
}

export async function getQuote(inputMint, outputMint, amount) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount:         amount.toString(),
    slippageBps:    '50',
    platformFeeBps: AXON_FEE_BPS.toString(),
  })

  const response = await fetch(`${JUPITER_API}/quote?${params}`)
  if (!response.ok) throw new Error('Failed to get quote from Jupiter.')

  const quote = await response.json()
  if (quote.error) throw new Error(quote.error)

  return quote
}

export async function buildSwapTransaction(quote, userPublicKey) {
  const body = {
    quoteResponse:             quote,
    userPublicKey:             userPublicKey.toString(),
    wrapAndUnwrapSol:          true,
    feeAccount:                AXON_FEE_WALLET,
    dynamicComputeUnitLimit:   true,
    prioritizationFeeLamports: 'auto',
  }

  const response = await fetch(`${JUPITER_API}/swap`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!response.ok) throw new Error('Failed to build swap transaction.')
  const { swapTransaction } = await response.json()
  return swapTransaction
}

export async function executeSwap(swapTransactionBase64, keypair) {
  const swapTransactionBuf = Buffer.from(swapTransactionBase64, 'base64')

  let transaction
  try {
    transaction = VersionedTransaction.deserialize(swapTransactionBuf)
    transaction.sign([keypair])
  } catch {
    transaction = Transaction.from(swapTransactionBuf)
    transaction.sign(keypair)
  }

  const rawTransaction = transaction.serialize()
  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight:       false,
    preflightCommitment: 'confirmed',
    maxRetries:          3,
  })

  const latestBlockhash = await connection.getLatestBlockhash()
  await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

  return signature
}

export function formatAmount(amount, decimals) {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(4)
}

export async function searchTokens(query) {
  try {
    const response = await fetch('https://tokens.jup.ag/tokens?tags=verified')
    if (!response.ok) return []
    const tokens = await response.json()
    const q = query.toLowerCase()
    return tokens
      .filter(t =>
        t.symbol?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q)
      )
      .slice(0, 20)
  } catch {
    return []
  }
}