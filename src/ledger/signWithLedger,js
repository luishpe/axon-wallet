// @ts-nocheck
// src/ledger/signWithLedger.js
// Signs Solana transactions using the Ledger device.
// The private key never leaves the Ledger chip.
// User must physically press the button on the device to approve.

import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'

// ── Sign a regular transaction with Ledger ────────────────────────────────────
export async function signTransactionWithLedger(solanaApp, transaction, accountIndex = 0) {
  const path = `44'/501'/${accountIndex}'/0'`

  // Serialize the transaction message for Ledger to sign
  let messageBytes
  if (transaction instanceof VersionedTransaction) {
    messageBytes = transaction.message.serialize()
  } else {
    messageBytes = transaction.serializeMessage()
  }

  // THIS is where the user presses the button on the Ledger
  // The function waits here until approved or rejected
  const { signature } = await solanaApp.signTransaction(path, Buffer.from(messageBytes))

  // Attach signature to transaction
  if (transaction instanceof VersionedTransaction) {
    transaction.addSignature(
      new PublicKey(await getAddressFromApp(solanaApp, accountIndex)),
      signature
    )
  } else {
    transaction.addSignature(
      new PublicKey(await getAddressFromApp(solanaApp, accountIndex)),
      signature
    )
  }

  return transaction
}

// ── Helper: get address from Ledger app ───────────────────────────────────────
async function getAddressFromApp(solanaApp, accountIndex = 0) {
  const path = `44'/501'/${accountIndex}'/0'`
  const { address } = await solanaApp.getAddress(path)
  return address
}

// ── Sign a versioned transaction (used by Jupiter swaps) ─────────────────────
export async function signVersionedTransactionWithLedger(solanaApp, transaction, address, accountIndex = 0) {
  const path = `44'/501'/${accountIndex}'/0'`

  const messageBytes = transaction.message.serialize()

  // User presses button on Ledger here
  const { signature } = await solanaApp.signTransaction(path, Buffer.from(messageBytes))

  transaction.addSignature(new PublicKey(address), signature)
  return transaction
}