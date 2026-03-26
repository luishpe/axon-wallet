// @ts-nocheck
// src/components/Onboarding.jsx
// The first screen new users see.
// Creates a real wallet and sets a PIN.

import { useState } from 'react'
import { createNewWallet, restoreWalletFromSeedPhrase, validateSeedPhrase } from '../crypto/wallet'
import { saveNewWallet, savePinHash, unlockWallet } from '../crypto/storage'
import { useWallet } from '../context/WalletContext'

const STEPS = ['welcome', 'choice', 'create', 'backup', 'pin', 'done']

export default function Onboarding() {
  const { unlock, reloadWallets } = useWallet()

  const [step, setStep]           = useState('welcome')
  const [wallet, setWallet]       = useState(null)
  const [pin, setPin]             = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [revealed, setRevealed]   = useState(false)
  const [importPhrase, setImportPhrase] = useState('')
  const [mode, setMode]           = useState('create') // 'create' | 'import'
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // ── Step: Welcome ────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.logo}>AX</div>
          <h1 style={styles.h1}>Welcome to AXON</h1>
          <p style={styles.sub}>The smart multi-chain wallet with built-in auto take-profit and stop-loss.</p>
          <button style={styles.btnPrimary} onClick={() => setStep('choice')}>
            Get Started →
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Choice (create or import) ──────────────────────────────────────────
  if (step === 'choice') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Set up your wallet</h2>
          <p style={styles.sub}>Create a brand new wallet or import an existing one.</p>
          <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:24}}>
            <button style={styles.btnPrimary} onClick={() => {
              setMode('create')
              setStep('create')
            }}>
              + Create New Wallet
            </button>
            <button style={styles.btnSecondary} onClick={() => {
              setMode('import')
              setStep('create')
            }}>
              ↑ Import with Seed Phrase
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step: Create or Import ────────────────────────────────────────────────────
  if (step === 'create') {
    if (mode === 'create') {
      return (
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h2 style={styles.h2}>Creating your wallet</h2>
            <p style={styles.sub}>We'll generate a unique 12-word seed phrase. This is the master key to your wallet.</p>
            <button style={{...styles.btnPrimary, marginTop:24}} disabled={loading} onClick={async () => {
              setLoading(true)
              const w = createNewWallet()
              setWallet(w)
              setLoading(false)
              setStep('backup')
            }}>
              {loading ? 'Generating...' : 'Generate Wallet'}
            </button>
            <button style={{...styles.btnGhost, marginTop:12}} onClick={() => setStep('choice')}>← Back</button>
          </div>
        </div>
      )
    }

    // Import mode
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Import wallet</h2>
          <p style={styles.sub}>Enter your 12 or 24-word seed phrase, separated by spaces.</p>
          <textarea
            style={styles.textarea}
            placeholder="word1 word2 word3 ... word12"
            value={importPhrase}
            onChange={e => { setImportPhrase(e.target.value); setError('') }}
            rows={4}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={{...styles.btnPrimary, marginTop:16}} disabled={loading} onClick={async () => {
            setLoading(true)
            setError('')
            try {
              if (!validateSeedPhrase(importPhrase)) {
                setError('Invalid seed phrase. Check the words and try again.')
                setLoading(false)
                return
              }
              const w = restoreWalletFromSeedPhrase(importPhrase.trim().toLowerCase())
              setWallet(w)
              setStep('pin')
            } catch (e) {
              setError(e.message)
            }
            setLoading(false)
          }}>
            {loading ? 'Importing...' : 'Import Wallet'}
          </button>
          <button style={{...styles.btnGhost, marginTop:12}} onClick={() => setStep('choice')}>← Back</button>
        </div>
      </div>
    )
  }

  // ── Step: Backup seed phrase ──────────────────────────────────────────────────
  if (step === 'backup') {
    const words = wallet?.seedPhrase?.split(' ') || []
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Write down your seed phrase</h2>
          <p style={styles.sub}>These 12 words are the only way to recover your wallet. Write them down on paper. Never screenshot or share them.</p>

          <div style={styles.seedGrid}>
            {words.map((word, i) => (
              <div key={i} style={styles.seedWord}>
                <span style={styles.seedNum}>{i + 1}</span>
                <span style={{filter: revealed ? 'none' : 'blur(6px)', transition:'.2s'}}>
                  {word}
                </span>
              </div>
            ))}
          </div>

          <button style={styles.btnReveal} onClick={() => setRevealed(!revealed)}>
            {revealed ? '🙈 Hide' : '👁 Reveal seed phrase'}
          </button>

          <div style={styles.warnBox}>
            ⚠️ Anyone with these words can access your funds. Store them offline.
          </div>

          <button
            style={{...styles.btnPrimary, marginTop:16}}
            disabled={!revealed}
            onClick={() => setStep('pin')}
          >
            I've written it down → Set PIN
          </button>
          <button style={{...styles.btnGhost, marginTop:12}} onClick={() => setStep('create')}>← Back</button>
        </div>
      </div>
    )
  }

  // ── Step: Set PIN ─────────────────────────────────────────────────────────────
  if (step === 'pin') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Set your PIN</h2>
          <p style={styles.sub}>Choose a 6-digit PIN. This encrypts your private key — you'll need it every time you open AXON.</p>

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit PIN"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setError('') }}
            style={styles.input}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Confirm PIN"
            value={pinConfirm}
            onChange={e => { setPinConfirm(e.target.value.replace(/\D/g,'')); setError('') }}
            style={{...styles.input, marginTop:10}}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={{...styles.btnPrimary, marginTop:16}}
            disabled={loading}
            onClick={async () => {
              if (pin.length < 6) { setError('PIN must be 6 digits.'); return }
              if (pin !== pinConfirm) { setError('PINs do not match.'); return }

              setLoading(true)
              try {
                // Save wallet encrypted with PIN
                const saved = saveNewWallet({
                  name:          'Main Wallet',
                  publicAddress: wallet.publicAddress,
                  secretKey:     wallet.secretKey,
                  accountIndex:  wallet.accountIndex || 0,
                  pin,
                })

                // Save PIN hash
                savePinHash(pin)

                // Unlock immediately — user doesn't need to re-enter PIN
                const keypair = unlockWallet(saved.id, pin)
                unlock(keypair, pin)
                reloadWallets()
                setStep('done')
              } catch (e) {
                setError(e.message)
              }
              setLoading(false)
            }}
          >
            {loading ? 'Setting up...' : 'Create Wallet →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Done ────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={{fontSize:'3rem', marginBottom:16}}>🎉</div>
          <h2 style={styles.h2}>Wallet created!</h2>
          <p style={styles.sub}>Your AXON wallet is ready. Your keys are encrypted and stored securely on this device.</p>
          <div style={styles.addrBox}>
            <div style={{fontSize:'.72rem', color:'#6a85a8', marginBottom:4}}>Your Solana address</div>
            <div style={{fontSize:'.78rem', wordBreak:'break-all', color:'#00f5c4'}}>
              {wallet?.publicAddress}
            </div>
          </div>
          <p style={{fontSize:'.8rem', color:'#6a85a8', marginTop:16}}>
            Redirecting to your wallet...
          </p>
        </div>
      </div>
    )
  }

  return null
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    minHeight: '100vh',
    background: '#05080f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: '#0c1220',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  logo: {
    width: 60, height: 60,
    borderRadius: 16,
    background: 'linear-gradient(135deg,#00b4d8,#0077b6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.3rem', fontWeight: 900, color: '#fff',
    marginBottom: 20,
    boxShadow: '0 4px 24px rgba(0,180,216,0.3)',
  },
  h1: { fontSize: '1.8rem', fontWeight: 900, color: '#e8f4ff', margin: '0 0 10px', letterSpacing: '-.02em' },
  h2: { fontSize: '1.4rem', fontWeight: 800, color: '#e8f4ff', margin: '0 0 10px', letterSpacing: '-.02em' },
  sub: { fontSize: '.88rem', color: '#6a85a8', lineHeight: 1.7, margin: '0 0 4px' },
  btnPrimary: {
    width: '100%', padding: '13px 20px',
    background: '#00b4d8', color: '#fff',
    border: 'none', borderRadius: 12,
    fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
    transition: '.15s', boxShadow: '0 4px 16px rgba(0,180,216,0.3)',
  },
  btnSecondary: {
    width: '100%', padding: '13px 20px',
    background: 'rgba(0,180,216,0.1)', color: '#00b4d8',
    border: '1px solid rgba(0,180,216,0.2)', borderRadius: 12,
    fontSize: '.9rem', fontWeight: 700, cursor: 'pointer',
  },
  btnGhost: {
    background: 'none', border: 'none',
    color: '#6a85a8', cursor: 'pointer',
    fontSize: '.85rem', fontWeight: 600,
  },
  btnReveal: {
    background: 'rgba(0,245,196,0.1)', border: '1px solid rgba(0,245,196,0.2)',
    color: '#00f5c4', borderRadius: 8, padding: '8px 16px',
    cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, marginTop: 14,
  },
  input: {
    width: '100%', padding: '12px 16px',
    background: '#080d18', border: '1px solid rgba(0,200,255,0.15)',
    borderRadius: 10, color: '#e8f4ff',
    fontSize: '1rem', outline: 'none',
    textAlign: 'center', letterSpacing: '.2em',
  },
  textarea: {
    width: '100%', padding: '12px 16px',
    background: '#080d18', border: '1px solid rgba(0,200,255,0.15)',
    borderRadius: 10, color: '#e8f4ff',
    fontSize: '.85rem', outline: 'none', resize: 'vertical',
    fontFamily: 'monospace', marginTop: 16,
  },
  seedGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8, margin: '20px 0', width: '100%',
  },
  seedWord: {
    background: '#080d18', border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 8, padding: '8px 10px',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: '.82rem', color: '#e8f4ff',
  },
  seedNum: { color: '#2c3d55', fontSize: '.7rem', fontWeight: 700, minWidth: 16 },
  warnBox: {
    background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 10, padding: '12px 14px',
    fontSize: '.78rem', color: '#ff4d6a', marginTop: 14, lineHeight: 1.6,
  },
  addrBox: {
    background: '#080d18', border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 10, padding: '14px 16px',
    width: '100%', marginTop: 16,
  },
  error: { color: '#ff4d6a', fontSize: '.82rem', marginTop: 8 },
}