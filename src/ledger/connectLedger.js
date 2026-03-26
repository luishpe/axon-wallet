// @ts-nocheck
import { Buffer } from 'buffer'
// src/ledger/connectLedger.js
// Connects to a Ledger hardware wallet via WebHID (USB).
// Works in Chrome and Edge only — not Firefox or Safari.
// The private key NEVER leaves the Ledger chip.

import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import Solana from '@ledgerhq/hw-app-solana'
import AppEth from '@ledgerhq/hw-app-eth'
import AppBtc from '@ledgerhq/hw-app-btc'

// ── Check if browser supports WebHID ─────────────────────────────────────────
export function isLedgerSupported() {
  return typeof navigator !== 'undefined' && !!navigator.hid
}

// ── Connect Ledger and get Solana address ─────────────────────────────────────
// Opens the browser USB device picker
// User must have Solana app open on their Ledger device
export async function connectLedgerSolana(accountIndex = 0) {
  if (!isLedgerSupported()) {
    throw new Error(
      'Ledger requires Chrome or Edge browser. ' +
      'Firefox and Safari are not supported.'
    )
  }

  let transport
  try {
    // This opens the browser "Select a HID device" popup
    transport = await TransportWebHID.create()
  } catch (err) {
    if (err.message?.includes('No device selected')) {
      throw new Error('No Ledger selected. Please select your Ledger device.')
    }
    throw new Error('Could not connect to Ledger. Make sure it is plugged in and unlocked.')
  }

  try {
    const solanaApp = new Solana(transport)

    // BIP44 path for Solana — same as Phantom uses
    const path = `44'/501'/${accountIndex}'/0'`

    // Ask Ledger for the public address
    // User may need to confirm on device
    const { address } = await solanaApp.getAddress(path)

    return {
      transport,
      solanaApp,
      address,
      accountIndex,
      type: 'ledger',
    }
  } catch (err) {
    transport?.close()
    if (err.message?.includes('0x6511') || err.message?.includes('6511')) {
      throw new Error('Please open the Solana app on your Ledger device, then try again.')
    }
    throw new Error('Ledger error: ' + (err.message || 'Unknown error'))
  }
}

// ── Connect Ledger and get EVM address (ETH, Base, Polygon etc) ───────────────
export async function connectLedgerEVM(accountIndex = 0) {
  if (!isLedgerSupported()) {
    throw new Error('Ledger requires Chrome or Edge browser.')
  }

  let transport
  try {
    transport = await TransportWebHID.create()
  } catch {
    throw new Error('Could not connect to Ledger. Make sure it is plugged in and unlocked.')
  }

  try {
    const ethApp = new AppEth(transport)
    const path   = `44'/60'/${accountIndex}'/0/0`
    const result = await ethApp.getAddress(path)

    return {
      transport,
      ethApp,
      address:      result.address,
      accountIndex,
      type:         'ledger-evm',
    }
  } catch (err) {
    transport?.close()
    throw new Error('Ledger error: ' + (err.message || 'Unknown error'))
  }
}

// ── Disconnect Ledger ─────────────────────────────────────────────────────────
export async function disconnectLedger(transport) {
  try {
    await transport?.close()
  } catch {
    // ignore close errors
  }
}