import { auth } from '@/auth'

// For compatibility with existing code, create a wrapper that works like getServerSession
export const getServerSession = async (authOptions?: any) => {
  return await auth()
}

export const authOptions = {} // Kept for compatibility, but not used in v5