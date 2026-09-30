import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cab — Book a ride in seconds" },
      {
        name: "description",
        content:
          "Set your pickup and drop, see the live route on the map, and get an upfront fare before you ride.",
      },
      { property: "og:title", content: "Cab — Book a ride in seconds" },
      {
        property: "og:description",
        content: "Pickup, drop, route and upfront fare. Cab gets you moving.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { title: "Create your account", body: "Sign up with email or continue with Google in one tap." },
  { title: "Set pickup and drop", body: "Search any address — we autocomplete as you type." },
  { title: "See route and fare", body: "Live driving route, distance, time and an upfront price." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/ride">Book a ride</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <img
          src="/images/hero-night.jpg"
          alt="City street at night seen from inside a car"
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover opacity-70"
        />
        <div className="absolute inset-0 overlay-fade" />
        <div className="relative mx-auto flex min-h-[86vh] max-w-6xl flex-col justify-end px-5 pb-16 pt-32">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-primary">
            Ride sharing, reimagined
          </p>
          <h1 className="text-display max-w-3xl text-6xl text-foreground sm:text-8xl">
            Your city. Your ride. On demand.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Tell Cab where you are and where you're going. You get the route, the time and the
            price before you tap confirm.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-ember">
              <Link to={signedIn ? "/ride" : "/auth"}>
                {signedIn ? "Book a ride" : "Get started"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/trips">My trips</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-display text-4xl text-foreground">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-lg border border-border bg-card p-6 shadow-panel"
            >
              <span className="text-display text-5xl text-primary">{`0${index + 1}`}</span>
              <h3 className="mt-3 text-xl text-card-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Cab. Fares shown are estimates.
        </div>
      </footer>
    </div>
  );
}
