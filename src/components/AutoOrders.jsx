// @ts-nocheck
// src/components/AutoOrders.jsx
// AXON's signature feature — set take-profit and stop-loss
// percentages and place them as real on-chain limit orders.

import { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { createLimitOrder, calculateOrderAmount, getOpenOrders, cancelOrder } from '../solana/limitOrders'

// Token mints
const SOL_MINT  = 'So11111111111111111111111111111111111111112'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export default function AutoOrders({ onBack }) {
  const { keypair, activeWallet, solBalance } = useWallet()

  const [solAmount, setSolAmount]   = useState('')
  const [tpPercent, setTpPercent]   = useState(10)
  const [slPercent, setSlPercent]   = useState(8)
  const [solPrice, setSolPrice]     = useState(null)
  const [enableTP, setEnableTP]     = useState(true)
  const [enableSL, setEnableSL]     = useState(true)
  const [placing, setPlacing]       = useState(false)
  const [status, setStatus]         = useState('idle')
  const [openOrders, setOpenOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [error, setError]           = useState('')
  const [results, setResults]       = useState([])

  // ── Fetch SOL price from CoinGecko ────────────────────────────────────────
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        const data = await res.json()
        setSolPrice(data.solana.usd)
      } catch {
        setSolPrice(145) // fallback price
      }
    }
    fetchPrice()
  }, [])

  // ── Load open orders ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadOrders() {
      if (!activeWallet?.publicAddress) return
      setLoadingOrders(true)
      const orders = await getOpenOrders(activeWallet.publicAddress)
      setOpenOrders(orders)
      setLoadingOrders(false)
    }
    loadOrders()
  }, [activeWallet?.publicAddress, status])

  // ── Calculate trigger prices ───────────────────────────────────────────────
  const tpPrice = solPrice ? (solPrice * (1 + tpPercent / 100)).toFixed(2) : '—'
  const slPrice = solPrice ? (solPrice * (1 - slPercent / 100)).toFixed(2) : '—'

  // ── Place TP/SL orders ────────────────────────────────────────────────────
  async function placeOrders() {
    if (!solAmount || isNaN(solAmount) || Number(solAmount) <= 0) {
      setError('Enter a valid SOL amount.')
      return
    }
    if (Number(solAmount) > solBalance) {
      setError('Insufficient SOL balance.')
      return
    }
    if (!enableTP && !enableSL) {
      setError('Enable at least one order type.')
      return
    }
    if (!keypair) {
      setError('Wallet is locked. Please unlock first.')
      return
    }

    setPlacing(true)
    setError('')
    setResults([])

    const inputLamports = Math.floor(Number(solAmount) * 1e9)
    const placed = []

    try {
      // Place Take Profit order
      if (enableTP && solPrice) {
        const tpOutputAmount = calculateOrderAmount({
          inputAmount:   inputLamports,
          inputDecimals: 9,
          outputDecimals: 6,
          currentPrice:  solPrice,
          percentChange: tpPercent,
        })

        const tpResult = await createLimitOrder({
          inputMint:    SOL_MINT,
          outputMint:   USDC_MINT,
          inputAmount:  inputLamports,
          outputAmount: tpOutputAmount,
          keypair,
        })

        placed.push({
          type: 'Take Profit',
          percent: `+${tpPercent}%`,
          price: `$${tpPrice}`,
          signature: tpResult.signature,
        })
      }

      // Place Stop Loss order
      if (enableSL && solPrice) {
        const slOutputAmount = calculateOrderAmount({
          inputAmount:   inputLamports,
          inputDecimals: 9,
          outputDecimals: 6,
          currentPrice:  solPrice,
          percentChange: -slPercent,
        })

        const slResult = await createLimitOrder({
          inputMint:    SOL_MINT,
          outputMint:   USDC_MINT,
          inputAmount:  inputLamports,
          outputAmount: slOutputAmount,
          keypair,
        })

        placed.push({
          type: 'Stop Loss',
          percent: `-${slPercent}%`,
          price: `$${slPrice}`,
          signature: slResult.signature,
        })
      }

      setResults(placed)
      setSolAmount('')
      setStatus('success')

    } catch (err) {
      setError(err.message || 'Failed to place orders.')
    }

    setPlacing(false)
  }

  // ── Cancel an order ───────────────────────────────────────────────────────
  async function handleCancel(orderAccount) {
    if (!keypair) { setError('Wallet locked.'); return }
    try {
      await cancelOrder({ orderAccount, keypair })
      const orders = await getOpenOrders(activeWallet.publicAddress)
      setOpenOrders(orders)
    } catch (err) {
      setError('Cancel failed: ' + err.message)
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.topRow}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <h2 style={styles.h2}>⚡ Auto Orders</h2>
          <div style={{width:60}} />
        </div>

        <p style={styles.sub}>
          Set take-profit and stop-loss targets. Orders are placed on-chain and execute automatically — no app needed.
        </p>

        {/* Current SOL price */}
        <div style={styles.priceCard}>
          <div style={styles.priceLabel}>SOL current price</div>
          <div style={styles.priceValue}>
            {solPrice ? `$${solPrice.toLocaleString()}` : 'Loading...'}
          </div>
        </div>

        {/* SOL Amount input */}
        <div style={styles.field}>
          <label style={styles.label}>SOL amount to protect</label>
          <div style={{position:'relative'}}>
            <input
              style={styles.input}
              placeholder="0.00"
              type="number"
              value={solAmount}
              onChange={e => { setSolAmount(e.target.value); setError('') }}
            />
            <button
              style={styles.maxBtn}
              onClick={() => setSolAmount((solBalance - 0.01).toFixed(4))}
            >MAX</button>
          </div>
          <div style={styles.balHint}>Available: {solBalance.toFixed(4)} SOL</div>
        </div>

        {/* Take Profit */}
        <div style={styles.orderBox}>
          <div style={styles.orderBoxTop}>
            <div style={styles.orderBoxLeft}>
              <div style={{...styles.orderBadge, background:'rgba(0,245,196,.1)', color:'#00f5c4'}}>
                ◆ Take Profit
              </div>
              <div style={styles.orderPrice}>Sell at ${tpPrice}</div>
            </div>
            <label style={styles.toggle}>
              <input
                type="checkbox"
                checked={enableTP}
                onChange={e => setEnableTP(e.target.checked)}
                style={{display:'none'}}
              />
              <div style={{
                ...styles.toggleTrack,
                background: enableTP ? '#00f5c4' : 'rgba(0,200,255,0.1)',
              }}>
                <div style={{
                  ...styles.toggleThumb,
                  transform: enableTP ? 'translateX(18px)' : 'translateX(0)',
                }} />
              </div>
            </label>
          </div>
          <div style={styles.sliderRow}>
            <span style={{color:'#2c3d55', fontSize:'.78rem'}}>+1%</span>
            <input
              type="range" min="1" max="100" value={tpPercent}
              onChange={e => setTpPercent(Number(e.target.value))}
              style={styles.slider}
              disabled={!enableTP}
            />
            <span style={{color:'#00f5c4', fontSize:'.88rem', fontWeight:800, minWidth:36}}>+{tpPercent}%</span>
          </div>
          <div style={styles.quickBtns}>
            {[5, 10, 20, 50].map(p => (
              <button key={p} style={{
                ...styles.quickBtn,
                background: tpPercent === p ? 'rgba(0,245,196,.15)' : 'transparent',
                color: tpPercent === p ? '#00f5c4' : '#2c3d55',
                border: `1px solid ${tpPercent === p ? 'rgba(0,245,196,.3)' : 'rgba(0,200,255,0.06)'}`,
              }} onClick={() => setTpPercent(p)}>+{p}%</button>
            ))}
          </div>
        </div>

        {/* Stop Loss */}
        <div style={styles.orderBox}>
          <div style={styles.orderBoxTop}>
            <div style={styles.orderBoxLeft}>
              <div style={{...styles.orderBadge, background:'rgba(255,77,106,.1)', color:'#ff4d6a'}}>
                ◆ Stop Loss
              </div>
              <div style={styles.orderPrice}>Sell at ${slPrice}</div>
            </div>
            <label style={styles.toggle}>
              <input
                type="checkbox"
                checked={enableSL}
                onChange={e => setEnableSL(e.target.checked)}
                style={{display:'none'}}
              />
              <div style={{
                ...styles.toggleTrack,
                background: enableSL ? '#ff4d6a' : 'rgba(0,200,255,0.1)',
              }}>
                <div style={{
                  ...styles.toggleThumb,
                  transform: enableSL ? 'translateX(18px)' : 'translateX(0)',
                }} />
              </div>
            </label>
          </div>
          <div style={styles.sliderRow}>
            <span style={{color:'#2c3d55', fontSize:'.78rem'}}>-1%</span>
            <input
              type="range" min="1" max="50" value={slPercent}
              onChange={e => setSlPercent(Number(e.target.value))}
              style={styles.slider}
              disabled={!enableSL}
            />
            <span style={{color:'#ff4d6a', fontSize:'.88rem', fontWeight:800, minWidth:36}}>-{slPercent}%</span>
          </div>
          <div style={styles.quickBtns}>
            {[5, 10, 15, 20].map(p => (
              <button key={p} style={{
                ...styles.quickBtn,
                background: slPercent === p ? 'rgba(255,77,106,.1)' : 'transparent',
                color: slPercent === p ? '#ff4d6a' : '#2c3d55',
                border: `1px solid ${slPercent === p ? 'rgba(255,77,106,.2)' : 'rgba(0,200,255,0.06)'}`,
              }} onClick={() => setSlPercent(p)}>-{p}%</button>
            ))}
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Success results */}
        {status === 'success' && results.length > 0 && (
          <div style={styles.successBox}>
            <div style={{fontWeight:800, color:'#00f5c4', marginBottom:8}}>✓ Orders placed on-chain!</div>
            {results.map((r, i) => (
              <div key={i} style={{fontSize:'.78rem', color:'#6a85a8', marginBottom:4}}>
                {r.type} ({r.percent}) at {r.price} — placed ✓
              </div>
            ))}
            <div style={{fontSize:'.72rem', color:'#2c3d55', marginTop:8}}>
              Orders will execute automatically when price is reached.
            </div>
          </div>
        )}

        <button
          style={{...styles.btnPrimary, marginTop:16, opacity: placing ? 0.6 : 1}}
          disabled={placing}
          onClick={placeOrders}
        >
          {placing ? 'Placing orders...' : `⚡ Place ${[enableTP && 'TP', enableSL && 'SL'].filter(Boolean).join(' + ')} Order${(enableTP && enableSL) ? 's' : ''}`}
        </button>

        {/* Open orders list */}
        {openOrders.length > 0 && (
          <div style={{marginTop:24}}>
            <div style={styles.sectionLabel}>Active Orders</div>
            {openOrders.map((order, i) => (
              <div key={i} style={styles.orderRow}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'.82rem', color:'#e8f4ff', fontWeight:700}}>
                    Limit Order
                  </div>
                  <div style={{fontSize:'.72rem', color:'#6a85a8', fontFamily:'monospace', marginTop:2}}>
                    {order.account?.slice(0,8)}...
                  </div>
                </div>
                <button
                  style={styles.cancelBtn}
                  onClick={() => handleCancel(order.account)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {loadingOrders && (
          <div style={{textAlign:'center', color:'#2c3d55', fontSize:'.8rem', marginTop:16}}>
            Loading orders...
          </div>
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
    marginBottom: 12,
  },
  h2: { fontSize: '1.2rem', fontWeight: 800, color: '#e8f4ff', margin: 0 },
  sub: { fontSize: '.82rem', color: '#6a85a8', lineHeight: 1.65, marginBottom: 16 },
  backBtn: {
    background: 'none', border: 'none',
    color: '#6a85a8', cursor: 'pointer',
    fontSize: '.85rem', fontWeight: 600, width: 60,
  },
  priceCard: {
    background: 'rgba(0,180,216,0.06)',
    border: '1px solid rgba(0,180,216,0.12)',
    borderRadius: 12,
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: { fontSize: '.75rem', color: '#6a85a8', fontWeight: 700 },
  priceValue: { fontSize: '1.1rem', fontWeight: 800, color: '#e8f4ff' },
  field: { marginBottom: 14 },
  label: {
    fontSize: '.75rem', color: '#6a85a8', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.07em',
    display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 14px',
    background: '#080d18', border: '1px solid rgba(0,200,255,0.12)',
    borderRadius: 10, color: '#e8f4ff', fontSize: '.88rem',
    outline: 'none', fontFamily: 'inherit',
  },
  maxBtn: {
    position: 'absolute', right: 10, top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,180,216,0.1)',
    border: '1px solid rgba(0,180,216,0.2)',
    borderRadius: 5, padding: '2px 8px',
    color: '#00b4d8', fontSize: '.7rem', fontWeight: 800, cursor: 'pointer',
  },
  balHint: { fontSize: '.72rem', color: '#2c3d55', marginTop: 4 },
  orderBox: {
    background: '#080d18',
    border: '1px solid rgba(0,200,255,0.08)',
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 10,
  },
  orderBoxTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBoxLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  orderBadge: {
    fontSize: '.72rem', fontWeight: 800,
    padding: '3px 8px', borderRadius: 6,
    display: 'inline-block',
  },
  orderPrice: { fontSize: '.8rem', color: '#6a85a8', fontWeight: 600 },
  toggle: { cursor: 'pointer' },
  toggleTrack: {
    width: 40, height: 22, borderRadius: 11,
    position: 'relative', transition: '.2s',
  },
  toggleThumb: {
    position: 'absolute', top: 3, left: 3,
    width: 16, height: 16, borderRadius: '50%',
    background: '#fff', transition: '.2s',
  },
  sliderRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  slider: { flex: 1, height: 4, cursor: 'pointer' },
  quickBtns: { display: 'flex', gap: 6 },
  quickBtn: {
    flex: 1, padding: '5px 4px',
    borderRadius: 6, cursor: 'pointer',
    fontSize: '.75rem', fontWeight: 700,
    transition: '.13s',
  },
  btnPrimary: {
    width: '100%', padding: '13px 20px',
    background: 'linear-gradient(135deg,#00b4d8,#00f5c4)',
    color: '#05080f', border: 'none', borderRadius: 12,
    fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
  },
  errorBox: {
    background: 'rgba(255,77,106,0.08)',
    border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 8, padding: '8px 12px',
    fontSize: '.8rem', color: '#ff4d6a', marginTop: 8,
  },
  successBox: {
    background: 'rgba(0,245,196,0.06)',
    border: '1px solid rgba(0,245,196,0.15)',
    borderRadius: 10, padding: '14px',
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: '.7rem', color: '#6a85a8', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10,
  },
  orderRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    background: 'rgba(0,200,255,0.03)',
    border: '1px solid rgba(0,200,255,0.06)',
    borderRadius: 10, marginBottom: 6,
  },
  cancelBtn: {
    background: 'rgba(255,77,106,0.08)',
    border: '1px solid rgba(255,77,106,0.15)',
    borderRadius: 7, padding: '5px 12px',
    color: '#ff4d6a', fontSize: '.78rem',
    fontWeight: 700, cursor: 'pointer',
  },
}