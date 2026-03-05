import { useAuth } from '../context/AuthContext'

export const useCredits = () => {
  const { profile, refreshProfile } = useAuth()

  const hasCredits = () => {
    return profile && profile.credits > 0
  }

  const getCredits = () => {
    return profile?.credits || 0
  }

  const deductCredit = async () => {
    if (!profile) return false

    try {
      // The API will handle the actual deduction on the server side
      // This just triggers a refresh after the API call
      await refreshProfile()
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'deepvortex-credits-updated' }, 'https://deepvortexai.art')
      }
      return true
    } catch (error) {
      console.error('Error deducting credit:', error)
      return false
    }
  }

  return {
    credits: getCredits(),
    hasCredits: hasCredits(),
    deductCredit,
    refreshProfile,
  }
}
