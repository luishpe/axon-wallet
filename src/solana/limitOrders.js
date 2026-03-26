// @ts-nocheck
// src/solana/limitOrders.js
// Places real on-chain take-profit and stop-loss orders
// using Jupiter's Trigger API.
// Orders execute automatically on-chain — no app needs to be open.

import { Buffer } from 'buffer'
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { connection } from './connection'

const JUP_KEY     = import.meta.env.VITE_JUPITER_KEY
const TRIGGER_API = 'https://api.jup.ag'

// ── Create a limit order (used for both TP and SL) ───────────────────────────
// inputMint:    token you're selling (e.g. SOL mint)
// outputMint:   token you're buying (e.g. USDC mint)
// inputAmount:  amount in lamports/smallest unit
// outputAmount: minimum amount you want to receive (sets the trigger price)
// keypair:      user's Solana keypair for signing
export async function createLimitOrder({
  inputMint,
  outputMint,
  inputAmount,
  outputAmount,
  keypair,
  expiredAt = null, // optional expiry timestamp
}) {
  // Step 1: Create the order transaction from Jupiter
  const res = await fetch(`${TRIGGER_API}/trigger/v1/createOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUP_KEY,
    },
    body: JSON.stringify({
      inputMint,
      outputMint,
      maker:        keypair.publicKey.toString(),
      payer:        keypair.publicKey.toString(),
      params: {
        makingAmount: inputAmount.toString(),
        takingAmount: outputAmount.toString(),
        ...(expiredAt && { expiredAt: expiredAt.toString() }),
      },
      computeUnitPrice: 'auto',
    }),
  })

  const data = await res.json()
  
  if (data.error || !data.transaction) {
    throw new Error(data.error || 'Failed to create limit order.')
  }

  // Step 2: Deserialize and sign the transaction
  const txBuf      = Buffer.from(data.transaction, 'base64')
  const transaction = VersionedTransaction.deserialize(txBuf)
  transaction.sign([keypair])

  // Step 3: Send to network
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: true, maxRetries: 3 }
  )

  // Try to confirm - timeout is ok, order may still have succeeded
try {
  const latestBlockhash = await connection.getLatestBlockhash()
  await connection.confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }, 'confirmed')
} catch {
  // Transaction may still have succeeded — check explorer
  console.log('Confirmation timeout — check explorer:', signature)
}

  return {
    signature,
    orderAccount: data.order, // the on-chain order account address
  }
}

// ── Calculate TP/SL output amounts from percentage ───────────────────────────
// Given an input amount and current price, calculates the output amount
// that corresponds to a +X% (take profit) or -X% (stop loss) trigger
export function calculateOrderAmount({
  inputAmount,   // in token's smallest units
  inputDecimals,
  outputDecimals,
  currentPrice,  // price of input token in output token units
  percentChange, // positive for TP (+10 = 10%), negative for SL (-8 = -8%)
}) {
  const inputInUnits   = inputAmount / Math.pow(10, inputDecimals)
  const currentValue   = inputInUnits * currentPrice
  const targetValue    = currentValue * (1 + percentChange / 100)
  const outputAmount   = Math.floor(targetValue * Math.pow(10, outputDecimals))
  return outputAmount
}

// ── Get all open orders for a wallet ─────────────────────────────────────────
export async function getOpenOrders(walletAddress) {
  try {
    const res = await fetch(
      `${TRIGGER_API}/trigger/v1/getTriggerOrders?user=${walletAddress}&orderStatus=active`,
      { headers: { 'x-api-key': JUP_KEY } }
    )
    const data = await res.json()
    return data.orders || []
  } catch {
    return []
  }
}

// ── Cancel an open order ──────────────────────────────────────────────────────
export async function cancelOrder({ orderAccount, keypair }) {
  const res = await fetch(`${TRIGGER_API}/trigger/v1/cancelOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUP_KEY,
    },
    body: JSON.stringify({
      maker:        keypair.publicKey.toString(),
      order:        orderAccount,
      computeUnitPrice: 'auto',
    }),
  })

  const data = await res.json()
  if (data.error || !data.transaction) {
    throw new Error(data.error || 'Failed to cancel order.')
  }

  const txBuf = Buffer.from(data.transaction, 'base64')
  const transaction = VersionedTransaction.deserialize(txBuf)
  transaction.sign([keypair])

  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false, maxRetries: 3 }
  )

  await connection.confirmTransaction(signature, 'confirmed')
  return signature
}