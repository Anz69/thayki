import { useState } from 'react'
import useAuthStore from '@/stores/useAuthStore'

const IconUser = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path
      d="M13 13C15.4853 13 17.5 10.9853 17.5 8.5C17.5 6.01472 15.4853 4 13 4C10.5147 4 8.5 6.01472 8.5 8.5C8.5 10.9853 10.5147 13 13 13Z"
      stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M3.5 22C3.5 22 5 16.5 13 16.5C21 16.5 22.5 22 22.5 22"
      stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
)

export default function UserCard() {
  const { user, displayName } = useAuthStore()
  const [imgFailed, setImgFailed]   = useState(false)
  const name     = displayName()
  const username = user?.username ? `@${user.username}` : null
  const showImg  = !!user?.photo_url && !imgFailed

  return (
    <div className="flex items-center gap-3.5 bg-[#F5F5F7] rounded-2xl px-4 py-3.5">
      {showImg ? (
        <img
          src={user.photo_url}
          alt={name}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#EFEEF3] flex items-center justify-center flex-shrink-0">
          <IconUser />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-black text-[15px]/[120%] font-[500] truncate">
          {name || 'Пользователь'}
        </span>
        {username && (
          <span className="text-[#7F7F7F] text-[13px]/[120%] font-medium truncate">
            {username}
          </span>
        )}
      </div>
    </div>
  )
}
