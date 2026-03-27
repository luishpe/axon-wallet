// @ts-nocheck
// src/solana/balance.js
// Fetches real SOL and SPL token balances from the Solana blockchain.
// All data comes from Helius — nothing is hardcoded.

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { connection } from './connection'

// ─── Get SOL balance for a wallet address ────────────────────────────────────
export async function getSolBalance(address) {
  try {
    const publicKey = new PublicKey(address)
    const lamports  = await connection.getBalance(publicKey)
    return lamports / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

// ─── Get all SPL token balances for a wallet ──────────────────────────────────
// Returns every token the wallet holds — USDC, BONK, JUP, WIF, everything
export async function getTokenBalances(address) {
  try {
    const publicKey = new PublicKey(address)

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    )

    // Filter out zero balances and extract what we need
    return tokenAccounts.value
      .map(account => ({
        mint:     account.account.data.parsed.info.mint,
        amount:   account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      }))
      .filter(token => token.amount > 0)

  } catch {
    return []
  }
}

// ─── Get full portfolio — SOL + all tokens ────────────────────────────────────
export async function getFullPortfolio(address) {
  const [solBalance, tokens] = await Promise.all([
    getSolBalance(address),
    getTokenBalances(address),
  ])

  return {
    sol:    solBalance,
    tokens,
    total:  tokens.length + 1, // +1 for SOL itself
  }
}

// ─── Get recent transactions for a wallet ─────────────────────────────────────
export async function getRecentTransactions(address, limit = 10) {
  try {
    const publicKey = new PublicKey(address)

    const signatures = await connection.getSignaturesForAddress(publicKey, { limit })

    return signatures.map(sig => ({
      signature: sig.signature,
      slot:      sig.slot,
      timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleDateString() : 'Pending',
      status:    sig.err ? 'Failed' : 'Success',
    }))
  } catch {
    return []
  }
}