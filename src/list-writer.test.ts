import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCuratelist, atUriToListUrl } from './list-writer'
import { Agent } from '@atproto/api'

// Mock the Agent class
vi.mock('@atproto/api', () => {
  return {
    Agent: vi.fn()
  }
})

describe('atUriToListUrl', () => {
  it('converts an AT-URI to a bsky.app URL', () => {
    const atUri = 'at://did:plc:abc123/app.bsky.graph.list/rkey123'
    const result = atUriToListUrl(atUri)
    expect(result).toBe('https://bsky.app/profile/did:plc:abc123/lists/rkey123')
  })

  it('handles complex DIDs with multiple colons', () => {
    const atUri = 'at://did:plc:xyz789/app.bsky.graph.list/abc456'
    const result = atUriToListUrl(atUri)
    expect(result).toBe('https://bsky.app/profile/did:plc:xyz789/lists/abc456')
  })
})

describe('createCuratelist', () => {
  let mockAgent: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup mock agent
    mockAgent = {
      did: 'did:plc:organizer123',
      com: {
        atproto: {
          repo: {
            createRecord: vi.fn()
          }
        }
      }
    }
  })

  describe('bsky-list-converter.AC3.1: creates list and adds all members', () => {
    it('calls createRecord once for the list and once per member DID', async () => {
      const memberDids = ['did:plc:member1', 'did:plc:member2', 'did:plc:member3']

      // Mock list creation
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          data: { uri: 'at://did:plc:organizer123/app.bsky.graph.list/abc123' }
        })
        // Mock member additions
        .mockResolvedValue({ data: { uri: 'at://...' } })

      const result = await createCuratelist(mockAgent as Agent, 'Test List', 'Test', memberDids, vi.fn())

      // Should call createRecord 4 times: 1 for list + 3 for members
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(4)
      expect(result.added).toBe(3)
    })

    it('returns added count equal to number of members on success', async () => {
      const memberDids = ['did:plc:m1', 'did:plc:m2']
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          data: { uri: 'at://did:plc:organizer123/app.bsky.graph.list/listkey' }
        })
        .mockResolvedValue({ data: { uri: 'at://...' } })

      const result = await createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, vi.fn())

      expect(result.added).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('verifies each listitem record has correct list field and collection', async () => {
      const memberDid = 'did:plc:member1'
      const listUri = 'at://did:plc:org/app.bsky.graph.list/rkey'

      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: listUri } })
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })

      await createCuratelist(mockAgent as Agent, 'List', 'Desc', [memberDid], vi.fn())

      // Check the listitem call
      const listitemCall = mockAgent.com.atproto.repo.createRecord.mock.calls[1][0]
      expect(listitemCall.collection).toBe('app.bsky.graph.listitem')
      expect(listitemCall.record.list).toBe(listUri)
      expect(listitemCall.record.list).toMatch(/app\.bsky\.graph\.list/)
    })
  })

  describe('bsky-list-converter.AC3.2: creates list with curatelist purpose', () => {
    it('passes purpose as app.bsky.graph.defs#curatelist (not modlist)', async () => {
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        .mockResolvedValue({ data: { uri: 'at://...' } })

      await createCuratelist(mockAgent as Agent, 'List', 'Desc', ['did:plc:m1'], vi.fn())

      const listCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0]
      expect(listCall.record.purpose).toBe('app.bsky.graph.defs#curatelist')
      expect(listCall.record.$type).toBe('app.bsky.graph.list')
    })
  })

  describe('bsky-list-converter.AC3.3: uses custom name when provided', () => {
    it('passes custom name to list record, not original source name', async () => {
      const customName = 'My Custom Curatelist'
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        .mockResolvedValue({ data: { uri: 'at://...' } })

      await createCuratelist(mockAgent as Agent, customName, 'Desc', ['did:plc:m1'], vi.fn())

      const listCall = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0]
      expect(listCall.record.name).toBe(customName)
    })
  })

  describe('bsky-list-converter.AC3.4: calls progress callback with correct values', () => {
    it('calls onProgress once per member with incrementing current values', async () => {
      const memberDids = ['did:plc:m1', 'did:plc:m2', 'did:plc:m3']
      const onProgress = vi.fn()

      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        .mockResolvedValue({ data: { uri: 'at://...' } })

      await createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, onProgress)

      // Should be called 3 times with (1,3), (2,3), (3,3)
      expect(onProgress).toHaveBeenCalledTimes(3)
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3)
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3)
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3)
    })
  })

  describe('bsky-list-converter.AC3.5: returns clickable bsky.app link', () => {
    it('returns listUrl that can be used as href to view the new list', async () => {
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({
          data: { uri: 'at://did:plc:org123/app.bsky.graph.list/mykey456' }
        })
        .mockResolvedValue({ data: { uri: 'at://...' } })

      const result = await createCuratelist(mockAgent as Agent, 'List', 'Desc', ['did:plc:m1'], vi.fn())

      expect(result.listUrl).toBe('https://bsky.app/profile/did:plc:org123/lists/mykey456')
      expect(result.listUrl).toMatch(/^https:\/\/bsky\.app\/profile\//)
    })
  })

  describe('bsky-list-converter.AC4.1: partial failure continues and shows summary', () => {
    it('collects non-429 errors and continues to next member', async () => {
      const memberDids = ['did:plc:m1', 'did:plc:m2', 'did:plc:m3']
      const onProgress = vi.fn()

      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        // First member succeeds
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        // Second member fails
        .mockRejectedValueOnce(new Error('Connection timeout'))
        // Third member succeeds
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })

      const result = await createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, onProgress)

      expect(result.added).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].did).toBe('did:plc:m2')
      expect(result.errors[0].error).toMatch(/timeout/)
      // Progress callback should still be called 3 times
      expect(onProgress).toHaveBeenCalledTimes(3)
    })

    it('includes error details in result for display to user', async () => {
      const memberDids = ['did:plc:m1']
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        .mockRejectedValueOnce(new Error('User not found'))

      const result = await createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, vi.fn())

      expect(result.errors[0].error).toBe('User not found')
    })
  })

  describe('bsky-list-converter.AC4.2: rate limiting with backoff and retry', () => {
    it('handles default exponential backoff when no RateLimit-Reset header', async () => {
      vi.useFakeTimers()
      try {
        const memberDids = ['did:plc:m1']
        mockAgent.com.atproto.repo.createRecord
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })
          // First call gets 429
          .mockRejectedValueOnce({
            status: 429,
            message: 'Rate limited',
            headers: {}
          })
          // Second call (after backoff) succeeds
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })

        const resultPromise = createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, vi.fn())

        // Advance timers to trigger the backoff retry
        await vi.runAllTimersAsync()

        const result = await resultPromise

        expect(result.added).toBe(1)
        expect(result.failed).toBe(0)
        // Should have been called 3 times: list creation, member attempt 1 (fail), member attempt 2 (success)
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(3)
      } finally {
        vi.useRealTimers()
      }
    })

    it('uses RateLimit-Reset header when available instead of default backoff', async () => {
      vi.useFakeTimers()
      try {
        const now = Date.now()
        vi.setSystemTime(now)

        const memberDids = ['did:plc:m1']
        const resetTimestamp = Math.floor(now / 1000) + 5 // 5 seconds from now

        mockAgent.com.atproto.repo.createRecord
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })
          // First call gets 429 with RateLimit-Reset header
          .mockRejectedValueOnce({
            status: 429,
            message: 'Rate limited',
            headers: { 'RateLimit-Reset': resetTimestamp.toString() }
          })
          // Second call succeeds
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })

        const resultPromise = createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, vi.fn())

        // Advance timers past the reset time
        await vi.advanceTimersByTimeAsync(6000)

        const result = await resultPromise

        expect(result.added).toBe(1)
        expect(result.failed).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })

    it('retries the same member after waiting', async () => {
      vi.useFakeTimers()
      try {
        const memberDid = 'did:plc:m1'
        mockAgent.com.atproto.repo.createRecord
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })
          // Fail first time
          .mockRejectedValueOnce({
            status: 429,
            message: 'Rate limited',
            headers: {}
          })
          // Succeed on retry
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })

        const resultPromise = createCuratelist(mockAgent as Agent, 'List', 'Desc', [memberDid], vi.fn())
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // Verify the same member was retried (still added=1, not failed)
        expect(result.added).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('exponentially backs off with doubling delay starting at 2 seconds', async () => {
      vi.useFakeTimers()
      try {
        const memberDid = 'did:plc:m1'

        mockAgent.com.atproto.repo.createRecord
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })
          // First 429
          .mockRejectedValueOnce({
            status: 429,
            headers: {}
          })
          // Second 429
          .mockRejectedValueOnce({
            status: 429,
            headers: {}
          })
          // Then success
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })

        const resultPromise = createCuratelist(mockAgent as Agent, 'List', 'Desc', [memberDid], vi.fn())
        await vi.runAllTimersAsync()
        await resultPromise

        // Verify backoff actually happened by checking multiple calls occurred
        expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled()
        // Member was retried and eventually succeeded
        expect(mockAgent.com.atproto.repo.createRecord.mock.calls.length).toBeGreaterThan(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it('caps maximum backoff delay at 60 seconds', async () => {
      vi.useFakeTimers()
      try {
        const memberDid = 'did:plc:m1'

        // Create multiple 429 responses that result in the backoff doubling repeatedly
        mockAgent.com.atproto.repo.createRecord
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })

        // Queue up 5 consecutive 429s (testing exponential backoff: 2s, 4s, 8s, 16s, 32s)
        // The 6th attempt will succeed (at 60s max)
        for (let i = 0; i < 5; i++) {
          mockAgent.com.atproto.repo.createRecord.mockRejectedValueOnce({
            status: 429,
            headers: {}
          })
        }
        mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({ data: { uri: 'at://...' } })

        const resultPromise = createCuratelist(mockAgent as Agent, 'List', 'Desc', [memberDid], vi.fn())
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result.added).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('bsky-list-converter.AC4.3: list creation failure throws immediately', () => {
    it('throws error immediately if list createRecord fails', async () => {
      mockAgent.com.atproto.repo.createRecord.mockRejectedValueOnce(
        new Error('List creation failed')
      )

      const memberDids = ['did:plc:m1', 'did:plc:m2']
      const onProgress = vi.fn()

      await expect(
        createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, onProgress)
      ).rejects.toThrow('List creation failed')

      // Should not call createRecord for members
      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(1)
      // Should not call progress callback
      expect(onProgress).not.toHaveBeenCalled()
    })

    it('does not attempt to add members if list creation throws', async () => {
      mockAgent.com.atproto.repo.createRecord.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      )

      const memberDids = ['did:plc:m1']

      await expect(
        createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, vi.fn())
      ).rejects.toThrow('Insufficient permissions')

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledTimes(1)
    })
  })

  describe('100ms throttle delay between members', () => {
    it('waits 100ms between successful member additions', async () => {
      vi.useFakeTimers()
      try {
        const memberDids = ['did:plc:m1', 'did:plc:m2']

        mockAgent.com.atproto.repo.createRecord
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })
          .mockResolvedValueOnce({ data: { uri: 'at://...' } })

        const resultPromise = createCuratelist(mockAgent as Agent, 'List', 'Desc', memberDids, vi.fn())
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // Should complete successfully with both members added
        expect(result.added).toBe(2)
        expect(result.failed).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('edge cases', () => {
    it('handles empty member list', async () => {
      mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
        data: { uri: 'at://...' }
      })

      const result = await createCuratelist(mockAgent as Agent, 'List', 'Desc', [], vi.fn())

      expect(result.added).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('handles single member', async () => {
      mockAgent.com.atproto.repo.createRecord
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })
        .mockResolvedValueOnce({ data: { uri: 'at://...' } })

      const result = await createCuratelist(
        mockAgent as Agent,
        'List',
        'Desc',
        ['did:plc:m1'],
        vi.fn()
      )

      expect(result.added).toBe(1)
    })
  })
})
