// @ts-nocheck
// src/components/Portfolio.jsx
// Main wallet dashboard.
// Shows real SOL balance and all SPL tokens from the blockchain.

import AutoOrders from './AutoOrders'
import Swap from './Swap'
import Send from './Send'
import { useEffect, useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { networkLabel } from '../solana/connection'
import LedgerConnect from './LedgerConnect'
import Activity from './Activity'
import { SOL_MINT } from '../solana/prices'

export default function Portfolio() {
  const {
    activeWallet,
    solBalance,
    tokens,
    balanceLoading,
    refreshBalances,
    lock,
    privacyMode,
    setPrivacyMode,
    wallets,
    switchWallet,
    prices,
  } = useWallet()

  const [tab, setTab] = useState('tokens') // 'tokens' | 'activity'
  const [copied, setCopied] = useState(false)
  const [screen, setScreen] = useState('portfolio') // 'portfolio' | 'send' | 'swap' | 'orders' | 'ledger'
  
  // Fetch balances when component mounts
  useEffect(() => {
    if (activeWallet?.publicAddress, refreshBalances) {
      refreshBalances(activeWallet.publicAddress)
    }
  }, [activeWallet?.publicAddress, refreshBalances])

    if (screen === 'send') return <Send onBack={() => setScreen('portfolio')} />  
    if (screen === 'swap') return <Swap onBack={() => setScreen('portfolio')} />
    if (screen === 'orders') return <AutoOrders onBack={() => setScreen('portfolio')} />  
    if (screen === 'ledger') return <LedgerConnect onBack={() => setScreen('portfolio')} />
    if (screen === 'activity') return <Activity onBack={() => setScreen('portfolio')} />

  function copyAddress() {
    navigator.clipboard.writeText(activeWallet?.publicAddress || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function blur(value) {
  return privacyMode ? '••••' : value
  }

  function usdValue(mint, amount) {
  if (privacyMode) return '••••'
  const price = prices[mint]
  if (!price || !amount) return '—'
  const val = price * amount
  if (val < 0.01) return '<$0.01'
  if (val >= 1000) return `$${(val/1000).toFixed(2)}K`
  return `$${val.toFixed(2)}`
}

  const shortAddress = activeWallet?.publicAddress
    ? `${activeWallet.publicAddress.slice(0,4)}...${activeWallet.publicAddress.slice(-4)}`
    : ''
  return (
    <div style={styles.wrap}>

      {/* ── Top bar ── */}
      <div style={styles.topbar}>
        <div style={styles.topLeft}>
          <div style={styles.logoMark}>AX</div>
          <div>
            <div style={styles.walletName}>{activeWallet?.name || 'My Wallet'}</div>
            <div style={styles.network}>
              <div style={styles.networkDot} />
              {networkLabel}
            </div>
          </div>
        </div>
        <div style={styles.topRight}>
          <button style={styles.iconBtn} onClick={() => setPrivacyMode(!privacyMode)}
            title={privacyMode ? 'Show balances' : 'Hide balances'}>
            {privacyMode ? '🙈' : '👁'}
          </button>
          <button style={styles.iconBtn} onClick={lock} title="Lock wallet">
            🔒
          </button>
        </div>
      </div>

      {/* ── Balance card ── */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceLabel}>Total Balance</div>
        <div style={styles.balanceAmount}>
          {balanceLoading ? (
            <span style={{color:'#2c3d55'}}>Loading...</span>
          ) : (
            <>
              <span style={styles.balanceSol}>{blur(solBalance.toFixed(4))}</span>
              <span style={styles.balanceTicker}> SOL</span>
            </>
          )}
        </div>
        <div style={styles.addressRow}>
          <span style={styles.address}>{shortAddress}</span>
          <button style={styles.copyBtn} onClick={copyAddress}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={() => setScreen('send')}>
            <span style={styles.actionIcon}>↑</span>
            <span>Send</span>
          </button>
          <button style={styles.actionBtn} onClick={() => setScreen('orders')}>
            <span style={styles.actionIcon}>⚡</span>
            <span>Auto</span>
          </button>
          <button style={styles.actionBtn} onClick={() => setScreen('swap')}>
            <span style={styles.actionIcon}>⇄</span>
            <span>Swap</span>
          </button>
          <button style={styles.actionBtn} onClick={() => setScreen('ledger')}>
            <span style={styles.actionIcon}>🔐</span>
            <span>Ledger</span>
          </button>
          
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={styles.tabs}>
        <button
          style={{...styles.tab, ...(tab === 'tokens' ? styles.tabActive : {})}}
          onClick={() => setTab('tokens')}
        >
          Tokens {tokens.length > 0 && `(${tokens.length})`}
        </button>
        <button
          style={{...styles.tab, ...(tab === 'activity' ? styles.tabActive : {})}}
          onClick={() => setTab('activity')}
        >
          Activity
        </button>
      </div>

      {/* ── Token list ── */}
      {tab === 'tokens' && (
        <div style={styles.tokenList}>

          {/* SOL always first */}
          <div style={styles.tokenRow}>
            <div style={styles.tokenIcon}>◎</div>
            <div style={styles.tokenInfo}>
              <div style={styles.tokenName}>Solana</div>
              <div style={styles.tokenMint}>SOL</div>
            </div>
            <div style={styles.tokenBalance}>
              {balanceLoading
                ? <span style={{color:'#2c3d55'}}>...</span>
                : <div>
                    <span>{blur(solBalance.toFixed(4))}</span>
                    <span style={{color:'#6a85a8', fontSize:'.85rem', marginLeft:4}}>
                      {usdValue(SOL_MINT, solBalance)}
                    </span>
                  </div>
              }
            </div>
          </div>

          {/* SPL tokens */}
          {tokens.length === 0 && !balanceLoading && (
            <div style={styles.emptyState}>
              <div style={{fontSize:'1.5rem', marginBottom:8}}>🪙</div>
              <div style={{color:'#6a85a8', fontSize:'.85rem'}}>No tokens yet</div>
              <div style={{color:'#2c3d55', fontSize:'.78rem', marginTop:4}}>
                Tokens will appear here after you receive some
              </div>
            </div>
          )}

          {tokens.map((token, i) => (
            <div key={i} style={styles.tokenRow}>
              <div style={{...styles.tokenIcon, background:'rgba(0,180,216,0.1)', fontSize:'.7rem', color:'#6a85a8'}}>
                {token.mint.slice(0,3)}
              </div>
              <div style={styles.tokenInfo}>
                <div style={styles.tokenName}>{token.mint.slice(0,8)}...</div>
                <div style={styles.tokenMint}>SPL Token</div>
              </div>
              <div style={styles.tokenBalance}>
                {blur(token.amount?.toFixed(token.decimals > 4 ? 4 : token.decimals) || '0')}
                <span style={{color:'#6a85a8', fontSize:'.85rem', marginLeft:4}}>
                  {usdValue(token.mint, token.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Activity tab ── */}
      {tab === 'activity' && (
        <div style={styles.tokenList}>
          <div style={styles.emptyState}>
            <div style={{fontSize:'1.5rem', marginBottom:8}}>📋</div>
            <div style={{color:'#6a85a8', fontSize:'.85rem'}}>No transactions yet</div>
            <div style={{color:'#2c3d55', fontSize:'.78rem', marginTop:4}}>
              Transaction history coming in Session 14
            </div>
          </div>
        </div>
      )}

      {/* ── Wallet switcher (if multiple wallets) ── */}
      {wallets.length > 1 && (
        <div style={styles.walletSwitcher}>
          <div style={{fontSize:'.72rem', color:'#6a85a8', marginBottom:8, textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700}}>
            My Wallets
          </div>
          {wallets.map(w => (
            <button
              key={w.id}
              style={{
                ...styles.walletItem,
                background: w.id === activeWallet?.id ? 'rgba(0,180,216,0.1)' : 'transparent',
                borderColor: w.id === activeWallet?.id ? 'rgba(0,180,216,0.3)' : 'rgba(0,200,255,0.08)',
              }}
              onClick={() => switchWallet(w.id)}
            >
              <span style={{color:'#e8f4ff', fontWeight:700}}>{w.name}</span>
              <span style={{color:'#2c3d55', fontSize:'.72rem'}}>
                {w.publicAddress.slice(0,4)}...{w.publicAddress.slice(-4)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Refresh button ── */}
      <button
        style={styles.refreshBtn}
        onClick={() => refreshBalances(activeWallet?.publicAddress)}
        disabled={balanceLoading}
      >
        {balanceLoading ? 'Refreshing...' : '↻ Refresh balances'}
      </button>

    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    background: '#05080f',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#e8f4ff',
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 0 40px',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0,200,255,0.08)',
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 36, height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg,#00b4d8,#0077b6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '.78rem', fontWeight: 900, color: '#fff',
  },
  walletName: {
    fontSize: '.9rem',
    fontWeight: 800,
    color: '#e8f4ff',
  },
  network: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: '.7rem',
    color: '#6a85a8',
    marginTop: 2,
  },
  networkDot: {
    width: 6, height: 6,
    borderRadius: '50%',
    background: '#00f5c4',
  },
  topRight: {
    display: 'flex',
    gap: 6,
  },
  iconBtn: {
    background: 'rgba(0,200,255,0.06)',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  balanceCard: {
    margin: '20px 16px',
    background: 'linear-gradient(135deg,#0c1220,#080d18)',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 20,
    padding: '28px 24px',
    textAlign: 'center',
  },
  balanceLabel: {
    fontSize: '.75rem',
    color: '#6a85a8',
    textTransform: 'uppercase',
    letterSpacing: '.1em',
    fontWeight: 700,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: '2.2rem',
    fontWeight: 900,
    letterSpacing: '-.02em',
    marginBottom: 12,
  },
  balanceSol: {
    color: '#e8f4ff',
  },
  balanceTicker: {
    color: '#6a85a8',
    fontSize: '1.2rem',
  },
  addressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  address: {
    fontSize: '.8rem',
    color: '#6a85a8',
    fontFamily: 'monospace',
  },
  copyBtn: {
    background: 'rgba(0,180,216,0.1)',
    border: '1px solid rgba(0,180,216,0.2)',
    borderRadius: 6,
    padding: '2px 8px',
    color: '#00b4d8',
    fontSize: '.72rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    padding: '10px 8px',
    background: 'rgba(0,180,216,0.08)',
    border: '1px solid rgba(0,180,216,0.15)',
    borderRadius: 12,
    color: '#00b4d8',
    fontSize: '.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: '1.1rem',
  },
  tabs: {
    display: 'flex',
    margin: '0 16px',
    borderBottom: '1px solid rgba(0,200,255,0.08)',
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    padding: '10px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#6a85a8',
    fontSize: '.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: '.14s',
  },
  tabActive: {
    color: '#00b4d8',
    borderBottom: '2px solid #00b4d8',
  },
  tokenList: {
    margin: '0 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  tokenRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'rgba(0,200,255,0.03)',
    border: '1px solid rgba(0,200,255,0.06)',
    borderRadius: 12,
    marginTop: 6,
  },
  tokenIcon: {
    width: 36, height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#9945ff,#14f195)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', color: '#fff', fontWeight: 700, flexShrink: 0,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: '.88rem',
    fontWeight: 700,
    color: '#e8f4ff',
  },
  tokenMint: {
    fontSize: '.72rem',
    color: '#6a85a8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  tokenBalance: {
    fontSize: '.9rem',
    fontWeight: 700,
    color: '#e8f4ff',
    textAlign: 'right',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6a85a8',
  },
  walletSwitcher: {
    margin: '16px 16px 0',
    background: 'rgba(0,200,255,0.03)',
    border: '1px solid rgba(0,200,255,0.08)',
    borderRadius: 16,
    padding: '14px',
  },
  walletItem: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: 10,
    cursor: 'pointer',
    marginBottom: 6,
    transition: '.13s',
  },
  refreshBtn: {
    display: 'block',
    margin: '20px auto 0',
    background: 'none',
    border: '1px solid rgba(0,200,255,0.1)',
    borderRadius: 8,
    padding: '8px 20px',
    color: '#6a85a8',
    fontSize: '.8rem',
    cursor: 'pointer',
  },
}