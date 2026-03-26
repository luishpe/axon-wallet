// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import { getRecentTransactions } from '../solana/balance'

export default function Activity({ onBack }) {
  const { activeWallet } = useWallet()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    if (!activeWallet?.publicAddress) return
    setLoading(true)
    const txs = await getRecentTransactions(activeWallet.publicAddress, 20)
    setTransactions(txs)
    setLoading(false)
  }, [activeWallet])

  useEffect(() => {
    void fetchTransactions()
  }, [fetchTransactions])

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.topRow}>
          <button style={styles.backBtn} onClick={onBack}>← Back</button>
          <h2 style={styles.h2}>Activity</h2>
          <div style={{width:60}} />
        </div>

        {loading && (
          <div style={styles.empty}>
            <div style={{color:'#6a85a8'}}>Loading transactions...</div>
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div style={styles.empty}>
            <div style={{fontSize:'1.5rem', marginBottom:8}}>📋</div>
            <div style={{color:'#6a85a8', fontSize:'.85rem'}}>No transactions yet</div>
            <div style={{color:'#2c3d55', fontSize:'.72rem', marginTop:4}}>
              Your sends, receives and swaps will appear here
            </div>
          </div>
        )}

        {transactions.map((tx, i) => (
          <div key={i} style={styles.txRow}>
            <div style={{
              ...styles.txIcon,
              color: tx.status === 'Success' ? '#00f5c4' : '#ff4d6a',
              background: tx.status === 'Success' ? 'rgba(0,245,196,0.08)' : 'rgba(255,77,106,0.08)',
            }}>
              {tx.status === 'Success' ? '✓' : '✗'}
            </div>
            <div style={styles.txInfo}>
              <div style={styles.txSig}>
                {tx.signature.slice(0,8)}...{tx.signature.slice(-4)}
              </div>
              <div style={styles.txDate}>{tx.timestamp}</div>
            </div>
            <div style={{
              fontSize: '.78rem', fontWeight: 700,
              color: tx.status === 'Success' ? '#00f5c4' : '#ff4d6a'
            }}>
              {tx.status}
            </div>
          </div>
        ))}

        <button
          style={styles.refreshBtn}
          onClick={fetchTransactions}
          disabled={loading}
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh', background: '#05080f',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '20px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: '#0c1220', border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 20, padding: '24px 22px',
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  topRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  h2: { fontSize: '1.2rem', fontWeight: 800, color: '#e8f4ff', margin: 0 },
  backBtn: {
    background: 'none', border: 'none',
    color: '#6a85a8', cursor: 'pointer',
    fontSize: '.85rem', fontWeight: 600, width: 60,
  },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#6a85a8' },
  txRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px',
    background: 'rgba(0,200,255,0.03)',
    border: '1px solid rgba(0,200,255,0.06)',
    borderRadius: 12,
  },
  txIcon: {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, flexShrink: 0,
  },
  txInfo: { flex: 1 },
  txSig: {
    fontSize: '.82rem', fontWeight: 700,
    color: '#e8f4ff', fontFamily: 'monospace',
  },
  txDate: { fontSize: '.72rem', color: '#6a85a8', marginTop: 2 },
  refreshBtn: {
    background: 'none', border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 8, padding: '8px 20px',
    color: '#6a85a8', fontSize: '.8rem', cursor: 'pointer',
    marginTop: 8, alignSelf: 'center',
  },
}