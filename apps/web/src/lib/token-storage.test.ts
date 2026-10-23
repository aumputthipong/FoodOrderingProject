import { clearToken, getToken, setToken } from './token-storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

test('stores, reads and clears the token under canteen.token', () => {
  expect(getToken()).toBeNull()
  setToken('abc')
  expect(localStorage.getItem('canteen.token')).toBe('abc')
  expect(getToken()).toBe('abc')
  clearToken()
  expect(getToken()).toBeNull()
})

test('swallows storage errors', () => {
  const boom = () => {
    throw new Error('denied')
  }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom)
  expect(getToken()).toBeNull()
  expect(() => setToken('x')).not.toThrow()
  expect(() => clearToken()).not.toThrow()
})
