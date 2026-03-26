import { WalletProvider, useWallet } from './context/WalletContext'
import Onboarding from './components/Onboarding'
import LockScreen from './components/LockScreen'
import Portfolio from './components/Portfolio'

function AppInner() {
  const { hasWallet, isLoading, isLocked } = useWallet()

  if (isLoading) return (
    <div style={{minHeight:'100vh',background:'#05080f',display:'flex',alignItems:'center',justifyContent:'center',color:'#6a85a8',fontFamily:'sans-serif'}}>
      Loading...
    </div>
  )

  if (!hasWallet) return <Onboarding />
  if (isLocked)   return <LockScreen />
  return <Portfolio />
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  )
}