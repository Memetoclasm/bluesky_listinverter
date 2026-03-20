import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  showError,
  clearError,
  showPreview,
  hidePreview,
  setLoading,
  showAuthSection,
  showLoggedIn,
  hideAuthSection,
  showAuthError
} from './ui'

describe('UI Helpers', () => {
  beforeEach(() => {
    // Set up DOM structure for tests
    document.body.innerHTML = `
      <div id="error-section" hidden></div>
      <div id="preview-section" hidden></div>
      <div id="auth-section" hidden></div>
      <div id="progress-section" hidden></div>
      <div id="result-section" hidden></div>
      <button id="test-btn">Test Button</button>
    `
  })

  describe('showError', () => {
    it('shows error section with message and hides other sections', () => {
      showError('Test error message')

      const errorSection = document.getElementById('error-section')
      const previewSection = document.getElementById('preview-section')

      expect(errorSection?.hidden).toBe(false)
      expect(errorSection?.textContent).toBe('Test error message')
      expect(previewSection?.hidden).toBe(true)
    })

    it('uses textContent to prevent XSS', () => {
      const xssPayload = '<script>alert("xss")</script>'
      showError(xssPayload)

      const errorSection = document.getElementById('error-section')
      expect(errorSection?.textContent).toBe(xssPayload)
      expect(errorSection?.innerHTML).not.toContain('<script>')
    })
  })

  describe('clearError', () => {
    it('hides error section', () => {
      const errorSection = document.getElementById('error-section')
      errorSection!.hidden = false

      clearError()

      expect(errorSection?.hidden).toBe(true)
    })
  })

  describe('showPreview', () => {
    it('shows preview section with list data', () => {
      const previewData = {
        name: 'Test List',
        description: 'A test list',
        memberCount: 42,
        sampleHandles: ['user1.bsky.social', 'user2.bsky.social']
      }

      showPreview(previewData)

      const previewSection = document.getElementById('preview-section')
      expect(previewSection?.hidden).toBe(false)
      expect(previewSection?.innerHTML).toContain('Test List')
      expect(previewSection?.innerHTML).toContain('A test list')
      expect(previewSection?.innerHTML).toContain('42')
      expect(previewSection?.innerHTML).toContain('user1.bsky.social')
    })

    it('handles missing description', () => {
      const previewData = {
        name: 'Test List',
        memberCount: 10,
        sampleHandles: []
      }

      showPreview(previewData)

      const previewSection = document.getElementById('preview-section')
      expect(previewSection?.hidden).toBe(false)
      expect(previewSection?.innerHTML).toContain('Test List')
    })

    it('escapes HTML in list name and description', () => {
      const previewData = {
        name: '<script>alert("xss")</script>',
        description: '<img src=x onerror="alert(\'xss\')">',
        memberCount: 1,
        sampleHandles: []
      }

      showPreview(previewData)

      const previewSection = document.getElementById('preview-section')
      // Verify that dangerous HTML is escaped (not rendered as actual HTML)
      expect(previewSection?.innerHTML).not.toContain('<script>')
      expect(previewSection?.innerHTML).toContain('&lt;script&gt;')
      expect(previewSection?.innerHTML).toContain('&lt;img')
    })
  })

  describe('hidePreview', () => {
    it('hides preview section', () => {
      const previewSection = document.getElementById('preview-section')
      previewSection!.hidden = false

      hidePreview()

      expect(previewSection?.hidden).toBe(true)
    })
  })

  describe('setLoading', () => {
    it('sets loading state: disables button and shows loading text', () => {
      const button = document.getElementById('test-btn') as HTMLButtonElement
      button.textContent = 'Fetch List'

      setLoading(button, true)

      expect(button.disabled).toBe(true)
      expect(button.textContent).toBe('Loading...')
      expect(button.getAttribute('data-original-text')).toBe('Fetch List')
    })

    it('clears loading state: enables button and restores original text', () => {
      const button = document.getElementById('test-btn') as HTMLButtonElement
      button.textContent = 'Fetch List'

      setLoading(button, true)
      expect(button.disabled).toBe(true)

      setLoading(button, false)

      expect(button.disabled).toBe(false)
      expect(button.textContent).toBe('Fetch List')
    })

    it('preserves original text across multiple loading cycles', () => {
      const button = document.getElementById('test-btn') as HTMLButtonElement
      button.textContent = 'Original'

      setLoading(button, true)
      setLoading(button, false)
      setLoading(button, true)
      setLoading(button, false)

      expect(button.textContent).toBe('Original')
    })
  })

  describe('showAuthSection', () => {
    it('shows auth section with login form', () => {
      const onLogin = vi.fn()
      showAuthSection(onLogin)

      const authSection = document.getElementById('auth-section')
      expect(authSection?.hidden).toBe(false)

      const handleInput = authSection?.querySelector('#auth-handle') as HTMLInputElement
      const loginBtn = authSection?.querySelector('#auth-login-btn') as HTMLButtonElement

      expect(handleInput).toBeTruthy()
      expect(loginBtn).toBeTruthy()
      expect(loginBtn?.textContent).toContain('Log in with Bluesky')
    })

    it('calls onLogin with handle when button is clicked', () => {
      const onLogin = vi.fn()
      showAuthSection(onLogin)

      const authSection = document.getElementById('auth-section')
      const handleInput = authSection?.querySelector('#auth-handle') as HTMLInputElement
      const loginBtn = authSection?.querySelector('#auth-login-btn') as HTMLButtonElement

      handleInput.value = 'alice.bsky.social'
      loginBtn.click()

      expect(onLogin).toHaveBeenCalledWith('alice.bsky.social')
    })

    it('calls onLogin when Enter key is pressed in input', () => {
      const onLogin = vi.fn()
      showAuthSection(onLogin)

      const authSection = document.getElementById('auth-section')
      const handleInput = authSection?.querySelector('#auth-handle') as HTMLInputElement

      handleInput.value = 'bob.bsky.social'

      // Simulate Enter key press
      const event = new KeyboardEvent('keypress', { key: 'Enter' })
      handleInput.dispatchEvent(event)

      expect(onLogin).toHaveBeenCalledWith('bob.bsky.social')
    })

    it('trims whitespace from handle before calling onLogin', () => {
      const onLogin = vi.fn()
      showAuthSection(onLogin)

      const authSection = document.getElementById('auth-section')
      const handleInput = authSection?.querySelector('#auth-handle') as HTMLInputElement
      const loginBtn = authSection?.querySelector('#auth-login-btn') as HTMLButtonElement

      handleInput.value = '  charlie.bsky.social  '
      loginBtn.click()

      expect(onLogin).toHaveBeenCalledWith('charlie.bsky.social')
    })

    it('does not call onLogin if handle is empty', () => {
      const onLogin = vi.fn()
      showAuthSection(onLogin)

      const authSection = document.getElementById('auth-section')
      const loginBtn = authSection?.querySelector('#auth-login-btn') as HTMLButtonElement

      loginBtn.click()

      expect(onLogin).not.toHaveBeenCalled()
    })

    it('clears previous error messages when showing auth section', () => {
      const authSection = document.getElementById('auth-section')!

      // Create an error message first
      const errorDiv = document.createElement('div')
      errorDiv.className = 'auth-error'
      errorDiv.textContent = 'Old error'
      authSection.appendChild(errorDiv)

      showAuthSection(() => {})

      // Error should be removed
      const remainingError = authSection.querySelector('.auth-error')
      expect(remainingError).toBeNull()
    })
  })

  describe('showLoggedIn', () => {
    it('shows logged in state with handle and logout button', () => {
      const onLogout = vi.fn()
      showLoggedIn('alice.bsky.social', onLogout)

      const authSection = document.getElementById('auth-section')
      expect(authSection?.hidden).toBe(false)
      expect(authSection?.textContent).toContain('Logged in as @alice.bsky.social')

      const logoutBtn = authSection?.querySelector('#auth-logout-btn') as HTMLButtonElement
      expect(logoutBtn).toBeTruthy()
      expect(logoutBtn?.textContent).toBe('Log out')
    })

    it('calls onLogout when logout button is clicked', () => {
      const onLogout = vi.fn()
      showLoggedIn('bob.bsky.social', onLogout)

      const authSection = document.getElementById('auth-section')
      const logoutBtn = authSection?.querySelector('#auth-logout-btn') as HTMLButtonElement

      logoutBtn.click()

      expect(onLogout).toHaveBeenCalled()
    })

    it('escapes handle to prevent XSS', () => {
      const onLogout = vi.fn()
      showLoggedIn('<script>alert("xss")</script>', onLogout)

      const authSection = document.getElementById('auth-section')
      expect(authSection?.innerHTML).not.toContain('<script>')
      expect(authSection?.innerHTML).toContain('&lt;script&gt;')
    })
  })

  describe('hideAuthSection', () => {
    it('hides auth section', () => {
      const authSection = document.getElementById('auth-section')
      authSection!.hidden = false

      hideAuthSection()

      expect(authSection?.hidden).toBe(true)
    })
  })

  describe('showAuthError', () => {
    it('shows error message in auth section', () => {
      const authSection = document.getElementById('auth-section')
      authSection!.hidden = false
      authSection!.innerHTML = '<form></form>'

      showAuthError('Login failed')

      const errorDiv = authSection?.querySelector('.auth-error')
      expect(errorDiv).toBeTruthy()
      expect(errorDiv?.textContent).toContain('Login failed')
    })

    it('removes previous error message before showing new one', () => {
      const authSection = document.getElementById('auth-section')
      authSection!.innerHTML = `
        <form></form>
        <div class="auth-error">Old error</div>
      `

      showAuthError('New error')

      const errorDivs = authSection?.querySelectorAll('.auth-error')
      expect(errorDivs?.length).toBe(1)
      expect(errorDivs?.[0].textContent).toContain('New error')
    })

    it('escapes error message to prevent XSS', () => {
      const authSection = document.getElementById('auth-section')
      authSection!.hidden = false

      showAuthError('<script>alert("xss")</script>')

      const errorDiv = authSection?.querySelector('.auth-error')
      expect(errorDiv?.innerHTML).not.toContain('<script>')
      expect(errorDiv?.innerHTML).toContain('&lt;script&gt;')
    })

    it('appends error to auth section without removing form', () => {
      const authSection = document.getElementById('auth-section')
      authSection!.innerHTML = `
        <div class="auth-form">
          <input id="test-input" />
        </div>
      `

      showAuthError('Error message')

      // Form should still exist
      const input = authSection?.querySelector('#test-input')
      expect(input).toBeTruthy()

      // Error should be added
      const errorDiv = authSection?.querySelector('.auth-error')
      expect(errorDiv).toBeTruthy()
    })
  })
})
