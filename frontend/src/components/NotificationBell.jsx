import { useEffect, useState } from 'react'
import NotificationDropdown from './NotificationDropdown'
import api from '../api/api'

const POLL_INTERVAL_MS = 10000

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.data.notifications || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleMarkedRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <span className="text-lg" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#276EF1] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <NotificationDropdown
        open={open}
        notifications={notifications}
        loading={loading}
        onMarkedRead={handleMarkedRead}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}

export default NotificationBell

