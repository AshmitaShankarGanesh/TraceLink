import { Link } from 'react-router-dom'

const fallbackImage =
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80'

function ItemCard({ item }) {
  const primaryImage = item?.images?.[0]?.url || fallbackImage
  const tags = Array.isArray(item?.tags) ? item.tags : []

  return (
    <article className="glass-card overflow-hidden rounded-2xl shadow-lg shadow-gray-200/60">
      <img src={primaryImage} alt={item.title} className="h-44 w-full object-cover" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="line-clamp-1 text-lg font-semibold text-black">{item.title}</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              item.itemType === 'lost'
                ? 'bg-black text-white'
                : 'bg-[#276EF1]/10 text-[#276EF1]'
            }`}
          >
            {item.itemType?.toUpperCase()}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-gray-600">{item.description}</p>

        <div className="flex flex-wrap gap-2">
          {tags.length ? (
            tags.slice(0, 4).map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
              >
                #{tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">No tags</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-600">
            {item.location?.city}
            {item.location?.area ? `, ${item.location.area}` : ''}
          </p>
          <Link
            to={`/items/${item.id || item._id}`}
            className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  )
}

export default ItemCard
