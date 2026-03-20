import { describe, it, expect, beforeEach } from 'vitest'
import { showError, clearError, showPreview, hidePreview, setLoading } from './ui'

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
})
