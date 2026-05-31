import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import Home from './pages/Home'
import Videos from './pages/Videos'
import Settings from './pages/Settings'
import Login from './pages/Login'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#737373',fontSize:'14px'}}>Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rutas publicas */}
      <Route path="/" element={<div>Landing page</div>} />
      <Route path="/login" element={<Login />} />

      {/* Studio — requiere auth */}
      <Route path="/studio" element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route index element={<Home />} />
        <Route path="videos" element={<Videos />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Ruta desconocida -> landing */}
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
