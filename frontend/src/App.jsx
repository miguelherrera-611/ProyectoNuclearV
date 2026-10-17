import { useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import TwoFactorPage from './pages/TwoFactorPage'

// Orquesta las 3 pantallas del flujo de login como una máquina de estados
// simple (login → two-factor → dashboard). No hace falta una librería de
// rutas (react-router) para esto: no es un sitio con varias páginas
// independientes, es un único flujo de 3 pasos — estado local de React
// (useState) alcanza y sobra, siguiendo el criterio del proyecto de evitar
// dependencias/herramientas que no hacen falta todavía.
function AppContent() {
  const [step, setStep] = useState('login')
  // Datos que el paso 1 (login) le pasa al paso 2 (2FA): a qué desafío
  // corresponde el código, y el código de desarrollo si no hay Brevo configurado.
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

  if (step === 'two-factor') {
    return (
      <TwoFactorPage
        challengeToken={challenge.challengeToken}
        devCode={challenge.devCode}
        onBack={() => setStep('login')}
        onVerified={() => setStep('dashboard')}
      />
    )
  }

  return <Dashboard onLoggedOut={() => setStep('login')} />
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
