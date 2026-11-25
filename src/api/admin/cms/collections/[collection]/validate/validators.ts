import { z } from "@medusajs/framework/zod"

export const AdminValidateCmsDocumentParams = z.object({
  id: z.string().min(1).optional(),
})

export type AdminValidateCmsDocumentParamsType = z.infer<
  typeof AdminValidateCmsDocumentParams
>
