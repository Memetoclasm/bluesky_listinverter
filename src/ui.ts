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

/**
 * Shows the auth section with a login form.
 *
 * @param onLogin - Callback when user submits handle
 */
export function showAuthSection(onLogin: (handle: string) => void): void {
  const authSection = document.getElementById('auth-section')
  if (!authSection) return

  // Clear any previous error messages
  const errorDiv = authSection.querySelector('.auth-error')
  if (errorDiv) {
    errorDiv.remove()
  }

  // Build login form
  const html = `
    <div class="auth-form">
      <label for="auth-handle">Bluesky handle:</label>
      <input
        type="text"
        id="auth-handle"
        placeholder="your-handle.bsky.social"
      />
      <button id="auth-login-btn" type="button">Log in with Bluesky</button>
    </div>
  `

  authSection.innerHTML = html
  authSection.hidden = false

  // Set up event listener
  const loginBtn = authSection.querySelector('#auth-login-btn') as HTMLButtonElement | null
  const handleInput = authSection.querySelector('#auth-handle') as HTMLInputElement | null

  if (loginBtn && handleInput) {
    const handleClick = () => {
      const handle = handleInput.value.trim()
      if (handle) {
        onLogin(handle)
      }
    }

    // Allow Enter key to submit
    handleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleClick()
      }
    })

    loginBtn.addEventListener('click', handleClick)
  }
}

/**
 * Shows the logged-in state in the auth section.
 *
 * @param handle - The user's Bluesky handle
 * @param onLogout - Callback when user clicks logout
 */
export function showLoggedIn(handle: string, onLogout: () => void): void {
  const authSection = document.getElementById('auth-section')
  if (!authSection) return

  const html = `
    <div class="auth-logged-in">
      <p>Logged in as @${escapeHtml(handle)}</p>
      <button id="auth-logout-btn" type="button">Log out</button>
    </div>
  `

  authSection.innerHTML = html
  authSection.hidden = false

  const logoutBtn = authSection.querySelector('#auth-logout-btn') as HTMLButtonElement | null
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout)
  }
}

/**
 * Hides the auth section.
 */
export function hideAuthSection(): void {
  const authSection = document.getElementById('auth-section')
  if (authSection) {
    authSection.hidden = true
  }
}

/**
 * Shows an auth error message with a try again affordance.
 * Does not hide the login form.
 *
 * @param message - The error message to display
 */
export function showAuthError(message: string): void {
  const authSection = document.getElementById('auth-section')
  if (!authSection) return

  // Remove any existing error message
  const existingError = authSection.querySelector('.auth-error')
  if (existingError) {
    existingError.remove()
  }

  // Create error div
  const errorDiv = document.createElement('div')
  errorDiv.className = 'auth-error'
  errorDiv.innerHTML = `
    <p style="color: red; margin-top: 1em;">
      ${escapeHtml(message)}
    </p>
  `

  // Append to auth section (after login form)
  authSection.appendChild(errorDiv)
}

/**
 * Shows the create form within the preview section.
 * Displays an editable text input pre-filled with the list name and a create button.
 *
 * @param listName - The default name for the new curatelist
 * @param onCreate - Callback when user clicks the create button with the input value
 */
export function showCreateForm(listName: string, onCreate: (name: string) => void): void {
  const previewSection = document.getElementById('preview-section')
  if (!previewSection) return

  // Add create form below the preview
  const formHtml = `
    <div class="create-form" style="margin-top: 2em; padding: 1em; border-top: 1px solid #ccc;">
      <label for="curatelist-name" style="display: block; margin-bottom: 0.5em;">
        Curatelist name:
      </label>
      <input
        type="text"
        id="curatelist-name"
        maxlength="64"
        value="${escapeHtml(listName)}"
        style="width: 100%; padding: 0.5em; margin-bottom: 1em; box-sizing: border-box;"
      />
      <button id="create-curatelist-btn" type="button" style="padding: 0.5em 1em;">
        Create Curatelist
      </button>
    </div>
  `

  previewSection.innerHTML += formHtml

  // Set up event listener
  const createBtn = previewSection.querySelector('#create-curatelist-btn') as HTMLButtonElement | null
  const nameInput = previewSection.querySelector('#curatelist-name') as HTMLInputElement | null

  if (createBtn && nameInput) {
    const handleCreate = () => {
      const name = nameInput.value.trim()
      if (name) {
        onCreate(name)
      }
    }

    // Allow Enter key to submit
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleCreate()
      }
    })

    createBtn.addEventListener('click', handleCreate)
  }
}

/**
 * Shows the progress section during member addition.
 * Displays a progress bar and current progress text.
 *
 * @param current - The current member number being added
 * @param total - The total number of members to add
 */
export function showProgress(current: number, total: number): void {
  const progressSection = document.getElementById('progress-section')
  if (!progressSection) return

  const html = `
    <div class="progress-container">
      <p>Adding member ${current} of ${total}...</p>
      <progress
        id="member-progress"
        value="${current}"
        max="${total}"
        style="width: 100%; height: 2em;"
      ></progress>
    </div>
  `

  progressSection.innerHTML = html
  progressSection.hidden = false
}

/**
 * Shows the result section with completion summary.
 * Displays a success/partial success message, a link to the new list, and error details if any.
 *
 * @param listUrl - The bsky.app URL for the new curatelist
 * @param added - The number of members successfully added
 * @param failed - The number of members that failed to add
 * @param errors - Array of error details for failed members
 */
export function showResult(
  listUrl: string,
  added: number,
  failed: number,
  errors: Array<{ did: string; error: string }>
): void {
  const resultSection = document.getElementById('result-section')
  if (!resultSection) return

  const total = added + failed

  // Build summary message
  let summary: string
  if (failed === 0) {
    summary = `Successfully added all ${added} members!`
  } else {
    summary = `Added ${added} of ${total}. ${failed} failed.`
  }

  let html = `
    <div class="result-container">
      <p>${escapeHtml(summary)}</p>
      <p>
        <a href="${escapeHtml(listUrl)}" target="_blank">
          View your new curatelist
        </a>
      </p>
  `

  // Add error details if any
  if (errors.length > 0) {
    html += `
      <details style="margin-top: 1em;">
        <summary>Failed members (${errors.length})</summary>
        <ul style="margin-top: 0.5em;">
    `
    for (const error of errors) {
      html += `<li>${escapeHtml(error.did)}: ${escapeHtml(error.error)}</li>`
    }
    html += `
        </ul>
      </details>
    `
  }

  html += `
    </div>
  `

  resultSection.innerHTML = html
  resultSection.hidden = false
}

/**
 * Shows the result section with an error message and retry button.
 * Used when list creation itself fails.
 *
 * @param message - The error message to display
 * @param onRetry - Callback when user clicks the retry button
 */
export function showCreateError(message: string, onRetry: () => void): void {
  const resultSection = document.getElementById('result-section')
  if (!resultSection) return

  const html = `
    <div class="error-container">
      <p style="color: red;">${escapeHtml(message)}</p>
      <button id="create-retry-btn" type="button" style="padding: 0.5em 1em;">
        Retry
      </button>
    </div>
  `

  resultSection.innerHTML = html
  resultSection.hidden = false

  const retryBtn = resultSection.querySelector('#create-retry-btn') as HTMLButtonElement | null
  if (retryBtn) {
    retryBtn.addEventListener('click', onRetry)
  }
}
