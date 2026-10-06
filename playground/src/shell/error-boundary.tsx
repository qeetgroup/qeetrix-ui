import { Alert, AlertDescription, AlertTitle } from "@qeetrix/ui";
import { TriangleAlertIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Keeps one broken example from taking the page down. The error is still logged, so the smoke
 * script (`playground/scripts/smoke.ts`) and the browser console both see it.
 */
export class ExampleBoundary extends Component<
  { label: string; children: ReactNode; resetKey?: unknown },
  { error: Error | null; resetKey?: unknown }
> {
  state: { error: Error | null; resetKey?: unknown } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(
    props: { resetKey?: unknown },
    state: { error: Error | null; resetKey?: unknown },
  ) {
    // A new configuration gets a fresh attempt instead of the previous error.
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[playground] ${this.props.label} failed to render:`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>{this.props.label} failed to render</AlertTitle>
        <AlertDescription>
          <code className="font-mono text-xs">{this.state.error.message}</code>
        </AlertDescription>
      </Alert>
    );
  }
}
