import { closeDb } from '../../src/db/client'
import { resetDb } from '../helpers/db'

beforeEach(resetDb)
afterAll(closeDb)
