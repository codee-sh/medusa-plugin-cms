import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Config } from "../../lib/config/types"
import { CmsVersion, type CmsVersionChangeType } from "./models"

type CmsModuleOptions = {
  config?: Config
}

/** A new version of a document; its number and `latest` are the service's to set. */
export type CreateCmsVersionInput = {
  /** The collection's slug. */
  collection: string
  document_id: string
  /** The whole document as a write body. */
  snapshot: Record<string, unknown>
  status: "draft" | "published"
  /** The fields whose value differs from the previous version. */
  changed_fields: string[]
  /** What made the version, for the history. */
  change_type: CmsVersionChangeType
  /** With a `restore`, the number of the version brought back. */
  restored_from?: number | null
  /** The admin user who saved it. */
  created_by?: string | null
}

/**
 * Holds the config the project passes to the plugin, and the versions of its documents.
 */
export default class CmsModuleService extends MedusaService({ CmsVersion }) {
  protected readonly config_?: Config

  /**
   * Keeps the plugin options.
   *
   * @param _dependencies - The module's container, passed on to the generated methods.
   * @param options - The plugin options.
   */
  constructor(
    _dependencies: Record<string, unknown>,
    options?: CmsModuleOptions
  ) {
    super(...arguments)
    this.config_ = options?.config
  }

  /**
   * Returns the project's CMS config.
   *
   * @returns The config, or `undefined` when the plugin was registered without one.
   */
  // eslint-disable-next-line @medusajs/service-methods-must-be-async -- an in-memory read the registry makes synchronously on every request
  getConfig(): Config | undefined {
    return this.config_
  }

  /**
   * Records a new version of a document as its latest, in one transaction of the module.
   *
   * It takes `latest` from the document's current version and numbers the new one after the highest
   * number the document has used, deleted versions included: a version made latest again moves the
   * flag back, and a number is never given twice. Two calls at once for one document pass the same
   * read, and the unique indexes on `latest` and on the number refuse the second.
   *
   * @param input - The version to record.
   * @param sharedContext - The context the caller runs in.
   * @returns The new version.
   */
  @InjectManager()
  async createCmsVersion(
    input: CreateCmsVersionInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.createCmsVersion_(input, sharedContext)
  }

  /**
   * Takes `latest` from the document's current version and records the new one, in one transaction.
   *
   * @param input - The version to record.
   * @param sharedContext - The transaction it runs in, opened here when the caller passes none.
   * @returns The new version.
   */
  @InjectTransactionManager()
  protected async createCmsVersion_(
    input: CreateCmsVersionInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const document = {
      collection: input.collection,
      document_id: input.document_id,
    }
    const [highest] = await this.listCmsVersions(
      document,
      {
        select: ["version"],
        order: { version: "DESC" },
        take: 1,
        withDeleted: true,
      },
      sharedContext
    )

    await this.updateCmsVersions(
      { selector: { ...document, latest: true }, data: { latest: false } },
      sharedContext
    )
    // MikroORM writes inserts before updates when the transaction flushes, which would put two latest
    // versions in the unique index; flushing here writes the old one's update first.
    await (
      sharedContext.transactionManager as { flush: () => Promise<void> }
    ).flush()

    return await this.createCmsVersions(
      { ...input, version: (highest?.version ?? 0) + 1, latest: true },
      sharedContext
    )
  }
}
