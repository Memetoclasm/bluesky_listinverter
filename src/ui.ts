/**
 * UI Helpers Module
 * Provides DOM helper functions for the list converter UI.
 */

/**
 * Shows the error section with the given message.
 * Hides other dynamic sections.
 *
 * @param message - The error message to display
 */
export function showError(message: string): void {
  const errorSection = document.getElementById('error-section')
  const previewSection = document.getElementById('preview-section')
  const authSection = document.getElementById('auth-section')
  const progressSection = document.getElementById('progress-section')
  const resultSection = document.getElementById('result-section')

  if (errorSection) {
    errorSection.textContent = message
    errorSection.hidden = false
  }

  if (previewSection) previewSection.hidden = true
  if (authSection) authSection.hidden = true
  if (progressSection) progressSection.hidden = true
  if (resultSection) resultSection.hidden = true
}

/**
 * Hides the error section.
 */
export function clearError(): void {
  const errorSection = document.getElementById('error-section')
  if (errorSection) {
    errorSection.hidden = true
  }
}

interface PreviewData {
  name: string
  description?: string
  memberCount: number
  sampleHandles: string[]
}

/**
 * Shows the preview section with list data.
 *
 * @param data - The list preview data
 */
export function showPreview(data: PreviewData): void {
  const previewSection = document.getElementById('preview-section')

  if (!previewSection) return

  // Build the preview content
  let html = `<h2>${escapeHtml(data.name)}</h2>`

  if (data.description) {
    html += `<p>${escapeHtml(data.description)}</p>`
  }

  html += `<p><strong>Members:</strong> ${data.memberCount}</p>`
  html += `<p><strong>Sample members:</strong> ${escapeHtml(data.sampleHandles.join(', '))}</p>`

  previewSection.innerHTML = html
  previewSection.hidden = false
}

/**
 * Hides the preview section.
 */
export function hidePreview(): void {
  const previewSection = document.getElementById('preview-section')
  if (previewSection) {
    previewSection.hidden = true
  }
}

/**
 * Sets loading state on a button.
 * Disables and shows "Loading..." when loading is true.
 * Restores original text when loading is false.
 *
 * @param button - The button element
 * @param loading - Whether to set loading state
 */
export function setLoading(button: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    // Store original text if not already stored
    if (!button.hasAttribute('data-original-text')) {
      button.setAttribute('data-original-text', button.textContent || '')
    }
    button.textContent = 'Loading...'
    button.disabled = true
  } else {
    // Restore original text
    const originalText = button.getAttribute('data-original-text') || ''
    button.textContent = originalText
    button.disabled = false
  }
}

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param text - The text to escape
 * @returns The escaped text
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
