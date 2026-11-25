import { z } from "@medusajs/framework/zod"
import { CMS_DOCUMENTS_PAGE_SIZE } from "./query-config"

export const AdminGetCmsDocumentsParams = z.object({
  /** One document's id or several: a relation's targets, read by the page that shows their titles. */
  id: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional()
    .transform((value) =>
      value === undefined || Array.isArray(value) ? value : [value]
    ),
  q: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  order: z.string().optional(),
  limit: z.coerce.number().int().min(1).default(CMS_DOCUMENTS_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * The list's query as validated: its own parameters, and `filters` as the collection's schema from
 * `prepareAdminListFilters` reads them - every value a list, a boolean a boolean.
 */
export type AdminGetCmsDocumentsParamsType = z.infer<
  typeof AdminGetCmsDocumentsParams
> & {
  filters?: Record<string, string[] | boolean>
}
