import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AppLayout from './components/AppLayout'
import AuditoriaPage from './pages/AuditoriaPage'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import ObservacionesPage from './pages/ObservacionesPage'
import PapeleraPage from './pages/PapeleraPage'
import ProductosPage from './pages/ProductosPage'
import PronosticoPage from './pages/PronosticoPage'
import TwoFactorPage from './pages/TwoFactorPage'
import UsuariosPage from './pages/UsuariosPage'
import { TemaProvider } from './tema/TemaContext'

// Sin sesión: login + 2FA como flujo de 2 pasos simple, sin rutas propias.
// react-router solo entra una vez autenticado, cuando ya hay varias
// pantallas reales con necesidad de URL propia.
function FlujoDeAcceso() {
  const { completeLoginWithToken } = useAuth()
  const [step, setStep] = useState('login')
  const [challenge, setChallenge] = useState(null)

  if (step === 'login') {
    return (
      <LoginPage
        onSubmitted={({ challengeToken, devCode, token }) => {
          // Interruptor AUTH_TWO_FACTOR_ENABLED=false: el backend ya mandó
          // el token, sin challenge — nos saltamos la pantalla de 2FA.
          if (token) {
            completeLoginWithToken(token)
            return
          }
          setChallenge({ challengeToken, devCode })
          setStep('two-factor')
        }}
      />
    )
  }

  return (
    <TwoFactorPage
      challengeToken={challenge.challengeToken}
      devCode={challenge.devCode}
      onBack={() => setStep('login')}
      onVerified={() => {}}
    />
  )
}

function AppContent() {
  const { token } = useAuth()

  if (!token) {
    return <FlujoDeAcceso />
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/productos/:id/datos" element={<ObservacionesPage />} />
          <Route path="/pronostico" element={<PronosticoPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/papelera" element={<PapeleraPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TemaProvider>
  )
}
