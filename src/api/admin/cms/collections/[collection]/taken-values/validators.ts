import { z } from "@medusajs/framework/zod"

export const AdminGetCmsTakenValueParams = z.object({
  column: z.string().min(1),
  value: z.string().min(1),
  id: z.string().min(1).optional(),
})

export type AdminGetCmsTakenValueParamsType = z.infer<
  typeof AdminGetCmsTakenValueParams
>
