import type { RegistryArea } from "../area/types"
import type {
  ClientText,
  LayoutBlockSectionConfig,
  Labels,
} from "../config/types"
import type { PreparedFields } from "../field/types"

/** A block type, written through the generated methods of `key`. */
export type RegistryBlock<TText = ClientText> = PreparedFields<TText> & {
  key: string
  /** The `block_type` of its blocks. */
  slug: string
  /** The prefix of the model's ids, unique across every registered model. */
  idPrefix: string
  labels: Labels<TText>
  /** The area model's `hasMany` to the block type, which a read follows. */
  relation: string
  /** The areas inside the block, whose items are blocks; each stored as an area row under the block. */
  areas: RegistryArea<TText>[]
  admin: {
    /** The card's sections, as the config lists them. */
    sections: LayoutBlockSectionConfig<TText>[]
  }
}

/**
 * What the Admin is told about a block type: what its card shows and checks. The server answers its
 * texts as `ClientText`; a screen reads them as strings, which is the default.
 */
export type ClientBlock<TText = string> = Pick<
  RegistryBlock<TText>,
  "slug" | "idPrefix" | "labels" | "fields" | "areas" | "admin"
>
