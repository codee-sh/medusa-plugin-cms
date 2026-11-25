import type { ReactNode, RefCallback } from "react"

/** What the Admin hands an options hook. */
export type CmsOptionsHookInput = {
  /**
   * The stored value, so that the hook can fetch its label: a text for a field of one value, a list for a
   * field of several, `null` when empty.
   */
  value: string | string[] | null
}

/** What an options hook returns: the options and the state of fetching them. */
export type CmsOptionsHookResult = {
  options: { value: string; label: string }[]
  isPending: boolean
  isError: boolean
  /** With search: the text typed and its setter, as `useComboboxData` returns them. */
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  /** With pages: loads the next page, called when the list is scrolled to its end. */
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
}

/**
 * A React hook of the host's Admin that gives a field its options, from any source it reads. The
 * result of the dashboard's `useComboboxData` fits it as it is.
 */
export type CmsOptionsHook = (
  input: CmsOptionsHookInput
) => CmsOptionsHookResult

/**
 * What the Admin hands a field component: the values and configs of the fields it edits, each under its
 * key - the field's name, or the component's own key a layout node maps to it - nothing else of the form.
 * `TKey` names the keys the component reads, so a typo fails the typecheck.
 */
export type CmsFieldComponentProps<TKey extends string = string> = {
  /** Each field's stored value, as its type holds it: a text, a list of texts, a number... */
  values: Record<TKey, unknown>
  /** Writes one of its fields; a save checks the value by that field's type. */
  onChange: (key: TKey, value: unknown) => void
  onBlur: (key: TKey) => void
  /** Each field's config. */
  fields: Record<
    TKey,
    {
      label: string
      /** When the field must be filled: at every save, or at a publish; left out for an optional field. */
      required?: "always" | "publish"
      options?: { value: string; label: string }[]
      multiple?: boolean
      max?: number
    }
  >
  /** Each field's error message; the CMS also draws it around a node of one field. */
  errors: Record<TKey, string | undefined>
  /**
   * Spread on each field's main input: the label, the hint and the error point at it, and a failed save
   * focuses it.
   */
  inputProps: Record<
    TKey,
    {
      id?: string
      /** The field's name in the form. */
      name: string
      "aria-describedby"?: string
      "aria-invalid"?: boolean
      ref: RefCallback<HTMLElement>
    }
  >
  disabled: boolean
}

/**
 * A React component of the host's Admin that edits one field or several, attached by a layout node: for
 * one field the CMS draws its label, description and error around it, for several the component draws
 * every input, label and error of its fields itself.
 */
export type CmsFieldComponent<TKey extends string = string> = (
  props: CmsFieldComponentProps<TKey>
) => ReactNode

/**
 * A field component loaded when a form first shows its layout node: `load` resolves to a module with
 * the component as its default export, as `React.lazy` takes it.
 */
export type CmsFieldComponentLoader = {
  load: () => Promise<{ default: AnyCmsFieldComponent }>
}

/**
 * A field component of any keys, as the registry holds it: a component typed for its own keys, such as
 * `CmsFieldComponent<"product_id">`, fits no narrower type, as its props are read where it is called.
 */
export type AnyCmsFieldComponent = CmsFieldComponent<any>

/** The document as a component reads it, shaped for components rather than as the form holds it. */
export type CmsDocumentValue = {
  /** The document's own fields the form holds, by name. */
  fields: Record<string, unknown>
  /** Each area's blocks, in order. */
  areas: Record<string, CmsBlockValue[]>
}

/** A block of the document as a component reads it. */
export type CmsBlockValue = {
  /** The block type's slug. */
  type: string
  /** The fields its type lists, by name. */
  fields: Record<string, unknown>
  /** The block's areas, each under its name with its blocks in order. */
  areas: Record<string, CmsBlockValue[]>
}

/** One level of a block's place in the document: an area, and the block's index in it. */
export type CmsBlockPlace = {
  area: string
  index: number
}

/** What the plugin's Admin provides of a document form, for `useDocumentValue`. */
export type CmsDocumentSource = {
  /** Calls `onChange` on every change of the form's values; returns what stops it. */
  subscribe: (onChange: () => void) => () => void
  /** The form's values now, as a component reads them. */
  getDocument: () => CmsDocumentValue
}

/** What a widget in `cms.route.details` or `cms.route.details.side` gets as its `data`. */
export type CmsRouteWidgetData = {
  /** The route; every route's page shares the zones, so a widget checks `slug`. */
  route: { slug: string; label: string }
  /** The collections the page shows, in its order. */
  collections: {
    slug: string
    labels: { singular: string; plural: string }
    singleton: boolean
    /** A singleton's document's columns, `null` before its first save; none for a list. */
    document?: { id: string; [column: string]: unknown } | null
  }[]
}

/** What a widget in `cms.document.details` or `cms.document.details.side` gets as its `data`. */
export type CmsDocumentWidgetData = {
  /** The document's collection; every document's page shares the zones, so a widget checks `slug`. */
  collection: { slug: string; labels: { singular: string; plural: string } }
  /** The document's columns, as its page read them: its row, what is published. */
  document: { id: string; [column: string]: unknown }
}
