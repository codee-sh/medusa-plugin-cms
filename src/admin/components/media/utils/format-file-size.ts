/** The units a size is written in, each 1024 times the one before. */
const SIZE_UNITS = ["B", "KB", "MB", "GB"]

/**
 * Formats a byte count as a size people read, in B, KB, MB or GB.
 *
 * @param bytes - The byte count.
 * @returns The size, e.g. `10 MB`.
 */
export const formatFileSize = (bytes: number): string => {
  const unitIndex = Math.min(
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)),
    SIZE_UNITS.length - 1
  )
  const value = bytes / 1024 ** unitIndex

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ${SIZE_UNITS[unitIndex]}`
}
