import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseListUrl, resolveHandleToDid, fetchListMembers } from './list-reader'

// Mock fetch at the globalThis level
vi.stubGlobal('fetch', vi.fn())

describe('parseListUrl', () => {
  it('bsky-list-converter.AC1.1: correctly extracts identifier and rkey from a valid DID-based URL', () => {
    const url = 'https://bsky.app/profile/did:plc:abc123/lists/3jwmdfk2kca2t'
    const result = parseListUrl(url)

    expect(result).not.toBeNull()
    expect(result?.identifier).toBe('did:plc:abc123')
    expect(result?.rkey).toBe('3jwmdfk2kca2t')
    expect(result?.isDid).toBe(true)
  })

  it('bsky-list-converter.AC1.2: correctly extracts a handle from a URL with isDid: false', () => {
    const url = 'https://bsky.app/profile/alice.bsky.social/lists/3jwmdfk2kca2t'
    const result = parseListUrl(url)

    expect(result).not.toBeNull()
    expect(result?.identifier).toBe('alice.bsky.social')
    expect(result?.rkey).toBe('3jwmdfk2kca2t')
    expect(result?.isDid).toBe(false)
  })

  describe('bsky-list-converter.AC1.4: returns null for invalid URLs', () => {
    it('empty string', () => {
      expect(parseListUrl('')).toBeNull()
    })

    it('non-bsky.app URL', () => {
      const url = 'https://example.com/profile/alice/lists/123'
      expect(parseListUrl(url)).toBeNull()
    })

    it('URL missing the lists segment', () => {
      const url = 'https://bsky.app/profile/alice/feed/123'
      expect(parseListUrl(url)).toBeNull()
    })

    it('URL with missing rkey', () => {
      const url = 'https://bsky.app/profile/alice/lists/'
      expect(parseListUrl(url)).toBeNull()
    })
  })
})

describe('resolveHandleToDid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bsky-list-converter.AC1.2: calls resolveHandle endpoint and returns the DID from a mocked successful response', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        did: 'did:plc:alice123'
      })
    })

    const result = await resolveHandleToDid('alice.bsky.social')

    expect(result).toBe('did:plc:alice123')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('com.atproto.identity.resolveHandle')
    )
  })

  it('bsky-list-converter.AC1.5: throws when handle does not exist (fetch returns error)', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    })

    await expect(resolveHandleToDid('nonexistent.bsky.social')).rejects.toThrow(
      /Failed to resolve handle/
    )
  })
})

describe('fetchListMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bsky-list-converter.AC1.1: returns list metadata and member array for a valid AT-URI with single-page response', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: {
          name: 'Test List',
          description: 'A test list',
          purpose: 'moderation',
          listItemCount: 2
        },
        items: [
          {
            subject: {
              did: 'did:plc:user1',
              handle: 'user1.bsky.social',
              displayName: 'User 1'
            }
          },
          {
            subject: {
              did: 'did:plc:user2',
              handle: 'user2.bsky.social',
              displayName: 'User 2'
            }
          }
        ]
      })
    })

    const result = await fetchListMembers('at://did:plc:list123/app.bsky.graph.list/rkey123')

    expect(result.list.name).toBe('Test List')
    expect(result.list.description).toBe('A test list')
    expect(result.members).toHaveLength(2)
    expect(result.members[0].handle).toBe('user1.bsky.social')
    expect(result.members[1].handle).toBe('user2.bsky.social')
  })

  it('bsky-list-converter.AC1.3: follows pagination cursors and collects all members from all pages', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>

    // First page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: {
          name: 'Paginated List',
          description: 'A large list',
          listItemCount: 250
        },
        items: [
          {
            subject: {
              did: 'did:plc:user1',
              handle: 'user1.bsky.social'
            }
          }
        ],
        cursor: 'cursor_page1'
      })
    })

    // Second page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: {
          name: 'Paginated List',
          listItemCount: 250
        },
        items: [
          {
            subject: {
              did: 'did:plc:user2',
              handle: 'user2.bsky.social'
            }
          }
        ],
        cursor: 'cursor_page2'
      })
    })

    // Third page (no cursor = last page)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: {
          name: 'Paginated List',
          listItemCount: 250
        },
        items: [
          {
            subject: {
              did: 'did:plc:user3',
              handle: 'user3.bsky.social'
            }
          }
        ]
      })
    })

    const result = await fetchListMembers('at://did:plc:list123/app.bsky.graph.list/rkey123')

    expect(result.members).toHaveLength(3)
    expect(result.members[0].handle).toBe('user1.bsky.social')
    expect(result.members[1].handle).toBe('user2.bsky.social')
    expect(result.members[2].handle).toBe('user3.bsky.social')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('bsky-list-converter.AC1.5: throws a descriptive error when fetch returns 404 (list not found)', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    await expect(fetchListMembers('at://did:plc:nonexistent/app.bsky.graph.list/rkey')).rejects.toThrow(
      /List not found/
    )
  })

  it('bsky-list-converter.AC1.5: throws a descriptive error on other non-OK status', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(fetchListMembers('at://did:plc:list123/app.bsky.graph.list/rkey')).rejects.toThrow(
      /API error/
    )
  })
})
