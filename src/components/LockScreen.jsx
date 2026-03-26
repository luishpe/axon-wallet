// @ts-nocheck
// src/components/LockScreen.jsx
// Shows when the app is locked.
// User enters their PIN — if correct, decrypts the key and unlocks.
// Wrong PIN 3 times = 30 second cooldown.

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '../context/WalletContext'
import { unlockWallet } from '../crypto/storage'
import { getActiveWallet } from '../crypto/storage'

const MAX_ATTEMPTS  = 3
const COOLDOWN_SECS = 30

export default function LockScreen() {
  const { unlock } = useWallet()

  const [pin, setPin]               = useState('')
  const [error, setError]           = useState('')
  const [attempts, setAttempts]     = useState(0)
  const [cooldown, setCooldown]     = useState(0)
  const [loading, setLoading]       = useState(false)
  const intervalRef                 = useRef(null)

  // ── Cooldown timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setAttempts(0)
            setError('')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [cooldown])

  // ── Handle PIN digit press ────────────────────────────────────────────────────
  function pressDigit(digit) {
    if (cooldown > 0) return
    if (pin.length >= 6) return
    const newPin = pin + digit
    setPin(newPin)
    setError('')

    // Auto-submit when 6 digits entered
    if (newPin.length === 6) {
      setTimeout(() => submitPin(newPin), 120)
    }
  }

  function pressDelete() {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  // ── Submit PIN ────────────────────────────────────────────────────────────────
  async function submitPin(enteredPin) {
    setLoading(true)
    try {
      const active = getActiveWallet()
      if (!active) throw new Error('No wallet found.')

      // This throws if PIN is wrong
      const keypair = unlockWallet(active.id, enteredPin)

      // Success — unlock the app
      unlock(keypair)
      setPin('')
      setError('')
      setAttempts(0)

    } catch {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setPin('')

      if (newAttempts >= MAX_ATTEMPTS) {
        setCooldown(COOLDOWN_SECS)
        setError(`Too many attempts. Wait ${COOLDOWN_SECS} seconds.`)
      } else {
        setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} remaining.`)
      }
    }
    setLoading(false)
  }

  // ── PIN dots display ──────────────────────────────────────────────────────────
  const dots = Array.from({ length: 6 }, (_, i) => (
    <div key={i} style={{
      ...styles.dot,
      background: i < pin.length ? '#00b4d8' : 'transparent',
      borderColor: i < pin.length ? '#00b4d8' : 'rgba(0,200,255,0.2)',
      transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
    }} />
  ))

  // ── Keypad ────────────────────────────────────────────────────────────────────
  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ]

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>🔐</div>
        <h2 style={styles.h2}>AXON is locked</h2>
        <p style={styles.sub}>Enter your PIN to unlock</p>

        {/* PIN dots */}
        <div style={styles.dotsRow}>
          {dots}
        </div>

        {/* Error or cooldown */}
        {cooldown > 0 ? (
          <div style={styles.cooldownBox}>
            ⏳ Too many attempts — wait {cooldown}s
          </div>
        ) : error ? (
          <div style={styles.errorBox}>{error}</div>
        ) : (
          <div style={{height: 36}} />
        )}

        {/* Keypad */}
        <div style={styles.keypad}>
          {keys.map((row, ri) => (
            <div key={ri} style={styles.keyRow}>
              {row.map((key, ki) => (
                <button
                  key={ki}
                  style={{
                    ...styles.key,
                    opacity: key === '' ? 0 : 1,
                    background: key === '⌫' ? 'rgba(255,77,106,0.08)' : 'rgba(0,180,216,0.06)',
                    color: key === '⌫' ? '#ff4d6a' : '#e8f4ff',
                    cursor: key === '' ? 'default' : 'pointer',
                  }}
                  disabled={cooldown > 0 || loading || key === ''}
                  onClick={() => {
                    if (key === '⌫') pressDelete()
                    else if (key !== '') pressDigit(key)
                  }}
                >
                  {loading && pin.length === 6 && key !== '⌫' ? '' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {loading && (
          <p style={{color:'#6a85a8', fontSize:'.8rem', marginTop:8}}>Unlocking...</p>
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
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: '#0c1220',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 24,
    padding: '40px 32px',
    width: '100%',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    fontSize: '2.5rem',
    marginBottom: 14,
  },
  h2: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#e8f4ff',
    margin: '0 0 6px',
  },
  sub: {
    fontSize: '.84rem',
    color: '#6a85a8',
    margin: '0 0 24px',
  },
  dotsRow: {
    display: 'flex',
    gap: 14,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid',
    transition: 'all .15s ease',
  },
  cooldownBox: {
    background: 'rgba(245,200,66,0.08)',
    border: '1px solid rgba(245,200,66,0.2)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: '.8rem',
    color: '#f5c842',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorBox: {
    background: 'rgba(255,77,106,0.08)',
    border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: '.8rem',
    color: '#ff4d6a',
    marginBottom: 8,
    textAlign: 'center',
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
  },
  keypad: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  keyRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 16,
    border: '1px solid rgba(0,200,255,0.1)',
    fontSize: '1.4rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all .1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}