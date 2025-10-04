import { signUp, signIn, signOut, getSession, checkUsernameAvailability } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

// Type the mocked localStorage
const mockLocalStorage = localStorage as jest.Mocked<Storage>

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.clear()
  })

  describe('signUp', () => {
    it('should successfully create a user with email and username', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockData = { user: mockUser, session: null }

      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await signUp('testuser', 'test@example.com')

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String),
        options: {
          data: {
            username: 'testuser',
          },
        },
      })

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'eternal_realms_credentials',
        expect.stringContaining('test@example.com')
      )
    })

    it('should generate email from username if not provided', async () => {
      const mockUser = { id: '123' }
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      await signUp('testuser')

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'testuser@example.com',
        })
      )
    })

    it('should handle signup errors', async () => {
      const mockError = new Error('Email already exists')
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signUp('testuser', 'test@example.com')

      expect(result.data).toBeNull()
      expect(result.error).toBe(mockError)
    })

    it('should generate secure random password', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      })

      await signUp('testuser', 'test@example.com')

      const callArgs = (supabase.auth.signUp as jest.Mock).mock.calls[0][0]
      expect(callArgs.password).toHaveLength(32)
      expect(callArgs.password).toMatch(/^[a-zA-Z0-9!@#$%^&*]+$/)
    })
  })

  describe('signIn', () => {
    it('should sign in with stored credentials', async () => {
      const storedCreds = {
        email: 'test@example.com',
        password: 'testpassword123',
        username: 'testuser',
      }

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify(storedCreds)
      )

      const mockData = { user: { id: '123' }, session: {} }
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await signIn('testuser')

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'testpassword123',
      })

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('should handle missing stored credentials', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = await signIn('testuser')

      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
    })

    it('should handle sign in errors', async () => {
      const storedCreds = {
        email: 'test@example.com',
        password: 'wrong',
        username: 'testuser',
      }

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify(storedCreds)
      )

      const mockError = new Error('Invalid credentials')
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await signIn('testuser')

      expect(result.error).toBe(mockError)
    })
  })

  describe('signOut', () => {
    it('should sign out and clear stored credentials', async () => {
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })

      const result = await signOut()

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'eternal_realms_credentials'
      )
      expect(result.error).toBeNull()
    })

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed')
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: mockError,
      })

      const result = await signOut()

      expect(result.error).toBe(mockError)
    })
  })

  describe('getSession', () => {
    it('should return current session', async () => {
      const mockSession = { user: { id: '123' }, access_token: 'token' }
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await getSession()

      expect(result.session).toEqual(mockSession)
      expect(result.error).toBeNull()
    })
  })

  describe('checkUsernameAvailability', () => {
    it('should return true if username is available', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await checkUsernameAvailability('newuser')

      expect(result).toBe(true)
      expect(mockFrom.select).toHaveBeenCalledWith('username')
      expect(mockFrom.eq).toHaveBeenCalledWith('username', 'newuser')
    })

    it('should return false if username is taken', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { username: 'existinguser' },
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await checkUsernameAvailability('existinguser')

      expect(result).toBe(false)
    })
  })
})
