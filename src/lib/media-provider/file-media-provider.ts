import type { IFileModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { isMimeTypeList } from "./is-mime-type-list"
import { AbstractCmsMediaProvider } from "./abstract-media-provider"
import type {
  CmsMedia,
  CmsMediaUpload,
  CmsMediaStore,
  FileMediaProviderOptions,
} from "./types"

/** The largest upload when the options give no `maxFileSize`: 10 MB. */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * The plugin's media provider over Medusa's File Module, with no table of its own: a media field holds
 * the file's key, and a record is what the File Module answers, `{ id, url }`. It cannot be searched,
 * because the File Module lists files only by key.
 *
 * Its URLs are the file provider's: on S3, signed URLs that expire, as Medusa's own `retrieveFile`
 * answers them.
 */
export class FileMediaProvider extends AbstractCmsMediaProvider<FileMediaProviderOptions> {
  static identifier = "file"
  static stores: CmsMediaStore[] = ["id"]

  /**
   * Checks that `maxFileSize`, when given, is a positive number, and `mimeTypes` a list of MIME types.
   *
   * @param options - The config's `media.provider.options`.
   * @throws When `maxFileSize` is not a positive number, or `mimeTypes` is empty or holds anything but a
   * MIME type or a `type/*`.
   */
  static validateOptions(options: Record<string, unknown>): void {
    const { maxFileSize, mimeTypes } = options

    if (
      maxFileSize !== undefined &&
      (typeof maxFileSize !== "number" ||
        !Number.isFinite(maxFileSize) ||
        maxFileSize <= 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${FileMediaProvider.identifier} media provider: "maxFileSize" must be a positive number of bytes`
      )
    }

    if (mimeTypes !== undefined && !isMimeTypeList(mimeTypes)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${FileMediaProvider.identifier} media provider: "mimeTypes" must list MIME types, such as "image/png" or "image/*"`
      )
    }
  }

  /** The options' `maxFileSize`, or 10 MB. */
  get maxFileSize(): number {
    return this.options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  }

  /** The options' `mimeTypes`; any type when they give none. */
  get mimeTypes(): string[] | undefined {
    return this.options.mimeTypes
  }

  /**
   * Reads each file by its key. The File Module checks one key at a time, and a local file provider
   * throws for a missing file, so the keys are read apart and a missing one is left out; a provider
   * that does not check, such as S3, answers every key.
   *
   * Takes no `by`: the registry refuses a field that stores URLs with this provider.
   *
   * @param values - The file keys media fields hold.
   * @returns The files found.
   */
  async retrieve(values: string[]): Promise<CmsMedia[]> {
    const fileModule = this.container.resolve<IFileModuleService>(Modules.FILE)

    const files = await Promise.all(
      values.map(async (value) => {
        try {
          const { id, url } = await fileModule.retrieveFile(value)
          return { id, url }
        } catch (error) {
          // Told by Medusa's flag, as an error from another copy of its utils is no instance of this class.
          if (
            MedusaError.isMedusaError(error) &&
            error.type === MedusaError.Types.NOT_FOUND
          ) {
            return null
          }
          throw error
        }
      })
    )

    return files.filter((file): file is CmsMedia => file !== null)
  }

  /**
   * Stores a public file through the File Module, its content in base64 as Medusa's own upload route
   * sends it.
   *
   * @param file - The file the Admin uploaded.
   * @returns The File Module's key and URL, with the upload's name, type and size.
   */
  async upload(file: CmsMediaUpload): Promise<CmsMedia> {
    const fileModule = this.container.resolve<IFileModuleService>(Modules.FILE)

    const { id, url } = await fileModule.createFiles({
      filename: file.filename,
      mimeType: file.mimeType,
      content: file.content.toString("base64"),
      access: "public",
    })

    return {
      id,
      url,
      filename: file.filename,
      mime_type: file.mimeType,
      size: file.content.length,
    }
  }

  /**
   * Deletes a file through the File Module.
   *
   * @param media - The record `upload` answered.
   */
  async delete(media: CmsMedia): Promise<void> {
    const fileModule = this.container.resolve<IFileModuleService>(Modules.FILE)

    await fileModule.deleteFiles(media.id)
  }
}
