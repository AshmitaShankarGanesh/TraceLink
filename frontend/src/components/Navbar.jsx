import { Link, useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'

function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('tracelink_token')

  const onLogout = () => {
    localStorage.removeItem('tracelink_token')
    localStorage.removeItem('tracelink_user')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="text-xl font-semibold tracking-tight text-black">
          Trace<span className="text-[#276EF1]">Link</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {token ? (
            <>
              <NotificationBell />
              <Link
                to="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Dashboard
              </Link>
              <Link
                to="/report"
                className="rounded-lg bg-[#276EF1] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
              >
                Report Item
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
