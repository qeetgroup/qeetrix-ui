import { lazy, Suspense } from "react";

const views = {
  "qeet-id-users": lazy(() =>
    import("./qeet-id-users").then((m) => ({ default: m.QeetIdUsersPattern })),
  ),
  "qeet-pay-invoices": lazy(() =>
    import("./qeet-pay-invoices").then((m) => ({ default: m.QeetPayInvoicesPattern })),
  ),
  security: lazy(() => import("./security").then((m) => ({ default: m.SecurityPattern }))),
  "sign-in": lazy(() => import("./sign-in").then((m) => ({ default: m.SignInPattern }))),
} as const;

/** A pattern, as rendered inside its frame (`#/frame/pattern/<id>`). */
export function PatternView({ id }: { id: string }) {
  const View = views[id as keyof typeof views];
  if (!View) return <p className="p-8 text-sm">Unknown pattern “{id}”.</p>;
  return (
    <Suspense fallback={null}>
      <View />
    </Suspense>
  );
}
