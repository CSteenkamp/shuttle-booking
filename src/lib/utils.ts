import type { Session } from 'next-auth'

/**
 * Get a user-friendly display name from a session
 * Prioritizes actual names over email addresses
 */
export function getUserDisplayName(session: Session | null): string {
  if (!session?.user) {
    return 'User'
  }

  // Check if user has a name that's not an email address
  if (session.user.name && !session.user.name.includes('@')) {
    return session.user.name
  }

  // Fall back to email username (part before @)
  if (session.user.email) {
    const emailName = session.user.email.split('@')[0]
    return emailName.charAt(0).toUpperCase() + emailName.slice(1)
  }

  return 'User'
}