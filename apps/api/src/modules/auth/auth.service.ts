import bcrypt from 'bcrypt'
import type { LoginInput, LoginResponse, SignupInput, User } from '@canteen/shared'
import { isDuplicateEntry } from '../../common/dbErrors'
import { ConflictError, UnauthorizedError } from '../../common/errors'
import { toUser } from './auth.mapper'
import * as repo from './auth.repository'
import { generateToken, hashToken } from './token'

const BCRYPT_COST = 10
// Compared against when the username is unknown so that response time does not reveal existence.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST)
const INVALID_CREDENTIALS = 'Invalid username or password'
const USERNAME_TAKEN = 'Username is already taken'

export async function signup(input: SignupInput): Promise<User> {
  if (await repo.usernameExists(input.username)) throw new ConflictError(USERNAME_TAKEN)

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
  let id: number
  try {
    id = await repo.insertUser({
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      mobile: input.mobile,
      role: input.role,
    })
  } catch (err) {
    if (isDuplicateEntry(err)) throw new ConflictError(USERNAME_TAKEN)
    throw err
  }

  const row = await repo.findUserById(id)
  if (!row) throw new Error('User disappeared right after signup')
  return toUser(row)
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const credentials = await repo.findCredentialsByUsername(input.username)
  const matches = await bcrypt.compare(input.password, credentials?.passwordHash ?? DUMMY_HASH)
  if (!credentials || !matches) throw new UnauthorizedError(INVALID_CREDENTIALS)

  const token = generateToken()
  await repo.insertToken(credentials.id, hashToken(token))
  const row = await repo.findUserById(credentials.id)
  if (!row) throw new UnauthorizedError(INVALID_CREDENTIALS)
  return { token, user: toUser(row) }
}

export async function logout(tokenHash: string): Promise<void> {
  await repo.deleteToken(tokenHash)
}

export async function findUserByToken(
  token: string,
): Promise<{ user: User; tokenHash: string } | null> {
  const tokenHash = hashToken(token)
  const row = await repo.findUserByTokenHash(tokenHash)
  return row ? { user: toUser(row), tokenHash } : null
}
