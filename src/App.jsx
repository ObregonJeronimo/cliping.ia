import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import Urvid1Studio from './pages/Urvid1/Urvid1Studio'
import UrvidCraftStudio from './pages/UrvidCraft/UrvidCraftStudio'
import AnimLab from './pages/AnimLab/AnimLab'
import CineStudio from './pages/Cine/CineStudio'
import CineEngineStudio from './pages/CineEngine/CineEngineStudio'
import KineticStudio from './pages/Kinetic/KineticStudio'
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
        <Route index element={<Urvid1Studio />} />
        <Route path="urvid" element={<Navigate to="/studio" replace />} />
        <Route path="craft" element={<UrvidCraftStudio />} />
        <Route path="kinetic" element={<KineticStudio />} />
        <Route path="anim" element={<AnimLab />} />
        <Route path="cine" element={<CineStudio />} />
        <Route path="cine-motor" element={<CineEngineStudio />} />
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
