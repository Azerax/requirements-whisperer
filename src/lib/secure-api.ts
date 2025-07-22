// Secure API utilities with input validation and error handling

export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export class SecureApiClient {
  private static instance: SecureApiClient
  private readonly baseUrl: string
  private readonly timeout: number = 30000 // 30 seconds

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  }

  static getInstance(): SecureApiClient {
    if (!SecureApiClient.instance) {
      SecureApiClient.instance = new SecureApiClient()
    }
    return SecureApiClient.instance
  }

  private sanitizeUrl(url: string): string {
    // Remove any potentially dangerous characters
    return url.replace(/[<>"'&]/g, '')
  }

  private validateInput(input: unknown): boolean {
    if (typeof input === 'string') {
      // Check for common injection patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i
      ]
      return !dangerousPatterns.some(pattern => pattern.test(input))
    }
    return true
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      if (!this.validateInput(endpoint)) {
        throw new Error('Invalid endpoint format')
      }

      const sanitizedEndpoint = this.sanitizeUrl(endpoint)
      const url = new URL(sanitizedEndpoint, this.baseUrl)
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (this.validateInput(key) && this.validateInput(value)) {
            url.searchParams.append(key, value)
          }
        })
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { data, success: true }

    } catch (error) {
      console.error('API request failed:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }
    }
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      if (!this.validateInput(endpoint)) {
        throw new Error('Invalid endpoint format')
      }

      if (body && !this.validateInput(JSON.stringify(body))) {
        throw new Error('Invalid request body')
      }

      const sanitizedEndpoint = this.sanitizeUrl(endpoint)
      const url = new URL(sanitizedEndpoint, this.baseUrl)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { data, success: true }

    } catch (error) {
      console.error('API request failed:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }
    }
  }
}

export const secureApi = SecureApiClient.getInstance()