import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import ObservacionesPage from './pages/ObservacionesPage'
import ProductosPage from './pages/ProductosPage'
import PronosticoPage from './pages/PronosticoPage'
import TwoFactorPage from './pages/TwoFactorPage'

// Mientras no hay sesión, el login + 2FA es un flujo de 2 pasos simple (sin
// rutas propias — son solo 2 pantallas de paso, no páginas independientes).
// Una vez autenticado, recién ahí entra react-router: ya hay varias
// pantallas reales (productos, datos históricos, pronóstico) que necesitan
// su propia URL.
function FlujoDeAcceso() {
  const [step, setStep] = useState('login')
  const [challenge, setChallenge] = useState(null)

  if (step === 'login') {
    return (
      <LoginPage
        onSubmitted={({ challengeToken, devCode }) => {
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
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    // AuthProvider envuelve toda la app para que cualquier pantalla pueda
    // leer/usar la sesión actual con el hook useAuth().
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
