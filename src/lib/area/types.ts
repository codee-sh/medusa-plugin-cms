import type { AreaConfig, ClientText } from "../config/types"

/** The model that ties a document's areas to their blocks, written through the generated methods of `key`. */
export type RegistryAreaModel = {
  key: string
  /** The prefix of the model's ids, unique across every registered model. */
  idPrefix: string
}

/** An area of a collection: a named, ordered list of blocks of the types it allows. */
export type RegistryArea<TText = ClientText> = AreaConfig<TText> & {
  name: string
}

/** How a collection's documents reach their areas: through their `areas`, and back by the owner column. */
export type RegistryAreaLink = {
  /** The area model's column holding the document's id. */
  ownerColumn: string
}
