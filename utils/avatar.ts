export const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return '/avatars/avatar-anh-meo-cute-5.jpg'
  if (avatarUrl.startsWith('http')) return avatarUrl
  if (avatarUrl.startsWith('/')) return avatarUrl
  return `/avatars/${avatarUrl}`
}
