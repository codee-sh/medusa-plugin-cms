import { z } from "@medusajs/framework/zod"
import { CMS_MEDIA_PAGE_SIZE } from "./query-config"

export const AdminGetCmsMediaParams = z.object({
  q: z.string().trim().min(1).optional(),
  /** One MIME type or several, exact or `type/*`, as a field's `admin.mimeTypes` sends them. */
  mime_type: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional()
    .transform((value) =>
      value === undefined || Array.isArray(value) ? value : [value]
    ),
  limit: z.coerce.number().int().min(1).max(100).default(CMS_MEDIA_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AdminGetCmsMediaParamsType = z.infer<typeof AdminGetCmsMediaParams>
