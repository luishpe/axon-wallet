// @ts-nocheck
// src/components/Send.jsx
// Sends real SOL to any Solana address.
// Builds, signs, and broadcasts a real transaction.

import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { connection } from '../solana/connection'
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'

export default function Send({ onBack }) {
  const { keypair, activeWallet, solBalance, refreshBalances } = useWallet()

  const [toAddress, setToAddress]   = useState('')
  const [amount, setAmount]         = useState('')
  const [status, setStatus]         = useState('idle') // idle | confirm | sending | success | error
  const [txSignature, setTxSignature] = useState('')
  const [error, setError]           = useState('')

  // ── Validate inputs ───────────────────────────────────────────────────────────
  function validate() {
    if (!toAddress.trim()) { setError('Enter a destination address.'); return false }
    if (!amount || isNaN(amount) || Number(amount) <= 0) { setError('Enter a valid amount.'); return false }
    if (Number(amount) > solBalance) { setError('Insufficient balance.'); return false }

    try {
      new PublicKey(toAddress.trim())
    } catch {
      setError('Invalid Solana address.')
      return false
    }

    return true
  }

  // ── Send transaction ──────────────────────────────────────────────────────────
  async function sendTransaction() {
    setStatus('sending')
    setError('')

    try {
      const toPubkey   = new PublicKey(toAddress.trim())
      const fromPubkey = keypair.publicKey
      const lamports   = Math.floor(Number(amount) * LAMPORTS_PER_SOL)

      // Build the transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      )

      // Get latest blockhash (required for every transaction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer        = fromPubkey

      // Sign and send
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair]
      )

      setTxSignature(signature)
      setStatus('success')

      // Refresh balance after sending
      await refreshBalances(activeWallet.publicAddress)

    } catch (err) {
      setError(err.message || 'Transaction failed. Please try again.')
      setStatus('error')
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={{fontSize:'3rem', marginBottom:12}}>✅</div>
          <h2 style={styles.h2}>Sent!</h2>
          <p style={styles.sub}>Your transaction was confirmed on Solana.</p>

          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Amount sent</div>
            <div style={styles.infoValue}>{amount} SOL</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>To address</div>
            <div style={{...styles.infoValue, fontSize:'.72rem', wordBreak:'break-all', fontFamily:'monospace'}}>{toAddress}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Transaction ID</div>
            <div style={{...styles.infoValue, fontSize:'.68rem', wordBreak:'break-all', fontFamily:'monospace', color:'#00b4d8'}}>
              {txSignature}
            </div>
          </div>

          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            style={styles.explorerLink}
          >
            View on Solana Explorer →
          </a>

          <button style={{...styles.btnPrimary, marginTop:16}} onClick={onBack}>
            Back to Portfolio
          </button>
        </div>
      </div>
    )
  }

  // ── Confirm screen ────────────────────────────────────────────────────────────
  if (status === 'confirm') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={{fontSize:'2rem', marginBottom:12}}>📤</div>
          <h2 style={styles.h2}>Confirm transaction</h2>
          <p style={styles.sub}>Review and confirm before sending.</p>

          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Sending</div>
            <div style={styles.infoValue}>{amount} SOL</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>To</div>
            <div style={{...styles.infoValue, fontSize:'.72rem', wordBreak:'break-all', fontFamily:'monospace'}}>{toAddress}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Network fee</div>
            <div style={styles.infoValue}>~0.000005 SOL</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Remaining balance</div>
            <div style={styles.infoValue}>{(solBalance - Number(amount)).toFixed(4)} SOL</div>
          </div>

          <div style={styles.warnBox}>
            ⚠️ This cannot be undone. Double-check the address.
          </div>

          <button style={{...styles.btnPrimary, marginTop:16}} onClick={sendTransaction}>
            Confirm & Send
          </button>
          <button style={{...styles.btnGhost, marginTop:10}} onClick={() => setStatus('idle')}>
            ← Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Main send form ────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrap}>
      <div style={styles.card}>

        <div style={styles.topRow}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <h2 style={styles.h2}>Send SOL</h2>
          <div style={{width:60}} />
        </div>

        <div style={styles.balancePill}>
          Available: {solBalance.toFixed(4)} SOL
        </div>

        {/* To address */}
        <div style={styles.field}>
          <label style={styles.label}>To address</label>
          <input
            style={styles.input}
            placeholder="Solana wallet address"
            value={toAddress}
            onChange={e => { setToAddress(e.target.value); setError('') }}
          />
        </div>

        {/* Amount */}
        <div style={styles.field}>
          <label style={styles.label}>Amount (SOL)</label>
          <div style={{position:'relative'}}>
            <input
              style={styles.input}
              placeholder="0.00"
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError('') }}
            />
            <button
              style={styles.maxBtn}
              onClick={() => setAmount((solBalance - 0.001).toFixed(4))}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Quick amounts */}
        <div style={styles.quickAmounts}>
          {['0.01', '0.1', '0.5', '1'].map(amt => (
            <button
              key={amt}
              style={styles.quickBtn}
              onClick={() => setAmount(amt)}
            >
              {amt}
            </button>
          ))}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {status === 'sending' ? (
          <div style={styles.sendingBox}>
            <div style={{fontSize:'1.5rem', marginBottom:8}}>⏳</div>
            <div style={{color:'#6a85a8', fontSize:'.88rem'}}>Broadcasting to Solana...</div>
            <div style={{color:'#2c3d55', fontSize:'.78rem', marginTop:4}}>This takes 1–3 seconds</div>
          </div>
        ) : (
          <button
            style={{...styles.btnPrimary, marginTop:20}}
            onClick={() => {
              setError('')
              if (validate()) setStatus('confirm')
            }}
          >
            Review Transaction →
          </button>
        )}

      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    background: '#05080f',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '20px 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: '#0c1220',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 20,
    padding: '24px 22px',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  h2: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#e8f4ff',
    margin: 0,
  },
  sub: {
    fontSize: '.85rem',
    color: '#6a85a8',
    lineHeight: 1.6,
    margin: '0 0 16px',
    textAlign: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6a85a8',
    cursor: 'pointer',
    fontSize: '.85rem',
    fontWeight: 600,
    width: 60,
  },
  balancePill: {
    background: 'rgba(0,180,216,0.08)',
    border: '1px solid rgba(0,180,216,0.15)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: '.78rem',
    color: '#00b4d8',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 20,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: '.75rem',
    color: '#6a85a8',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    display: 'block',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: '#080d18',
    border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: 10,
    color: '#e8f4ff',
    fontSize: '.88rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  maxBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,180,216,0.1)',
    border: '1px solid rgba(0,180,216,0.2)',
    borderRadius: 5,
    padding: '2px 8px',
    color: '#00b4d8',
    fontSize: '.7rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  quickAmounts: {
    display: 'flex',
    gap: 8,
    marginBottom: 4,
  },
  quickBtn: {
    flex: 1,
    padding: '7px 4px',
    background: 'rgba(0,200,255,0.04)',
    border: '1px solid rgba(0,200,255,0.08)',
    borderRadius: 8,
    color: '#6a85a8',
    fontSize: '.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnPrimary: {
    width: '100%',
    padding: '13px 20px',
    background: '#00b4d8',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: '.9rem',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,180,216,0.3)',
  },
  btnGhost: {
    background: 'none',
    border: 'none',
    color: '#6a85a8',
    cursor: 'pointer',
    fontSize: '.85rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  infoBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '10px 14px',
    background: '#080d18',
    border: '1px solid rgba(0,200,255,0.08)',
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  infoLabel: {
    fontSize: '.75rem',
    color: '#6a85a8',
    fontWeight: 700,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: '.88rem',
    color: '#e8f4ff',
    fontWeight: 700,
    textAlign: 'right',
  },
  warnBox: {
    background: 'rgba(255,77,106,0.08)',
    border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: '.78rem',
    color: '#ff4d6a',
    marginTop: 8,
    lineHeight: 1.6,
  },
  errorBox: {
    background: 'rgba(255,77,106,0.08)',
    border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '.8rem',
    color: '#ff4d6a',
    marginTop: 8,
  },
  sendingBox: {
    textAlign: 'center',
    padding: '20px',
    marginTop: 12,
  },
  explorerLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 12,
    color: '#00b4d8',
    fontSize: '.82rem',
    fontWeight: 700,
    textDecoration: 'none',
  },
}