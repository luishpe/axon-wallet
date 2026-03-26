// @ts-nocheck
// src/components/LedgerConnect.jsx
// UI for connecting a Ledger hardware wallet to AXON.
// Shows connection status, address, and balance.

import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { connectLedgerSolana, disconnectLedger, isLedgerSupported } from '../ledger/connectLedger'
import { saveNewWallet } from '../crypto/storage'
import { getSolBalance } from '../solana/balance'

export default function LedgerConnect({ onBack, onConnected }) {
  const { reloadWallets } = useWallet()

  const [status, setStatus]     = useState('idle') // idle | connecting | connected | saving | done | error
  const [ledgerSession, setLedgerSession] = useState(null)
  const [balance, setBalance]   = useState(null)
  const [walletName, setWalletName] = useState('Ledger Wallet')
  const [error, setError]       = useState('')

  const supported = isLedgerSupported()

  // ── Connect to Ledger ───────────────────────────────────────────────────────
  async function connect() {
    setStatus('connecting')
    setError('')

    try {
      const session = await connectLedgerSolana(0)
      setLedgerSession(session)

      // Fetch balance for the Ledger address
      const bal = await getSolBalance(session.address)
      setBalance(bal)

      setStatus('connected')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  // ── Save Ledger wallet to AXON ──────────────────────────────────────────────
  // Ledger wallets don't have a secretKey — the key stays on the device
  // We save the public address and mark it as type 'ledger'
  async function saveToAxon() {
    setStatus('saving')
    try {
      saveNewWallet({
        name:          walletName,
        publicAddress: ledgerSession.address,
        secretKey:     'LEDGER', // placeholder — signing happens on device
        accountIndex:  ledgerSession.accountIndex,
        pin:           'LEDGER', // no PIN needed — device handles security
        type:          'ledger',
      })

      reloadWallets()
      setStatus('done')

      // Pass the session back to parent for signing
      if (onConnected) onConnected(ledgerSession)

    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function disconnect() {
    await disconnectLedger(ledgerSession?.transport)
    setLedgerSession(null)
    setBalance(null)
    setStatus('idle')
  }

  // ── Not supported ───────────────────────────────────────────────────────────
  if (!supported) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.topRow}>
            <button style={styles.backBtn} onClick={onBack}>← Back</button>
            <h2 style={styles.h2}>Connect Ledger</h2>
            <div style={{width:60}} />
          </div>
          <div style={styles.warningBox}>
            <div style={{fontSize:'1.5rem', marginBottom:8}}>⚠️</div>
            <div style={{fontWeight:700, marginBottom:6}}>Browser not supported</div>
            <div style={{fontSize:'.82rem', color:'#6a85a8', lineHeight:1.6}}>
              Ledger requires <b style={{color:'#e8f4ff'}}>Chrome or Edge</b> browser.<br/>
              Firefox and Safari do not support WebHID.<br/><br/>
              Please switch to Chrome and try again.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <h2 style={styles.h2}>Connect Ledger</h2>
          <div style={{width:60}} />
        </div>

        {/* Instructions */}
        <div style={styles.stepsBox}>
          <div style={styles.stepsTitle}>Before connecting:</div>
          <div style={styles.step}><span style={styles.stepNum}>1</span> Plug Ledger into USB</div>
          <div style={styles.step}><span style={styles.stepNum}>2</span> Enter your PIN on the device</div>
          <div style={styles.step}><span style={styles.stepNum}>3</span> Open the <b style={{color:'#e8f4ff'}}>Solana</b> app on the device</div>
          <div style={styles.step}><span style={styles.stepNum}>4</span> Click Connect below</div>
        </div>

        {/* Idle state */}
        {status === 'idle' && (
          <button style={styles.btnPrimary} onClick={connect}>
            🔌 Connect Ledger
          </button>
        )}

        {/* Connecting */}
        {status === 'connecting' && (
          <div style={styles.statusBox}>
            <div style={{fontSize:'1.5rem', marginBottom:8}}>⏳</div>
            <div style={{color:'#6a85a8'}}>Connecting to Ledger...</div>
            <div style={{color:'#2c3d55', fontSize:'.78rem', marginTop:4}}>
              Select your Ledger in the browser popup
            </div>
          </div>
        )}

        {/* Connected */}
        {(status === 'connected' || status === 'saving') && ledgerSession && (
          <>
            <div style={styles.successBadge}>
              🔐 Ledger connected
            </div>

            <div style={styles.infoBox}>
              <div style={styles.infoLabel}>Address</div>
              <div style={{...styles.infoValue, fontSize:'.72rem', wordBreak:'break-all', fontFamily:'monospace', color:'#00f5c4'}}>
                {ledgerSession.address}
              </div>
            </div>

            <div style={styles.infoBox}>
              <div style={styles.infoLabel}>SOL Balance</div>
              <div style={styles.infoValue}>{balance?.toFixed(4) ?? '...'} SOL</div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Wallet name</label>
              <input
                style={styles.input}
                value={walletName}
                onChange={e => setWalletName(e.target.value)}
                placeholder="Ledger Wallet"
              />
            </div>

            <button
              style={{...styles.btnPrimary, marginTop:8}}
              disabled={status === 'saving'}
              onClick={saveToAxon}
            >
              {status === 'saving' ? 'Saving...' : 'Add to AXON →'}
            </button>

            <button style={{...styles.btnGhost, marginTop:10}} onClick={disconnect}>
              Disconnect
            </button>
          </>
        )}

        {/* Done */}
        {status === 'done' && (
          <div style={styles.doneBox}>
            <div style={{fontSize:'2rem', marginBottom:8}}>🎉</div>
            <div style={{fontWeight:800, color:'#00f5c4', marginBottom:6}}>Ledger added!</div>
            <div style={{fontSize:'.82rem', color:'#6a85a8', lineHeight:1.6}}>
              Your Ledger wallet is now in AXON.<br/>
              Keys stay on your Ledger device — always cold.
            </div>
            <button style={{...styles.btnPrimary, marginTop:16}} onClick={onBack}>
              Back to Portfolio
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={styles.errorBox}>{error}</div>
            <button style={{...styles.btnPrimary, marginTop:12}} onClick={() => { setStatus('idle'); setError('') }}>
              Try Again
            </button>
          </>
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
  h2: { fontSize: '1.2rem', fontWeight: 800, color: '#e8f4ff', margin: 0 },
  backBtn: {
    background: 'none', border: 'none',
    color: '#6a85a8', cursor: 'pointer',
    fontSize: '.85rem', fontWeight: 600, width: 60,
  },
  stepsBox: {
    background: '#080d18',
    border: '1px solid rgba(0,200,255,0.08)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: '.72rem', color: '#6a85a8',
    textTransform: 'uppercase', letterSpacing: '.08em',
    fontWeight: 700, marginBottom: 10,
  },
  step: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: '.84rem', color: '#e8f4ff',
    marginBottom: 8, lineHeight: 1.5,
  },
  stepNum: {
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(0,180,216,0.15)',
    color: '#00b4d8', fontSize: '.72rem', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  btnPrimary: {
    width: '100%', padding: '13px 20px',
    background: '#00b4d8', color: '#fff',
    border: 'none', borderRadius: 12,
    fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,180,216,0.3)',
  },
  btnGhost: {
    background: 'none', border: 'none',
    color: '#6a85a8', cursor: 'pointer',
    fontSize: '.85rem', fontWeight: 600, textAlign: 'center',
  },
  statusBox: {
    textAlign: 'center', padding: '24px',
    background: '#080d18', borderRadius: 12,
    border: '1px solid rgba(0,200,255,0.08)',
  },
  successBadge: {
    background: 'rgba(0,245,196,0.08)',
    border: '1px solid rgba(0,245,196,0.2)',
    borderRadius: 8, padding: '8px 14px',
    color: '#00f5c4', fontSize: '.85rem',
    fontWeight: 700, textAlign: 'center',
    marginBottom: 14,
  },
  infoBox: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '10px 14px',
    background: '#080d18',
    border: '1px solid rgba(0,200,255,0.08)',
    borderRadius: 10, marginBottom: 8, gap: 12,
  },
  infoLabel: {
    fontSize: '.75rem', color: '#6a85a8',
    fontWeight: 700, flexShrink: 0,
  },
  infoValue: {
    fontSize: '.88rem', color: '#e8f4ff',
    fontWeight: 700, textAlign: 'right',
  },
  field: { marginBottom: 8 },
  label: {
    fontSize: '.75rem', color: '#6a85a8', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.07em',
    display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '11px 14px',
    background: '#080d18', border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: 10, color: '#e8f4ff',
    fontSize: '.88rem', outline: 'none', fontFamily: 'inherit',
  },
  errorBox: {
    background: 'rgba(255,77,106,0.08)',
    border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 8, padding: '10px 14px',
    fontSize: '.82rem', color: '#ff4d6a', lineHeight: 1.6,
  },
  warningBox: {
    background: 'rgba(245,200,66,0.06)',
    border: '1px solid rgba(245,200,66,0.15)',
    borderRadius: 12, padding: '20px',
    textAlign: 'center', color: '#f5c842',
  },
  doneBox: {
    textAlign: 'center', padding: '10px 0',
  },
}