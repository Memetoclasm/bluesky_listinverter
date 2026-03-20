/**
 * List Reader Module
 * Handles parsing Bluesky list URLs, resolving handles to DIDs, and fetching list members.
 */

/**
 * Custom error class for intentional API errors thrown by this module.
 * Used to distinguish between expected errors (404, validation) and unexpected ones.
 */
class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Parses a Bluesky list URL into components.
 * URL format: https://bsky.app/profile/{handle-or-did}/lists/{rkey}
 *
 * @param url - The Bluesky list URL to parse
 * @returns Object with identifier, rkey, and isDid flag, or null if invalid
 */
export function parseListUrl(url: string): {
  identifier: string
  rkey: string
  isDid: boolean
} | null {
  try {
    const parsed = new URL(url)

    // Validate it's a bsky.app URL
    if (parsed.hostname !== 'bsky.app') {
      return null
    }

    const pathMatch = parsed.pathname.match(/^\/profile\/([^/]+)\/lists\/([^/]+)$/)

    if (!pathMatch) {
      return null
    }

    const identifier = pathMatch[1]
    const rkey = pathMatch[2]

    return {
      identifier,
      rkey,
      isDid: identifier.startsWith('did:')
    }
  } catch {
    return null
  }
}

/**
 * Resolves a Bluesky handle to a DID via the public API.
 *
 * @param handle - The handle to resolve
 * @returns The DID string
 * @throws Error with descriptive message on failure
 */
export async function resolveHandleToDid(handle: string): Promise<string> {
  const url = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new ApiError(`Failed to resolve handle: ${response.statusText}`)
    }

    const data = (await response.json()) as { did: string }
    return data.did
  } catch (error) {
    // Only wrap unexpected errors; re-throw intentional ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not resolve handle "${handle}": ${message}`)
  }
}

export interface ListMember {
  did: string
  handle: string
  displayName?: string
}

export interface ListData {
  list: {
    name: string
    description?: string
    purpose?: string
    listItemCount?: number
  }
  members: ListMember[]
}

/**
 * Fetches all members of a Bluesky list with pagination support.
 *
 * @param atUri - The AT-URI of the list (format: at://{did}/app.bsky.graph.list/{rkey})
 * @returns List metadata and member array
 * @throws Error with status-aware messages on failure
 */
export async function fetchListMembers(atUri: string): Promise<ListData> {
  const baseUrl = 'https://public.api.bsky.app/xrpc/app.bsky.graph.getList'
  const baseParams = new URLSearchParams({
    list: atUri,
    limit: '100'
  })

  const members: ListMember[] = []
  let listData: ListData['list'] | null = null
  let cursor: string | undefined

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = new URLSearchParams(baseParams)
    if (cursor) {
      params.set('cursor', cursor)
    }
    const url = `${baseUrl}?${params.toString()}`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          throw new ApiError('List not found')
        }
        throw new ApiError(`API error: ${response.statusText}`)
      }

      interface ApiResponse {
        list: {
          name: string
          description?: string
          purpose?: string
          listItemCount?: number
        }
        items: Array<{
          subject: {
            did: string
            handle: string
            displayName?: string
          }
        }>
        cursor?: string
      }

      const data = (await response.json()) as ApiResponse

      if (!listData) {
        listData = data.list
      }

      // Extract member handles from the items
      data.items.forEach((item) => {
        members.push({
          did: item.subject.did,
          handle: item.subject.handle,
          displayName: item.subject.displayName
        })
      })

      // Check for pagination
      if (!data.cursor) {
        break
      }

      cursor = data.cursor
    } catch (error) {
      // Only wrap unexpected errors; re-throw intentional ApiError as-is
      if (error instanceof ApiError) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to fetch list members: ${message}`)
    }
  }

  if (!listData) {
    throw new Error('No list data returned from API')
  }

  return {
    list: listData,
    members
  }
}
