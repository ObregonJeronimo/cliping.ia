import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import VideoStudio from './pages/Cinematicas/VideoStudio'
import MisCinematicas from './pages/Cinematicas/MisCinematicas'
import TimelineStudio from './pages/Animaciones/TimelineStudio'
import MisAnimaciones from './pages/Animaciones/MisAnimaciones'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Terminos from './pages/Legal/Terminos'
import Privacidad from './pages/Legal/Privacidad'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#737373',fontSize:'14px'}}>Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/studio" element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route index element={<VideoStudio />} />
        <Route path="animaciones" element={<TimelineStudio />} />
        <Route path="mis-animaciones" element={<MisAnimaciones />} />
        <Route path="cinematicas" element={<MisCinematicas />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
