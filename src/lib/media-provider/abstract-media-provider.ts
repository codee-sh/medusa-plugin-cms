import type { MedusaContainer } from "@medusajs/framework/types"
import type {
  CmsMedia,
  CmsMediaList,
  CmsMediaListQuery,
  CmsMediaUpload,
  CmsMediaStore,
} from "./types"

/**
 * The base of every media provider: how the CMS reaches the source its media records come from. The
 * CMS decides when to read, upload, delete or search, from the steps of its workflows, and checks,
 * places and limits what comes back; a provider only talks to its source and answers records in the
 * CMS's shape. Where a file is stored is not its concern either - for the plugin's `FileMediaProvider`
 * that is Medusa's File Module and its file provider.
 *
 * A provider usually reaches another module: the File Module, or the module of another plugin or of
 * the project. Modules are isolated, so a provider cannot live in a module's container the way
 * Medusa's own module providers do. The CMS creates it in each step that calls it instead, with that
 * step's container, and the provider resolves what it needs from `this.container` as the step would.
 *
 * A subclass sets `identifier` and `stores`, implements the abstract members, and adds `list` when its
 * records can be searched. The config names the class.
 *
 * @example
 * // In a project with a plugin of its own media library, registered as the `asset` module.
 * export class AssetMediaProvider extends AbstractCmsMediaProvider {
 *   static identifier = "asset"
 *   static stores: CmsMediaStore[] = ["id"]
 *
 *   async retrieve(values: string[]): Promise<CmsMedia[]> {
 *     const assetModule = this.container.resolve<AssetModuleService>("asset")
 *     // read the assets and answer each as `{ id, url, ... }`
 *   }
 *   // upload, delete, maxFileSize, and list to be searchable
 * }
 */
export abstract class AbstractCmsMediaProvider<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> {
  /** A name for logs and errors. */
  static identifier: string

  /** What a media field may hold for this provider: what `retrieve` reads back. */
  static stores: CmsMediaStore[]

  protected readonly container: MedusaContainer
  protected readonly options: TOptions

  /**
   * Checks the options the config passes, before any instance is created. Accepts anything by default.
   *
   * @param _options - The config's `media.provider.options`.
   * @throws When the options are wrong.
   */
  static validateOptions(_options: Record<string, unknown>): void {}

  /**
   * Keeps the step's container and the config's options.
   *
   * @param container - The container of the step that creates the instance.
   * @param options - The config's `media.provider.options`.
   */
  constructor(container: MedusaContainer, options: TOptions) {
    this.container = container
    this.options = options
  }

  /** The largest file `upload` takes, in bytes; the upload route and the Admin ask for it too. */
  abstract get maxFileSize(): number

  /**
   * The MIME types `upload` takes, exact or `type/*`; the CMS refuses any other before calling `upload`.
   * Any type when left `undefined`, the default.
   *
   * @returns The types, or `undefined` for any.
   */
  get mimeTypes(): string[] | undefined {
    return undefined
  }

  /**
   * Reads the records of stored values.
   *
   * @param values - The values media fields hold.
   * @param by - Whether the values are ids or URLs, as the fields' `stores` says.
   * @returns The records found, in any order, without the values it found nothing for.
   */
  abstract retrieve(values: string[], by: CmsMediaStore): Promise<CmsMedia[]>

  /**
   * Stores a file.
   *
   * @param file - The file the Admin uploaded.
   * @returns Its record.
   */
  abstract upload(file: CmsMediaUpload): Promise<CmsMedia>

  /**
   * Removes what `upload` stored. The CMS calls it only to undo an upload whose workflow failed.
   *
   * @param media - The record `upload` answered.
   */
  abstract delete(media: CmsMedia): Promise<void>

  /**
   * Searches the records. A provider without it cannot be searched, and the Admin offers upload only.
   *
   * @param query - The search text, MIME types and page; a MIME type may be a `type/*`, which matches
   * every subtype.
   * @returns The page of records and how many match.
   */
  list?(query: CmsMediaListQuery): Promise<CmsMediaList>
}
