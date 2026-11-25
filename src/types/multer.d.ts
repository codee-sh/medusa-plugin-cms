/**
 * Minimal ambient types for `multer`, the multipart parser `@medusajs/medusa` ships for its
 * `/admin/uploads` route. Only what the media upload middleware uses is declared, so the plugin needs
 * neither `multer` nor `@types/multer` as a dependency of its own.
 */
declare module "multer" {
  import type { RequestHandler } from "express"

  namespace multer {
    /** One parsed file, as `.single()` leaves it on `req.file`. */
    interface File {
      fieldname: string
      originalname: string
      encoding: string
      mimetype: string
      size: number
      buffer: Buffer
    }

    interface StorageEngine {
      _handleFile(...args: unknown[]): void
      _removeFile(...args: unknown[]): void
    }

    interface Options {
      storage?: StorageEngine
      limits?: {
        fileSize?: number
        files?: number
      }
    }

    interface Multer {
      single(fieldName: string): RequestHandler
    }

    /** The error a limit raises, with `code` such as `LIMIT_FILE_SIZE`. */
    class MulterError extends Error {
      code: string
      field?: string
    }

    function memoryStorage(): StorageEngine
  }

  function multer(options?: multer.Options): multer.Multer

  export = multer
}
