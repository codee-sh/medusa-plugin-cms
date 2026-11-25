import { Component, type ReactNode } from "react"

type ExtensionErrorBoundaryProps = {
  /** The name of the host's extension, for the logged error. */
  source?: string
  /** What shows in place of the extension once it threw. */
  fallback: ReactNode
  children: ReactNode
}

type ExtensionErrorBoundaryState = {
  failed: boolean
}

/**
 * Keeps a host's extension that throws while it renders - an options hook, a component of one field or
 * of several - inside the part of the form it draws: that part shows its fallback and the rest of the
 * form stays as it was. A class, as React catches a render error in no other way.
 */
export class ExtensionErrorBoundary extends Component<
  ExtensionErrorBoundaryProps,
  ExtensionErrorBoundaryState
> {
  state: ExtensionErrorBoundaryState = { failed: false }

  /**
   * Turns a thrown error into the failed state.
   *
   * @returns The failed state.
   */
  static getDerivedStateFromError(): ExtensionErrorBoundaryState {
    return { failed: true }
  }

  /**
   * Logs the error once, with the extension it came from.
   *
   * @param error - What the extension threw.
   */
  componentDidCatch(error: unknown): void {
    console.error(
      `The extension "${this.props.source}" threw while rendering`,
      error
    )
  }

  /**
   * Renders the extension, or its fallback once it threw.
   *
   * @returns The children or the fallback.
   */
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
