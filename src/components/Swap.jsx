// @ts-nocheck
import { Buffer } from 'buffer'
// src/components/Swap.jsx
// Real token swaps powered by Jupiter DEX aggregator.
// Gets live quotes, executes real swaps, collects 0.3% AXON fee.

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import { connection } from '../solana/connection'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'

// ── Popular tokens for quick selection ───────────────────────────────────────
const TOKENS = [
  { symbol: 'SOL',  mint: 'So11111111111111111111111111111111111111112',  decimals: 9,  name: 'Solana' },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6,  name: 'USD Coin' },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6,  name: 'Tether' },
  { symbol: 'JUP',  mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',  decimals: 6,  name: 'Jupiter' },
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5,  name: 'Bonk' },
  { symbol: 'WIF',  mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6,  name: 'dogwifhat' },
]

// AXON fee wallet — replace with your real fee wallet address before mainnet
const FEE_BPS = 30 // 0.3% = 30 basis points

// Jupiter API base URL
const JUP_API = 'https://api.jup.ag'
const JUP_KEY = import.meta.env.VITE_JUPITER_KEY

 // ── Token picker ──────────────────────────────────────────────────────────────
  function TokenPicker({ onSelect, onClose, exclude }) {
    return (
      <div style={styles.pickerOverlay} onClick={onClose}>
        <div style={styles.pickerCard} onClick={e => e.stopPropagation()}>
          <div style={styles.pickerTitle}>Select token</div>
          {TOKENS.filter(t => t.mint !== exclude?.mint).map(token => (
            <button key={token.mint} style={styles.pickerRow} onClick={() => { onSelect(token); onClose() }}>
              <div style={styles.pickerSymbol}>{token.symbol}</div>
              <div style={styles.pickerName}>{token.name}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }
  
export default function Swap({ onBack }) {
  const { keypair, activeWallet, solBalance, refreshBalances } = useWallet()

  const [fromToken, setFromToken] = useState(TOKENS[0]) // SOL
  const [toToken, setToToken]     = useState(TOKENS[1]) // USDC
  const [fromAmount, setFromAmount] = useState('')
  const [quote, setQuote]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [status, setStatus]       = useState('idle') // idle | confirm | swapping | success | error
  const [txSignature, setTxSignature] = useState('')
  const [error, setError]         = useState('')
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker]     = useState(false)

  // ── Get quote from Jupiter ────────────────────────────────────────────────────
  const getQuote = useCallback(async () => {
    if (!fromAmount || isNaN(fromAmount) || Number(fromAmount) <= 0) {
      setQuote(null)
      return
    }
    if (fromToken.mint === toToken.mint) {
      setError('Cannot swap a token for itself.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const inputAmount = Math.floor(Number(fromAmount) * Math.pow(10, fromToken.decimals))

      const params = new URLSearchParams({
        inputMint:   fromToken.mint,
        outputMint:  toToken.mint,
        amount:      inputAmount.toString(),
        slippageBps: '50', // 0.5% slippage
        feeBps:      FEE_BPS.toString(),
      })
console.log('Jupiter key:', JUP_KEY)
      const res = await fetch(`${JUP_API}/swap/v1/quote?${params}`, {
        headers: { 'x-api-key': JUP_KEY}
})
      const data = await res.json()

      if (data.error) {
        setError('No route found for this swap.')
        setQuote(null)
      } else {
        setQuote(data)
      }
    } catch {
      setError('Failed to get quote. Check your connection.')
      setQuote(null)
    }

    setLoading(false)
  }, [fromAmount, fromToken, toToken])

  // Auto-fetch quote when amount changes
  useEffect(() => {
    const timer = setTimeout(getQuote, 600) // debounce 600ms
    return () => clearTimeout(timer)
  }, [fromAmount, fromToken, toToken, getQuote])

  // ── Execute swap ──────────────────────────────────────────────────────────────
  async function executeSwap() {
    if (!quote || !keypair) return
    setStatus('swapping')
    setError('')

    try {
      // Get swap transaction from Jupiter
      const swapRes = await fetch(`${JUP_API}/swap/v1/swap`, {
        headers: { 'x-api-key': JUP_KEY, 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          quoteResponse:         quote,
          userPublicKey:         keypair.publicKey.toString(),
          wrapAndUnwrapSol:      true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      })

      const { swapTransaction } = await swapRes.json()

      // Deserialize the transaction
      const txBuf      = Buffer.from(swapTransaction, 'base64')
      const transaction = VersionedTransaction.deserialize(txBuf)

      // Sign with user's keypair
      transaction.sign([keypair])

      // Send to network
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
      )

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      setTxSignature(signature)
      setStatus('success')

      // Refresh balances
      await refreshBalances(activeWallet.publicAddress)

    } catch (err) {
      setError(err.message || 'Swap failed. Please try again.')
      setStatus('error')
    }
  }

  // ── Flip tokens ───────────────────────────────────────────────────────────────
  function flipTokens() {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount('')
    setQuote(null)
  }

  // ── Format output amount ──────────────────────────────────────────────────────
  function outAmount() {
    if (!quote) return '—'
    const raw = Number(quote.outAmount) / Math.pow(10, toToken.decimals)
    return raw.toFixed(6)
  }

  // ── Price impact color ────────────────────────────────────────────────────────
  function impactColor() {
    if (!quote) return '#6a85a8'
    const impact = Number(quote.priceImpactPct)
    if (impact < 0.5) return '#00f5c4'
    if (impact < 2)   return '#f5c842'
    return '#ff4d6a'
  }
 
  // ── Success screen ────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={{fontSize:'3rem', marginBottom:12}}>✅</div>
          <h2 style={styles.h2}>Swap complete!</h2>
          <p style={styles.sub}>Your swap was confirmed on Solana.</p>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Swapped</div>
            <div style={styles.infoValue}>{fromAmount} {fromToken.symbol} → {outAmount()} {toToken.symbol}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>AXON fee (0.3%)</div>
            <div style={styles.infoValue}>{(Number(fromAmount) * 0.003).toFixed(6)} {fromToken.symbol}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Transaction</div>
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
          <div style={{fontSize:'2rem', marginBottom:12}}>⇄</div>
          <h2 style={styles.h2}>Confirm swap</h2>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>You pay</div>
            <div style={styles.infoValue}>{fromAmount} {fromToken.symbol}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>You receive</div>
            <div style={styles.infoValue}>{outAmount()} {toToken.symbol}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Price impact</div>
            <div style={{...styles.infoValue, color: impactColor()}}>
              {Number(quote?.priceImpactPct || 0).toFixed(3)}%
            </div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>AXON fee</div>
            <div style={styles.infoValue}>0.3%</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Slippage</div>
            <div style={styles.infoValue}>0.5%</div>
          </div>
          {status !== 'swapping' && (
            <>
              <button style={{...styles.btnPrimary, marginTop:16}} onClick={executeSwap}>
                Confirm Swap
              </button>
              <button style={{...styles.btnGhost, marginTop:10}} onClick={() => setStatus('idle')}>
                ← Cancel
              </button>
            </>
          )}
          {status === 'swapping' && (
            <div style={styles.sendingBox}>
              <div style={{fontSize:'1.5rem', marginBottom:8}}>⏳</div>
              <div style={{color:'#6a85a8'}}>Executing swap on Jupiter...</div>
            </div>
          )}
          {error && <div style={styles.errorBox}>{error}</div>}
        </div>
      </div>
    )
  }

  // ── Main swap form ────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrap}>
      {showFromPicker && <TokenPicker onSelect={setFromToken} onClose={() => setShowFromPicker(false)} exclude={toToken} />}
      {showToPicker   && <TokenPicker onSelect={setToToken}   onClose={() => setShowToPicker(false)}   exclude={fromToken} />}

      <div style={styles.card}>
        <div style={styles.topRow}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <h2 style={styles.h2}>Swap</h2>
          <div style={{width:60}} />
        </div>

        {/* From token */}
        <div style={styles.swapBox}>
          <div style={styles.swapBoxTop}>
            <span style={styles.swapBoxLabel}>You pay</span>
            <span style={styles.swapBoxBal}>
              Balance: {fromToken.symbol === 'SOL' ? solBalance.toFixed(4) : '—'} {fromToken.symbol}
            </span>
          </div>
          <div style={styles.swapBoxRow}>
            <input
              style={styles.swapInput}
              placeholder="0.00"
              type="number"
              value={fromAmount}
              onChange={e => { setFromAmount(e.target.value); setError('') }}
            />
            <button style={styles.tokenBtn} onClick={() => setShowFromPicker(true)}>
              {fromToken.symbol} ▾
            </button>
          </div>
        </div>

        {/* Flip button */}
        <div style={{textAlign:'center', margin:'8px 0'}}>
          <button style={styles.flipBtn} onClick={flipTokens}>⇅</button>
        </div>

        {/* To token */}
        <div style={styles.swapBox}>
          <div style={styles.swapBoxTop}>
            <span style={styles.swapBoxLabel}>You receive</span>
            <span style={{fontSize:'.72rem', color:'#2c3d55'}}>estimated</span>
          </div>
          <div style={styles.swapBoxRow}>
            <div style={styles.swapOutput}>
              {loading ? (
                <span style={{color:'#2c3d55'}}>Getting quote...</span>
              ) : (
                <span style={{color: quote ? '#e8f4ff' : '#2c3d55'}}>
                  {outAmount()}
                </span>
              )}
            </div>
            <button style={styles.tokenBtn} onClick={() => setShowToPicker(true)}>
              {toToken.symbol} ▾
            </button>
          </div>
        </div>

        {/* Quote details */}
        {quote && !loading && (
          <div style={styles.quoteDetails}>
            <div style={styles.quoteRow}>
              <span style={{color:'#6a85a8'}}>Price impact</span>
              <span style={{color: impactColor()}}>
                {Number(quote.priceImpactPct).toFixed(3)}%
              </span>
            </div>
            <div style={styles.quoteRow}>
              <span style={{color:'#6a85a8'}}>AXON fee</span>
              <span style={{color:'#6a85a8'}}>0.3%</span>
            </div>
            <div style={styles.quoteRow}>
              <span style={{color:'#6a85a8'}}>Route</span>
              <span style={{color:'#6a85a8', fontSize:'.72rem'}}>
                {quote.routePlan?.length || 1} hop{quote.routePlan?.length !== 1 ? 's' : ''} via Jupiter
              </span>
            </div>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <button
          style={{
            ...styles.btnPrimary,
            marginTop: 16,
            opacity: (!quote || loading) ? 0.5 : 1,
          }}
          disabled={!quote || loading}
          onClick={() => setStatus('confirm')}
        >
          {loading ? 'Getting best price...' : quote ? 'Review Swap →' : 'Enter amount'}
        </button>

        <div style={styles.poweredBy}>
          ⚡ Powered by Jupiter — best price across all Solana DEXes
        </div>

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
    position: 'relative',
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
  swapBox: {
    background: '#080d18',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 14,
    padding: '14px 16px',
  },
  swapBoxTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  swapBoxLabel: {
    fontSize: '.72rem',
    color: '#6a85a8',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
  },
  swapBoxBal: {
    fontSize: '.72rem',
    color: '#2c3d55',
  },
  swapBoxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  swapInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#e8f4ff',
    fontSize: '1.5rem',
    fontWeight: 700,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  },
  swapOutput: {
    flex: 1,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e8f4ff',
  },
  tokenBtn: {
    background: 'rgba(0,180,216,0.1)',
    border: '1px solid rgba(0,180,216,0.2)',
    borderRadius: 20,
    padding: '6px 14px',
    color: '#00b4d8',
    fontSize: '.85rem',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  flipBtn: {
    background: 'rgba(0,200,255,0.06)',
    border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: '50%',
    width: 36, height: 36,
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#6a85a8',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteDetails: {
    background: 'rgba(0,200,255,0.03)',
    border: '1px solid rgba(0,200,255,0.07)',
    borderRadius: 10,
    padding: '10px 14px',
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  quoteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '.78rem',
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
    transition: '.15s',
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
  poweredBy: {
    textAlign: 'center',
    fontSize: '.72rem',
    color: '#2c3d55',
    marginTop: 14,
  },
  pickerOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    padding: '0 16px 24px',
  },
  pickerCard: {
    background: '#0c1220',
    border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: 20,
    padding: '20px',
    width: '100%',
    maxWidth: 420,
  },
  pickerTitle: {
    fontSize: '.8rem',
    fontWeight: 800,
    color: '#6a85a8',
    textTransform: 'uppercase',
    letterSpacing: '.1em',
    marginBottom: 14,
  },
  pickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 10px',
    background: 'none',
    border: '1px solid rgba(0,200,255,0.06)',
    borderRadius: 10,
    marginBottom: 6,
    cursor: 'pointer',
    width: '100%',
    transition: '.13s',
  },
  pickerSymbol: {
    fontSize: '.95rem',
    fontWeight: 800,
    color: '#e8f4ff',
    minWidth: 50,
  },
  pickerName: {
    fontSize: '.82rem',
    color: '#6a85a8',
  },
}