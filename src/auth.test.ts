import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the libraries
vi.mock('@atproto/oauth-client-browser', () => {
  return {
    BrowserOAuthClient: {
      load: vi.fn()
    }
  }
})

vi.mock('@atproto/api', () => {
  return {
    Agent: vi.fn()
  }
})

import { BrowserOAuthClient } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'
import * as authModule from './auth'

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authModule._resetAuthState()
  })

  describe('init', () => {
    it('AC2.1: handles OAuth callback and fetches profile', async () => {
      // When OAuth callback is processed with state defined,
      // the module should return AuthState
      const mockSession = { did: 'did:plc:test123' }
      const mockClient = {
        init: vi.fn().mockResolvedValue({
          session: mockSession,
          state: 'callback-token'
        }),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const mockAgent = {
        getProfile: vi.fn().mockResolvedValue({
          data: { handle: 'test.bsky.social' }
        })
      }

      vi.mocked(Agent).mockImplementation((function(this: any) {
        Object.assign(this, mockAgent)
      }) as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      try {
        const result = await authModule.init()

        // Should successfully return auth state
        expect(result).not.toBeNull()
        const authState = result!
        expect(authState.did).toBe('did:plc:test123')
        expect(authState.handle).toBe('test.bsky.social')
      } finally {
        ;(window as any).location = originalLocation
      }
    })

    it('AC2.4: throws error when client.init() throws', async () => {
      // When OAuth init fails, module propagates the error
      const mockClient = {
        init: vi.fn().mockRejectedValue(new Error('OAuth init failed')),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      try {
        // Should throw error to caller
        await expect(authModule.init()).rejects.toThrow('OAuth init failed')
      } finally {
        ;(window as any).location = originalLocation
      }
    })

    it('returns null when no session is found', async () => {
      // When init() resolves with undefined, no session exists
      const mockClient = {
        init: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      try {
        const result = await authModule.init()

        expect(result).toBeNull()
      } finally {
        ;(window as any).location = originalLocation
      }
    })

    it('returns null when profile fetch fails despite valid session', async () => {
      // When client.init() succeeds and session is valid,
      // but agent.getProfile() fails (network error, etc.),
      // init() should return null instead of throwing
      const mockSession = { did: 'did:plc:test456' }
      const mockClient = {
        init: vi.fn().mockResolvedValue({
          session: mockSession,
          state: 'callback-token'
        }),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      // Mock agent.getProfile() to reject
      const mockAgent = {
        getProfile: vi.fn().mockRejectedValue(new Error('Network error fetching profile'))
      }

      vi.mocked(Agent).mockImplementation((function(this: any) {
        Object.assign(this, mockAgent)
      }) as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      try {
        const result = await authModule.init()

        // Should return null, not throw
        expect(result).toBeNull()
        // Error should be logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch user profile:',
          expect.any(Error)
        )
      } finally {
        ;(window as any).location = originalLocation
        consoleErrorSpy.mockRestore()
      }
    })
  })

  describe('login', () => {
    it('AC2.4: propagates errors from signIn', async () => {
      // When login is called and signIn fails, error should propagate to caller
      const mockClient = {
        init: vi.fn().mockResolvedValue(undefined),
        signIn: vi.fn().mockRejectedValue(new Error('Sign in error')),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      try {
        await authModule.init()

        // Error should be thrown to caller
        await expect(authModule.login('user.bsky.social')).rejects.toThrow(
          'Sign in error'
        )
      } finally {
        ;(window as any).location = originalLocation
      }
    })

    it('throws error if login called before init', async () => {
      // When login is called without init, should throw
      await expect(authModule.login('user.bsky.social')).rejects.toThrow(
        'Auth module not initialized'
      )
    })
  })

  describe('logout', () => {
    it('AC2.3: clears auth state on logout', async () => {
      // After logout, auth state should be cleared
      const mockSession = {
        did: 'did:plc:logout123',
        signOut: vi.fn().mockResolvedValue(undefined)
      }
      const mockClient = {
        init: vi.fn().mockResolvedValue({
          session: mockSession,
          state: 'callback'
        }),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const mockAgent = {
        getProfile: vi.fn().mockResolvedValue({
          data: { handle: 'logout.bsky.social' }
        })
      }

      vi.mocked(Agent).mockImplementation((function(this: any) {
        Object.assign(this, mockAgent)
      }) as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      try {
        // Initialize to authenticated state
        const authState = await authModule.init()

        // Verify init succeeded
        expect(authState).not.toBeNull()
        expect(authState!.did).toBe('did:plc:logout123')

        // Call logout
        await authModule.logout()

        // After logout, getAuthState should return null (state is cleared)
        const state = authModule.getAuthState()
        expect(state).toBeNull()
      } finally {
        ;(window as any).location = originalLocation
      }
    })

    it('handles errors during logout gracefully', async () => {
      // When logout encounters an error, it should log but not throw
      const mockSession = {
        did: 'did:plc:error123',
        signOut: vi.fn().mockRejectedValue(new Error('SignOut failed'))
      }
      const mockClient = {
        init: vi.fn().mockResolvedValue({
          session: mockSession,
          state: 'callback'
        }),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const mockAgent = {
        getProfile: vi.fn().mockResolvedValue({
          data: { handle: 'error.bsky.social' }
        })
      }

      vi.mocked(Agent).mockImplementation((function(this: any) {
        Object.assign(this, mockAgent)
      }) as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      try {
        const authState = await authModule.init()

        // Verify init succeeded
        expect(authState).not.toBeNull()
        expect(authState!.did).toBe('did:plc:error123')

        // Logout should not throw even if signOut fails
        await expect(authModule.logout()).resolves.toBeUndefined()

        // Should have logged the error
        expect(consoleErrorSpy).toHaveBeenCalled()
      } finally {
        ;(window as any).location = originalLocation
        consoleErrorSpy.mockRestore()
      }
    })

    it('clears localStorage on logout', async () => {
      // localStorage auth-did should be removed on logout
      const mockSession = {
        did: 'did:plc:storage123',
        signOut: vi.fn().mockResolvedValue(undefined)
      }
      const mockClient = {
        init: vi.fn().mockResolvedValue({
          session: mockSession,
          state: 'callback'
        }),
        addEventListener: vi.fn()
      }

      vi.mocked(BrowserOAuthClient.load).mockResolvedValue(mockClient as any)

      const mockAgent = {
        getProfile: vi.fn().mockResolvedValue({
          data: { handle: 'storage.bsky.social' }
        })
      }

      vi.mocked(Agent).mockImplementation((function(this: any) {
        Object.assign(this, mockAgent)
      }) as any)

      const originalLocation = window.location
      delete (window as any).location
      ;(window as any).location = { origin: 'http://localhost:3000' }

      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

      try {
        await authModule.init()
        await authModule.logout()

        // localStorage.removeItem should have been called
        expect(removeItemSpy).toHaveBeenCalledWith('auth-did')
      } finally {
        ;(window as any).location = originalLocation
        removeItemSpy.mockRestore()
      }
    })
  })
})
