import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'
import { useToast } from '../components/ToastProvider'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('All fields are required')
      showToast('All fields are required', 'error')
      return
    }
    if (form.password.trim().length < 6) {
      setError('Password must be at least 6 characters')
      showToast('Password must be at least 6 characters', 'error')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      localStorage.setItem('tracelink_token', data.data.token)
      localStorage.setItem('tracelink_user', JSON.stringify(data.data.user))
      showToast('Account created successfully', 'success')
      navigate('/dashboard')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-md">
      <div className="glass-card rounded-3xl p-8 shadow-xl shadow-gray-200/80">
        <h1 className="text-2xl font-semibold text-black">Create Account</h1>
        <p className="mt-1 text-sm text-gray-600">Join TraceLink in seconds</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            name="name"
            required
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />
          <input
            name="password"
            type="password"
            minLength={6}
            required
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm outline-none ring-[#276EF1] focus:ring-2"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#276EF1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#276EF1]">
            Login
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Register
