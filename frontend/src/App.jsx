import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ToastProvider from './components/ToastProvider'
import Dashboard from './pages/Dashboard'
import ItemDetails from './pages/ItemDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import ReportItem from './pages/ReportItem'

const hasToken = () => Boolean(localStorage.getItem('tracelink_token'))

function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route
              path="/"
              element={<Navigate to={hasToken() ? '/dashboard' : '/login'} replace />}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportItem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/:id"
              element={
                <ProtectedRoute>
                  <ItemDetails />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
