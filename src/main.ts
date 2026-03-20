/**
 * Main Entry Point
 * Wires the list reading, auth, and UI modules together.
 */

import { parseListUrl, resolveHandleToDid, fetchListMembers, type ListData, type ListMember } from './list-reader'
import { showError, clearError, showPreview, setLoading, showAuthSection, showLoggedIn, showAuthError } from './ui'
import * as auth from './auth'
import type { AuthState } from './auth'

// Module-level variables to store fetched data for later use (Phase 4+)
export let fetchedListData: ListData | null = null
export let fetchedMembers: ListMember[] = []
export let currentAuthState: AuthState | null = null

/**
 * Handles the login flow.
 */
async function handleLogin(handle: string): Promise<void> {
  try {
    await auth.login(handle)
    // This redirect normally doesn't return, but catch it just in case
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showAuthError('Could not start login. Check your handle and try again.')
    console.error('Login error:', message)
  }
}

/**
 * Handles the logout flow.
 */
async function handleLogout(): Promise<void> {
  try {
    await auth.logout()
    currentAuthState = null
    // Show login form again
    showAuthSection(handleLogin)
  } catch (error) {
    console.error('Logout error:', error)
  }
}

/**
 * Shows appropriate auth UI based on current auth state.
 */
function showAuthUI(): void {
  if (currentAuthState) {
    showLoggedIn(currentAuthState.handle, handleLogout)
  } else {
    showAuthSection(handleLogin)
  }
}

/**
 * Initializes the main UI flow on DOM load.
 */
async function initializeUI(): Promise<void> {
  const listUrlInput = document.getElementById('list-url') as HTMLInputElement | null
  const fetchBtn = document.getElementById('fetch-btn') as HTMLButtonElement | null

  if (!listUrlInput || !fetchBtn) {
    console.error('Required elements not found in DOM')
    return
  }

  // Step 1: Initialize auth - check for OAuth callback or existing session
  try {
    const authState = await auth.init()
    if (authState) {
      currentAuthState = authState
    }
  } catch (error) {
    // OAuth callback processing failed - show meaningful error to user
    const message = error instanceof Error ? error.message : String(error)
    console.error('Auth initialization error:', message)
    showError('Authentication failed. Please try again.')
    return
  }

  // Show auth UI based on current auth state
  // This is shown if there's list data from a prior fetch or after a fetch
  // For now, just initialize it

  // Add click handler to fetch button
  fetchBtn.addEventListener('click', async () => {
    const url = listUrlInput.value.trim()

    // Clear any previous errors
    clearError()

    // Set loading state
    setLoading(fetchBtn, true)

    try {
      // Parse the URL
      const parsed = parseListUrl(url)
      if (!parsed) {
        showError('Invalid Bluesky list URL. Expected format: https://bsky.app/profile/.../lists/...')
        return
      }

      // Resolve handle to DID if necessary
      let did = parsed.identifier
      if (!parsed.isDid) {
        did = await resolveHandleToDid(parsed.identifier)
      }

      // Construct AT-URI and fetch list members
      const atUri = `at://${did}/app.bsky.graph.list/${parsed.rkey}`
      const listData = await fetchListMembers(atUri)

      // Store for later use
      fetchedListData = listData
      fetchedMembers = listData.members

      // Show preview with sample handles
      const sampleHandles = listData.members.slice(0, 5).map((m) => m.handle)
      showPreview({
        name: listData.list.name,
        description: listData.list.description,
        memberCount: listData.members.length,
        sampleHandles
      })

      // Show auth section below the preview
      // If already logged in, show "Logged in as" with logout
      // If not logged in, show login form
      showAuthUI()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showError(`Could not fetch list. Please check the URL and try again. (${message})`)
    } finally {
      setLoading(fetchBtn, false)
    }
  })
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI)
} else {
  // DOM is already loaded
  initializeUI()
}
