import { z } from "@medusajs/framework/zod"

/** The body of a publish, a restore or a discard: the version the editor's form showed. */
export const AdminCmsDocumentBaseVersion = z.object({
  base_version: z.number().int().nullable().optional(),
})

export type AdminCmsDocumentBaseVersionType = z.infer<
  typeof AdminCmsDocumentBaseVersion
>

export const AdminGetCmsDocumentVersionsParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AdminGetCmsDocumentVersionsParamsType = z.infer<
  typeof AdminGetCmsDocumentVersionsParams
>
