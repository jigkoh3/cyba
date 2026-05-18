import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    status: number
    private _body: unknown

    constructor(body: unknown, init?: { status?: number }) {
      this._body = body
      this.status = init?.status ?? 200
    }

    async json() {
      return this._body
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init)
    }
  },
}))

import { GET } from '../app/api/health/route'

describe('GET /api/health', () => {
  it('returns HTTP 200 with status ok', async () => {
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.timestamp).toBe('string')
  })
})
