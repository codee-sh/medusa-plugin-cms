import { Plus } from "@medusajs/icons"
import { Button, DropdownMenu, Text } from "@medusajs/ui"
import {
  type Control,
  type FieldValues,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form"
import { useManagerFormFieldsTranslation } from "../hooks/use-manager-form-fields-translation"
import { BlockCard } from "./block-card"
import { OwnError } from "./own-error"
import type {
  BlocksFieldRenderBlock,
  BlocksFieldType,
  BlocksFormValues,
} from "./types"

export type BlocksFieldProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path of the list. */
  name: string
  /** Shown above the items when given. */
  label?: string
  /** The types an item may have, in the order **Add block** offers them. */
  types: BlocksFieldType[]
  /** The label of an item's type the list does not offer; the type's value when left out. */
  labelOf?: (slug: string) => string
  /** The values a new item of a type starts from, besides its `block_type`. */
  newItem: (type: BlocksFieldType) => Record<string, unknown>
  /** What draws an open card's content. Keep it stable, as each card re-renders when it changes. */
  renderBlock: BlocksFieldRenderBlock
}

/**
 * Returns a type's value as its label.
 *
 * @param slug - The type's value.
 * @returns The value.
 */
const labelBySlug = (slug: string): string => slug

/**
 * Edits a list of typed items in a form, as blocks: each item a `BlockCard` in order, which moves and
 * removes it, and **Add block**, which appends an item of a type the list offers with the values
 * `newItem` gives. With one type it adds that type at once; with more, it opens a menu of them.
 *
 * Each item holds its type under `block_type` and, once saved, its id under `id`. An error at the
 * list's path shows under the list, and one at an item's path in its card.
 *
 * @param props - The form, the list's path and label, the types, the label of a type not offered, the
 * new item's values, and what draws an item's content.
 */
export const BlocksField = <TValues extends FieldValues>({
  form,
  name,
  label,
  types,
  labelOf = labelBySlug,
  newItem,
  renderBlock,
}: BlocksFieldProps<TValues>) => {
  const { t } = useManagerFormFieldsTranslation()
  const { fields, append, move, remove } = useFieldArray({
    control: form.control as unknown as Control<BlocksFormValues>,
    name,
  })

  /**
   * Appends a new item of a type.
   *
   * @param type - The item's type.
   */
  const addBlock = (type: BlocksFieldType) =>
    append({ ...newItem(type), block_type: type.slug }, { shouldFocus: false })

  const addLabel = (
    <>
      <Plus />
      {t("blocks.add")}
    </>
  )

  return (
    <div className="flex flex-col gap-y-3">
      {label && (
        <Text size="small" leading="compact" weight="plus">
          {label}
        </Text>
      )}
      {fields.length ? (
        fields.map((field, index) => (
          <BlockCard
            key={field.id}
            form={form}
            name={name}
            index={index}
            count={fields.length}
            types={types}
            labelOf={labelOf}
            renderBlock={renderBlock}
            onMove={move}
            onRemove={remove}
          />
        ))
      ) : (
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("blocks.empty")}
        </Text>
      )}
      <OwnError form={form} path={name} />
      <div>
        {types.length === 1 ? (
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => addBlock(types[0])}
          >
            {addLabel}
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button size="small" variant="secondary" type="button">
                {addLabel}
              </Button>
            </DropdownMenu.Trigger>
            {/* Focus stays where it is: given back to the button, which the new item pushed down, it
                would scroll the page to the bottom of that item. */}
            <DropdownMenu.Content
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              {types.map((type) => (
                <DropdownMenu.Item
                  key={type.slug}
                  onClick={() => addBlock(type)}
                  className="[&_svg]:text-ui-fg-subtle flex items-center gap-x-2"
                >
                  <Plus />
                  <span>{type.label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
