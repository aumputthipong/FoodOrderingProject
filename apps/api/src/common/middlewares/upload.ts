import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import type { RequestHandler } from 'express'
import multer from 'multer'
import { env } from '../../config/env'
import { ValidationError } from '../errors'

// The stored extension comes from the verified MIME type, never from the client's file name.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      mkdirSync(env.UPLOAD_DIR, { recursive: true })
      cb(null, env.UPLOAD_DIR)
    } catch (err) {
      cb(err as Error, env.UPLOAD_DIR)
    }
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype] ?? ''}`)
  },
})

/** Accepts one optional image in the multipart field `image`; the saved file is on `req.file`. */
export const uploadImage: RequestHandler = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in EXTENSIONS) {
      cb(null, true)
      return
    }
    cb(
      new ValidationError('Invalid image file', [
        { path: 'image', message: 'Image must be a JPEG, PNG, WebP, AVIF or GIF file' },
      ]),
    )
  },
}).single('image')
