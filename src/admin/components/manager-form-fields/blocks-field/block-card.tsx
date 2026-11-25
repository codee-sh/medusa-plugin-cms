import { ActionMenu } from "@medusajs/dashboard/components"
import {
  ArrowDownMini,
  ArrowUpMini,
  Trash,
  TriangleDownMini,
  TriangleRightMini,
} from "@medusajs/icons"
import { IconButton, Text } from "@medusajs/ui"
import { memo, useEffect, useState } from "react"
import {
  type Control,
  type FieldValues,
  get,
  type UseFormReturn,
  useWatch,
} from "react-hook-form"
import { useManagerFormFieldsTranslation } from "../hooks/use-manager-form-fields-translation"
import { BlockSummary } from "./block-summary"
import { OwnError } from "./own-error"
import type {
  BlocksFieldRenderBlock,
  BlocksFieldType,
  BlocksFormValues,
} from "./types"

type BlockCardProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path of the list the item sits in. */
  name: string
  index: number
  /** How many items the list holds. */
  count: number
  types: BlocksFieldType[]
  /** The label of a type the list does not offer. */
  labelOf: (slug: string) => string
  renderBlock: BlocksFieldRenderBlock
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
}

/**
 * One item of a `BlocksField` as a collapsible card: its type and summary, its content from
 * `renderBlock` when open, and a menu to move or remove it. An item of a type the list does not offer
 * shows a note and can only be removed.
 *
 * The card opens by itself for an item not saved yet and whenever an error lands in it, and the editor
 * can close it again. The item's id comes from the form's values, not from the key `useFieldArray`
 * makes for React. It watches the item's id and type only, and listens to its errors without
 * re-rendering, so typing in a field re-renders that field, not the card, a refused save's
 * revalidation included.
 *
 * @param props - The form, the list's path, the item's index and the list's size, the types, the label
 * of a type not offered, what draws the content, and the callbacks that move and remove the item.
 */
const BlockCardBase = <TValues extends FieldValues>({
  form,
  name,
  index,
  count,
  types,
  labelOf,
  renderBlock,
  onMove,
  onRemove,
}: BlockCardProps<TValues>) => {
  const { t } = useManagerFormFieldsTranslation()
  const path = `${name}.${index}`
  const blocksForm = form as unknown as UseFormReturn<BlocksFormValues>
  const [id, blockType] = useWatch({
    control: blocksForm.control as Control<BlocksFormValues>,
    name: [`${path}.id`, `${path}.block_type`],
  }) as [string | undefined, string | undefined]
  const [open, setOpen] = useState(
    () => !id || blocksForm.getFieldState(path).invalid
  )
  const type = types.find(({ slug }) => slug === blockType)
  const label = type?.label ?? (blockType ? labelOf(blockType) : "")
  const isOpen = Boolean(type) && open

  useEffect(
    () =>
      blocksForm.subscribe({
        name: path,
        formState: { errors: true },
        callback: ({ errors }) => {
          if (get(errors, path)) {
            setOpen(true)
          }
        },
      }),
    [blocksForm, path]
  )

  return (
    <div className="shadow-elevation-card-rest bg-ui-bg-component rounded-md">
      <div className="flex items-center gap-x-2 px-3 py-2">
        <IconButton
          size="small"
          variant="transparent"
          type="button"
          disabled={!type}
          onClick={() => setOpen(!isOpen)}
        >
          {isOpen ? <TriangleDownMini /> : <TriangleRightMini />}
          <span className="sr-only">
            {isOpen ? t("blocks.hideFields") : t("blocks.showFields")}
          </span>
        </IconButton>
        <div className="flex min-w-0 flex-1 flex-col">
          <Text size="small" leading="compact" weight="plus">
            {label}
          </Text>
          {type?.summaryField && (
            <BlockSummary form={form} path={`${path}.${type.summaryField}`} />
          )}
        </div>
        <ActionMenu
          groups={[
            ...(type
              ? [
                  {
                    actions: [
                      {
                        icon: <ArrowUpMini />,
                        label: t("blocks.moveUp"),
                        disabled: index === 0,
                        onClick: () => onMove(index, index - 1),
                      },
                      {
                        icon: <ArrowDownMini />,
                        label: t("blocks.moveDown"),
                        disabled: index === count - 1,
                        onClick: () => onMove(index, index + 1),
                      },
                    ],
                  },
                ]
              : []),
            {
              actions: [
                {
                  icon: <Trash />,
                  label: t("actions.remove"),
                  onClick: () => onRemove(index),
                },
              ],
            },
          ]}
        />
      </div>
      {!type && (
        <Text
          size="small"
          leading="compact"
          className="text-ui-fg-subtle px-3 pb-3"
        >
          {t("blocks.notAllowed")}
        </Text>
      )}
      <OwnError form={form} path={path} className="px-3 pb-3" />
      {isOpen && type && (
        <div className="flex flex-col gap-y-4 border-t px-3 py-4">
          {renderBlock({ path, type, index })}
        </div>
      )}
    </div>
  )
}

// memo drops the props' type parameter, so the component keeps its own type.
export const BlockCard = memo(BlockCardBase) as typeof BlockCardBase
