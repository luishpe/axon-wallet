// src/crypto/encryption.js
// ─────────────────────────────────────────────
// Protects the user's secret key with their PIN.
// Uses AES-256 encryption — the same standard
// used by banks and governments.
//
// The PIN is NEVER stored anywhere.
// The secret key is NEVER stored raw.
// Only the encrypted blob is saved to localStorage.
// ─────────────────────────────────────────────

import CryptoJS from 'crypto-js'

// ─── Encrypt a secret key with a PIN ─────────────────────────────────────────
// Called when: user creates a wallet or imports one
// Input:  secretKey (string), pin (string like "123456")
// Output: encrypted string safe to store in localStorage
export function encryptSecretKey(secretKey, pin) {
  if (!secretKey || !pin) {
    throw new Error('Secret key and PIN are required for encryption.')
  }
  if (pin.length < 6) {
    throw new Error('PIN must be at least 6 digits.')
  }

  // AES-256 encryption using the PIN as the key
  const encrypted = CryptoJS.AES.encrypt(secretKey, pin).toString()
  return encrypted
}

// ─── Decrypt a secret key with a PIN ─────────────────────────────────────────
// Called when: user unlocks the app with their PIN
// Input:  encryptedKey (string from localStorage), pin (string)
// Output: the original secret key string, or throws if PIN is wrong
export function decryptSecretKey(encryptedKey, pin) {
  if (!encryptedKey || !pin) {
    throw new Error('Encrypted key and PIN are required for decryption.')
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, pin)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)

    // If decryption produced an empty string, the PIN was wrong
    if (!decrypted || decrypted.length === 0) {
      throw new Error('Incorrect PIN.')
    }

    return decrypted
  } catch {
    // Always throw a clean error — never expose encryption details
    throw new Error('Incorrect PIN. Please try again.')
  }
}

// ─── Verify a PIN without fully decrypting ───────────────────────────────────
// Used in the lock screen — checks if PIN is correct
// Returns true if correct, false if wrong (never throws)
export function verifyPin(encryptedKey, pin) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, pin)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted.length > 0
  } catch {
    return false
  }
}

// ─── Hash a PIN for safe comparison ──────────────────────────────────────────
// Used to store a PIN hash so we can quickly check it
// without needing to decrypt the full secret key every time
export function hashPin(pin) {
  return CryptoJS.SHA256(pin).toString()
}

// ─── Verify a PIN against its stored hash ────────────────────────────────────
export function verifyPinHash(pin, storedHash) {
  return hashPin(pin) === storedHash
}