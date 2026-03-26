// src/crypto/wallet.js
// Uses @scure/bip39 and @scure/bip32 — browser-compatible libraries
// Same cryptographic standard as Phantom and Solflare

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

// ─── Generate a brand new 12-word seed phrase ────────────────────────────────
export function generateSeedPhrase() {
  // 128 bits = 12 words — same as Phantom
  return generateMnemonic(wordlist, 128)
}

// ─── Validate a seed phrase ───────────────────────────────────────────────────
export function validateSeedPhrase(phrase) {
  const cleaned = phrase.trim().toLowerCase().replace(/\s+/g, ' ')
  return validateMnemonic(cleaned, wordlist)
}

// ─── Derive a Solana keypair from a seed phrase ───────────────────────────────
export function keypairFromSeedPhrase(seedPhrase, accountIndex = 0) {
  if (!validateSeedPhrase(seedPhrase)) {
    throw new Error('Invalid seed phrase. Please check the words and try again.')
  }

  // Convert seed phrase to raw bytes
  const seed = mnemonicToSeedSync(seedPhrase.trim().toLowerCase())

  // BIP44 derivation path for Solana — same path Phantom uses
  // m/44'/501'/accountIndex'/0'
  const path = `m/44'/501'/${accountIndex}'/0'`
  const hd = HDKey.fromMasterSeed(seed)
  const derived = hd.derive(path)

  // Create Solana keypair from derived private key
  const keypair = Keypair.fromSeed(derived.privateKey)
  return keypair
}

// ─── Get the public address ───────────────────────────────────────────────────
export function getPublicAddress(keypair) {
  return keypair.publicKey.toString()
}

// ─── Export secret key as string (for encrypted storage) ─────────────────────
export function exportSecretKey(keypair) {
  return bs58.encode(keypair.secretKey)
}

// ─── Restore keypair from secret key string ───────────────────────────────────
export function keypairFromSecretKey(secretKeyString) {
  const bytes = bs58.decode(secretKeyString)
  return Keypair.fromSecretKey(bytes)
}

// ─── Create a complete new wallet ────────────────────────────────────────────
// Called when user clicks "Create New Wallet" in onboarding
export function createNewWallet(accountIndex = 0) {
  const seedPhrase = generateSeedPhrase()
  const keypair = keypairFromSeedPhrase(seedPhrase, accountIndex)

  return {
    seedPhrase,                              // show once — user must write it down
    publicAddress: getPublicAddress(keypair), // safe to display and store
    secretKey: exportSecretKey(keypair),      // encrypt with PIN before storing
    accountIndex,
  }
}

// ─── Restore wallet from seed phrase (Import Wallet flow) ─────────────────────
export function restoreWalletFromSeedPhrase(seedPhrase, accountIndex = 0) {
  const keypair = keypairFromSeedPhrase(seedPhrase, accountIndex)
  return {
    publicAddress: getPublicAddress(keypair),
    secretKey: exportSecretKey(keypair),
    accountIndex,
  }
}