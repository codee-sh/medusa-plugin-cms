/**
 * Picks the first of `<base>`, `<base>-2`, `<base>-3` that live documents do not hold.
 *
 * @param base - The value wanted, such as a slug built from a title.
 * @param taken - The values live documents hold among the base and its suffixed forms.
 * @returns The base when it is free, otherwise the first free suffixed form.
 */
export const findFreeValue = (base: string, taken: string[]): string => {
  let value = base

  for (let suffix = 2; taken.includes(value); suffix++) {
    value = `${base}-${suffix}`
  }

  return value
}
