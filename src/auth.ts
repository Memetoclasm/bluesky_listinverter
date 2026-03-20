/**
 * Auth Module
 * Wraps @atproto/oauth-client-browser to provide a clean authentication interface.
 */

import { BrowserOAuthClient } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'

/**
 * Represents the authenticated user state.
 */
export interface AuthState {
  did: string
  handle: string
  agent: Agent
}

// Store the current auth client instance
let client: BrowserOAuthClient | null = null
let currentAuthState: AuthState | null = null
let currentSession: any = null

/**
 * Initializes the auth module.
 * Detects OAuth callback or restores existing session from IndexedDB.
 *
 * @returns AuthState with did, handle, and agent on success, or null if not authenticated
 * @throws Error if OAuth callback processing fails (caller should handle and display error UI)
 */
export async function init(): Promise<AuthState | null> {
  // Load or create the BrowserOAuthClient
  client = await BrowserOAuthClient.load({
    clientId: window.location.origin + '/bsky-list-converter/client-metadata.json',
    handleResolver: 'https://bsky.social'
  })

  // Register listener for cross-tab session invalidation
  ;(client as any).addEventListener('deleted', () => {
    currentAuthState = null
    currentSession = null
  })

  // Initialize: detects callback params or restores session from IndexedDB
  // This may throw on callback processing errors
  const result = await client.init()

  // If no session was found, return null
  if (!result) {
    return null
  }

  const { session, state } = result

  // If this was a fresh OAuth callback, clean up the URL
  if (state !== undefined) {
    history.replaceState({}, document.title, window.location.pathname)
  }

  // Store the session for use in logout
  currentSession = session

  try {
    // Fetch user profile to get handle
    const agent = new Agent(session)
    const profileResponse = await agent.getProfile({ actor: session.did })
    const handle = profileResponse.data.handle

    // Create auth state
    currentAuthState = {
      did: session.did,
      handle,
      agent
    }

    return currentAuthState
  } catch (error) {
    // If profile fetch fails, propagate the error to the caller
    throw error
  }
}

/**
 * Initiates login with a Bluesky handle.
 * Redirects to Bluesky for OAuth authorization.
 *
 * @param handle - The user's Bluesky handle (e.g., "alice.bsky.social")
 * @throws Error if login fails
 */
export async function login(handle: string): Promise<void> {
  if (!client) {
    throw new Error('Auth module not initialized')
  }

  // This call redirects the browser and never resolves normally
  await client.signIn(handle)
}

/**
 * Logs out the current user.
 * Revokes token on server and clears IndexedDB.
 */
export async function logout(): Promise<void> {
  try {
    if (currentSession && typeof currentSession.signOut === 'function') {
      await currentSession.signOut()
    }
    // Clear stored auth state
    currentAuthState = null
    currentSession = null

    // Clear any localStorage data
    try {
      localStorage.removeItem('auth-did')
    } catch {
      // Ignore localStorage errors
    }
  } catch (error) {
    // Log but don't throw - best-effort cleanup
    console.error('Error during logout:', error)
  }
}

/**
 * Gets the current authentication state without re-initializing.
 *
 * @returns Current AuthState or null if not authenticated
 */
export function getAuthState(): AuthState | null {
  return currentAuthState
}

/**
 * Internal function to reset auth state (for testing)
 */
export function _resetAuthState(): void {
  client = null
  currentAuthState = null
  currentSession = null
}
