import path from 'node:path'
import { assertSafeTestUploadDir, loadTestEnv, resolveTestEnv } from '../setup/test-env'

const apiRoot = path.resolve('/work/apps/api')
const realApiRoot = path.resolve(import.meta.dirname, '..', '..')

test.each([['tmp/test-uploads'], ['tmp/a/b']])('accepts %s inside apps/api/tmp', (dir) => {
  expect(() => assertSafeTestUploadDir(path.join(apiRoot, dir), apiRoot)).not.toThrow()
})

test.each([
  ['the dev uploads dir', 'uploads'],
  ['apps/api/tmp itself', 'tmp'],
  ['apps/api', '.'],
  ['a sibling that merely starts with tmp', 'tmpfoo/x'],
  ['a path escaping tmp', 'tmp/../uploads'],
  ['a dir outside the repo', '../../../elsewhere'],
])('refuses %s', (_label, dir) => {
  expect(() => assertSafeTestUploadDir(path.join(apiRoot, dir), apiRoot)).toThrow(
    /Refusing to remove test UPLOAD_DIR/,
  )
})

test('UPLOAD_DIR defaults to apps/api/tmp/test-uploads, not the dev uploads dir', () => {
  expect(resolveTestEnv({}).UPLOAD_DIR).toBe(path.join(realApiRoot, 'tmp', 'test-uploads'))
})

test('the configured test UPLOAD_DIR passes the guard', () => {
  expect(() => assertSafeTestUploadDir(loadTestEnv().UPLOAD_DIR!, realApiRoot)).not.toThrow()
})
