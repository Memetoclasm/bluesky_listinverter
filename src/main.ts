/**
 * Main Entry Point
 * Wires the list reading, auth, and UI modules together.
 */

import { parseListUrl, resolveHandleToDid, fetchListMembers, type ListData, type ListMember } from './list-reader'
import {
  showError,
  clearError,
  showPreview,
  setLoading,
  showAuthSection,
  showLoggedIn,
  showAuthError,
  showCreateForm,
  showProgress,
  showResult,
  showCreateError
} from './ui'
import { createCuratelist } from './list-writer'
import * as auth from './auth'
import type { AuthState } from './auth'

// Module-level variables to store fetched data for later use (Phase 4+)
export let fetchedListData: ListData | null = null
export let fetchedMembers: ListMember[] = []
export let currentAuthState: AuthState | null = null

/**
 * Handles the login flow.
 * Redirects to Bluesky for OAuth, which will return here with a session.
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
 * Handles the post-login redirect from Bluesky.
 * Updates auth state and shows create form if list data is available.
 */
function handlePostLoginRedirect(authState: AuthState): void {
  currentAuthState = authState

  // If we have list data from a prior fetch, show the create form
  if (fetchedListData) {
    showCreateForm(fetchedListData.list.name, handleCreateCuratelist)
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
 * Handles the curatelist creation flow.
 * Called when user clicks "Create Curatelist" button.
 */
async function handleCreateCuratelist(name: string): Promise<void> {
  if (!fetchedListData || !currentAuthState) {
    showCreateError('Missing data. Please fetch the list and log in again.', () => {
      // Retry: show the create form again
      showCreateForm(fetchedListData?.list.name || 'New Curatelist', handleCreateCuratelist)
    })
    return
  }

  const agent = currentAuthState.agent
  const memberDids = fetchedMembers.map((m) => m.did)
  const description = `Converted from ${fetchedListData.list.name}`

  try {
    // Call createCuratelist with progress callback
    const result = await createCuratelist(agent, name, description, memberDids, (current, total) => {
      showProgress(current, total)
    })

    // Show result
    showResult(result.listUrl, result.added, result.failed, result.errors)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showCreateError(`Failed to create curatelist: ${message}`, () => {
      // Retry: show the create form again
      showCreateForm(name, handleCreateCuratelist)
    })
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
      // Check if this is a post-login redirect with list data
      if (fetchedListData) {
        // Show create form after successful login redirect
        handlePostLoginRedirect(authState)
      } else {
        currentAuthState = authState
      }
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

      // If already logged in, show create form
      // Otherwise, show auth section
      if (currentAuthState) {
        showCreateForm(listData.list.name, handleCreateCuratelist)
      } else {
        showAuthUI()
      }
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
