// @ts-nocheck
// src/crypto/storage.js
// ─────────────────────────────────────────────
// Saves and loads wallets from localStorage.
// Nothing is ever stored unencrypted.
// The PIN never touches storage — only its hash.
// ─────────────────────────────────────────────

import { encryptSecretKey, decryptSecretKey, verifyPin, hashPin, verifyPinHash } from './encryption'
import { keypairFromSecretKey } from './wallet'

const STORAGE_KEY = 'axon_wallets'
const ACTIVE_KEY  = 'axon_active_wallet'
const PIN_KEY     = 'axon_pin_hash'

// ─── Shape of a stored wallet ────────────────────────────────────────────────
// {
//   id:           string  — unique ID
//   name:         string  — "Main Wallet", "Trading" etc
//   publicAddress:string  — safe to store and display
//   encryptedKey: string  — AES-256 encrypted secret key
//   accountIndex: number  — BIP44 account index
//   type:         string  — 'software' | 'ledger'
//   createdAt:    number  — timestamp
// }

// ─── Save the PIN hash (so we can verify PIN quickly) ────────────────────────
export function savePinHash(pin) {
  localStorage.setItem(PIN_KEY, hashPin(pin))
}

// ─── Check if a PIN is correct ───────────────────────────────────────────────
export function checkPin(pin) {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return false
  return verifyPinHash(pin, stored)
}

// ─── Check if user has set up AXON before ────────────────────────────────────
export function hasExistingWallet() {
  const wallets = loadAllWallets()
  return wallets.length > 0
}

// ─── Load all wallets from localStorage ──────────────────────────────────────
export function loadAllWallets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// ─── Save all wallets to localStorage ────────────────────────────────────────
function saveAllWallets(wallets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))
}

// ─── Add a new wallet to storage ─────────────────────────────────────────────
// Called after creating or importing a wallet
export function saveNewWallet({ name, publicAddress, secretKey, accountIndex, pin, type = 'software' }) {
  const wallets = loadAllWallets()

  // Encrypt the secret key with the user's PIN
  const encryptedKey = encryptSecretKey(secretKey, pin)

  const newWallet = {
    id:            crypto.randomUUID(),
    name:          name || `Wallet ${wallets.length + 1}`,
    publicAddress,
    encryptedKey,
    accountIndex:  accountIndex || 0,
    type,
    createdAt:     Date.now(),
  }

  wallets.push(newWallet)
  saveAllWallets(wallets)

  // If this is the first wallet, make it active automatically
  if (wallets.length === 1) {
    setActiveWallet(newWallet.id)
  }

  return newWallet
}

// ─── Get the active wallet ID ─────────────────────────────────────────────────
export function getActiveWalletId() {
  return localStorage.getItem(ACTIVE_KEY)
}

// ─── Set which wallet is active ───────────────────────────────────────────────
export function setActiveWallet(walletId) {
  localStorage.setItem(ACTIVE_KEY, walletId)
}

// ─── Get the active wallet object ─────────────────────────────────────────────
export function getActiveWallet() {
  const id = getActiveWalletId()
  if (!id) return null
  const wallets = loadAllWallets()
  return wallets.find(w => w.id === id) || null
}

// ─── Unlock the active wallet — returns a live Keypair ───────────────────────
// This is called when user enters their PIN on the lock screen
// Returns the actual Keypair object needed to sign transactions
export function unlockWallet(walletId, pin) {
  const wallets = loadAllWallets()
  const wallet = wallets.find(w => w.id === walletId)

  if (!wallet) throw new Error('Wallet not found.')

  // This throws if PIN is wrong
  const secretKey = decryptSecretKey(wallet.encryptedKey, pin)

  // Return the live Keypair — kept in memory only, never re-saved
  return keypairFromSecretKey(secretKey)
}

// ─── Verify PIN without fully unlocking ───────────────────────────────────────
export function verifyWalletPin(walletId, pin) {
  const wallets = loadAllWallets()
  const wallet = wallets.find(w => w.id === walletId)
  if (!wallet) return false
  return verifyPin(wallet.encryptedKey, pin)
}

// ─── Rename a wallet ──────────────────────────────────────────────────────────
export function renameWallet(walletId, newName) {
  const wallets = loadAllWallets()
  const index = wallets.findIndex(w => w.id === walletId)
  if (index === -1) throw new Error('Wallet not found.')
  wallets[index].name = newName
  saveAllWallets(wallets)
}

// ─── Delete a wallet ──────────────────────────────────────────────────────────
export function deleteWallet(walletId) {
  let wallets = loadAllWallets()
  wallets = wallets.filter(w => w.id !== walletId)
  saveAllWallets(wallets)

  // If we deleted the active wallet, switch to the first remaining one
  if (getActiveWalletId() === walletId) {
    if (wallets.length > 0) {
      setActiveWallet(wallets[0].id)
    } else {
      localStorage.removeItem(ACTIVE_KEY)
    }
  }
}

// ─── Clear everything — used for "Reset wallet" ───────────────────────────────
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(ACTIVE_KEY)
  localStorage.removeItem(PIN_KEY)
}