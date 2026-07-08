/**
 * The landing owns its <main> landmark here in the layout — outside the route's
 * loading Suspense boundary — so the boundary streams only the panel content and
 * the page never ends up with a duplicated <main>/#main copy in the DOM. Mirrors
 * how the (app) group keeps its <main> in the layout, not the page.
 */
export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col bg-shell lg:grid lg:place-items-center lg:p-6"
    >
      {children}
    </main>
  );
}
