import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { cancelRide, listRides } from "@/lib/rides.functions";
import { formatCurrency, formatDistance, formatDuration } from "@/lib/fares";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "My trips — Cab" },
      { name: "description", content: "See your requested and previous Cab trips." },
      { property: "og:title", content: "My trips — Cab" },
      { property: "og:description", content: "See your requested and previous Cab trips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const fetchRides = useServerFn(listRides);
  const cancel = useServerFn(cancelRide);
  const [rides, setRides] = useState<Tables<"rides">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRides()
      .then(setRides)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Trips couldn't load."))
      .finally(() => setLoading(false));
  }, [fetchRides]);

  async function cancelTrip(id: string) {
    try {
      await cancel({ data: { id } });
      setRides((current) =>
        current.map((ride) => (ride.id === id ? { ...ride, status: "cancelled" } : ride)),
      );
      toast.success("Trip cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trip couldn't be cancelled.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Your activity</p>
        <h1 className="text-display mt-2 text-5xl text-foreground">My trips</h1>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : rides.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center">
            <MapPin className="mx-auto size-8 text-primary" />
            <h2 className="text-display mt-3 text-2xl text-foreground">No trips yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your requested rides will appear here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {rides.map((ride) => (
              <article key={ride.id} className="rounded-lg border border-border bg-card p-5 shadow-panel">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-3">
                      <div className="mt-1 flex flex-col items-center">
                        <span className="size-2.5 rounded-full bg-primary" />
                        <span className="my-1 h-7 w-px bg-border" />
                        <span className="size-2.5 rounded-full bg-foreground" />
                      </div>
                      <div className="min-w-0 space-y-4 text-sm">
                        <p className="truncate text-card-foreground">{ride.origin_label}</p>
                        <p className="truncate text-card-foreground">{ride.destination_label}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{new Date(ride.created_at).toLocaleDateString()}</span>
                      <span>{formatDistance(ride.distance_meters)}</span>
                      <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{formatDuration(ride.duration_seconds)}</span>
                      <span className="capitalize">{ride.ride_class}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-display text-3xl text-card-foreground">{formatCurrency(ride.fare_estimate)}</p>
                    <p className={ride.status === "cancelled" ? "mt-1 text-xs text-muted-foreground" : "mt-1 text-xs text-primary"}>
                      {ride.status === "cancelled" ? "Cancelled" : "Requested"}
                    </p>
                    {ride.status === "requested" ? (
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => void cancelTrip(ride.id)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}