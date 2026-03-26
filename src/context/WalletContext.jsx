// @ts-nocheck
// src/context/WalletContext.jsx
// Global state for the entire AXON app.
// Every component can access the active wallet,
// balances, and loading states from here.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getActiveWallet, loadAllWallets, setActiveWallet, hasExistingWallet } from '../crypto/storage'
import { getSolBalance, getTokenBalances } from '../solana/balance'
import { getMultipleTokenPrices, SOL_MINT } from '../solana/prices'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [wallets, setWallets]           = useState([])
  const [activeWallet, setActive]       = useState(null)
  const [keypair, setKeypair]           = useState(null)  // in memory only
  const [solBalance, setSolBalance]     = useState(0)
  const [tokens, setTokens]             = useState([])
  const [isLocked, setIsLocked]         = useState(true)
  const [isLoading, setIsLoading]       = useState(true)
  const [hasWallet, setHasWallet]       = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [privacyMode, setPrivacyMode]   = useState(false)
  const [prices, setPrices] = useState({}) // { mint: usdPrice }

  // ── Load wallet state on app start ──────────────────────────────────────────
  useEffect(() => {
    const existing = hasExistingWallet()
    setHasWallet(existing)

    if (existing) {
      const all    = loadAllWallets()
      const active = getActiveWallet()
      setWallets(all)
      setActive(active)
      setIsLocked(true)  // always start locked
    }

    setIsLoading(false)
  }, [])

  // ── Fetch real balances from blockchain ──────────────────────────────────────
  const refreshBalances = useCallback(async (address) => {
    if (!address) return
    setBalanceLoading(true)
    try {
      const [sol, tkns] = await Promise.all([
        getSolBalance(address),
        getTokenBalances(address),
      ])
      setSolBalance(sol)
      setTokens(tkns)
      // Fetch prices for SOL + all tokens
    const mints = [SOL_MINT, ...tkns.map(t => t.mint)]
    const tokenPrices = await getMultipleTokenPrices(mints)
   
    setPrices(tokenPrices)
  
    } catch {
      // silently fail — show cached data
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // ── Unlock the app with PIN ──────────────────────────────────────────────────
  const unlock = useCallback((unlockedKeypair) => {
    setKeypair(unlockedKeypair)
    setIsLocked(false)

    // Fetch real balances immediately after unlock
    if (activeWallet?.publicAddress) {
      refreshBalances(activeWallet.publicAddress)
    }
  }, [activeWallet, refreshBalances])

  // ── Lock the app ─────────────────────────────────────────────────────────────
  const lock = useCallback(() => {
    setKeypair(null)  // wipe keypair from memory
    setIsLocked(true)
  }, [])

  // ── Switch active wallet ──────────────────────────────────────────────────────
  const switchWallet = useCallback((walletId) => {
    setActiveWallet(walletId)
    const all    = loadAllWallets()
    const active = all.find(w => w.id === walletId)
    setWallets(all)
    setActive(active)
    setKeypair(null)
    setIsLocked(true)  // lock when switching wallets
  }, [])

  // ── Reload wallets from storage (after adding/deleting) ──────────────────────
  const reloadWallets = useCallback(() => {
    const all    = loadAllWallets()
    const active = getActiveWallet()
    setWallets(all)
    setActive(active)
    setHasWallet(all.length > 0)
  }, [])

  const value = {
    wallets,
    activeWallet,
    keypair,
    solBalance,
    tokens,
    isLocked,
    isLoading,
    hasWallet,
    balanceLoading,
    privacyMode,
    setPrivacyMode,
    unlock,
    lock,
    switchWallet,
    reloadWallets,
    refreshBalances,
    prices,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWallet () {
  return useContext(WalletContext)
}