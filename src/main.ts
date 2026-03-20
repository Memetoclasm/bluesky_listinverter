/**
 * Main Entry Point
 * Wires the list reading and UI modules together.
 */

import { parseListUrl, resolveHandleToDid, fetchListMembers, type ListData, type ListMember } from './list-reader'
import { showError, clearError, showPreview, setLoading } from './ui'

// Module-level variables to store fetched data for later use (Phase 4+)
export let fetchedListData: ListData | null = null
export let fetchedMembers: ListMember[] = []

/**
 * Initializes the main UI flow on DOM load.
 */
function initializeUI(): void {
  const listUrlInput = document.getElementById('list-url') as HTMLInputElement | null
  const fetchBtn = document.getElementById('fetch-btn') as HTMLButtonElement | null

  if (!listUrlInput || !fetchBtn) {
    console.error('Required elements not found in DOM')
    return
  }

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
