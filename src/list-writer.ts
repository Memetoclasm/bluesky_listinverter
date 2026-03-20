/**
 * List Writer Module
 * Creates a curatelist in the authenticated user's account with all members from a source list.
 */

import { Agent } from '@atproto/api'

/**
 * Represents the result of creating a curatelist.
 */
export interface CreateListResult {
  listUri: string
  listUrl: string
  added: number
  failed: number
  errors: Array<{ did: string; error: string }>
}

/**
 * Callback for progress updates during member addition.
 */
export type ProgressCallback = (current: number, total: number) => void

/**
 * Converts an AT-URI to a bsky.app list URL.
 *
 * @param atUri - The AT-URI (format: at://{did}/app.bsky.graph.list/{rkey})
 * @returns The bsky.app URL
 */
export function atUriToListUrl(atUri: string): string {
  const withoutScheme = atUri.replace('at://', '')
  const parts = withoutScheme.split('/')
  return `https://bsky.app/profile/${parts[0]}/lists/${parts[2]}`
}

/**
 * Creates a curatelist in the authenticated user's account and adds all specified members.
 *
 * @param agent - The authenticated Agent instance
 * @param name - The name for the new curatelist (max 64 chars)
 * @param description - Description for the new curatelist
 * @param memberDids - Array of DIDs to add to the list
 * @param onProgress - Callback called after each member addition (success or failure)
 * @returns Promise<CreateListResult> with list URI, URL, and member addition results
 * @throws Error if the initial list creation fails
 */
export async function createCuratelist(
  agent: Agent,
  name: string,
  description: string,
  memberDids: string[],
  onProgress: ProgressCallback
): Promise<CreateListResult> {
  // Step 1: Create the list record
  const listResponse = await agent.com.atproto.repo.createRecord({
    repo: agent.did!,
    collection: 'app.bsky.graph.list',
    record: {
      $type: 'app.bsky.graph.list',
      purpose: 'app.bsky.graph.defs#curatelist',
      name,
      description,
      createdAt: new Date().toISOString()
    }
  })

  const listUri = listResponse.data.uri

  // Step 2: Add members one at a time with throttling and backoff
  const errors: Array<{ did: string; error: string }> = []
  let added = 0
  let backoffDelay = 2000 // Start at 2 seconds for exponential backoff

  for (let i = 0; i < memberDids.length; i++) {
    const memberDid = memberDids[i]
    let done = false
    let retries = 0
    const maxRetries = 5

    // Retry loop for rate limiting
    while (!done && retries <= maxRetries) {
      try {
        await agent.com.atproto.repo.createRecord({
          repo: agent.did!,
          collection: 'app.bsky.graph.listitem',
          record: {
            $type: 'app.bsky.graph.listitem',
            subject: memberDid,
            list: listUri,
            createdAt: new Date().toISOString()
          }
        })

        done = true
        added++
        backoffDelay = 2000 // Reset backoff delay on success

        // Wait 100ms before next member (throttle delay)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        // Narrow the error to check for rate limiting
        const errorObj = error instanceof Object ? error as Record<string, unknown> : {}
        const status = typeof errorObj.status === 'number' ? errorObj.status : 0
        const headers = errorObj.headers instanceof Object ? errorObj.headers as Record<string, string> : null

        // Check for rate limit (429)
        if (status === 429) {
          let waitTime = backoffDelay

          // Check for RateLimit-Reset header
          if (headers?.['RateLimit-Reset']) {
            const resetTimestamp = parseInt(headers['RateLimit-Reset'], 10)
            const now = Date.now()
            waitTime = Math.max(0, resetTimestamp * 1000 - now)
          }

          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          backoffDelay = Math.min(backoffDelay * 2, 60000) // Double, max 60s
          retries++

          // If we've exceeded max retries, treat as failure
          if (retries > maxRetries) {
            errors.push({
              did: memberDid,
              error: 'Rate limit: exceeded max retries'
            })
            done = true // Exit retry loop
          }
        } else {
          // Non-429 error: collect and continue
          const errorMessage = error instanceof Error ? error.message : String(error)
          errors.push({
            did: memberDid,
            error: errorMessage
          })
          done = true // Exit retry loop
        }
      }
    }

    // Call progress callback after each member (success or fail)
    onProgress(i + 1, memberDids.length)
  }

  // Step 3: Construct result
  const listUrl = atUriToListUrl(listUri)
  return {
    listUri,
    listUrl,
    added,
    failed: errors.length,
    errors
  }
}
