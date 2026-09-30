import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CarFront, Clock3, Route as RouteIcon, Users } from "lucide-react";
import MapView from "@/components/MapView";
import { AppHeader } from "@/components/AppHeader";
import { PlaceField } from "@/components/PlaceField";
import { Button } from "@/components/ui/button";
import { computeRoute, type PlaceDetail, type RouteEstimate } from "@/lib/maps.functions";
import { createRide } from "@/lib/rides.functions";
import {
  RIDE_CLASSES,
  estimateFare,
  formatCurrency,
  formatDistance,
  formatDuration,
  type RideClass,
} from "@/lib/fares";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ride")({
  head: () => ({
    meta: [
      { title: "Book a ride — Cab" },
      { name: "description", content: "Choose your pickup and destination to see the route and fare." },
      { property: "og:title", content: "Book a ride — Cab" },
      { property: "og:description", content: "Choose your pickup and destination to see the route and fare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RidePage,
});

function RidePage() {
  const navigate = useNavigate();
  const calculateRoute = useServerFn(computeRoute);
  const saveRide = useServerFn(createRide);
  const [origin, setOrigin] = useState<PlaceDetail | null>(null);
  const [destination, setDestination] = useState<PlaceDetail | null>(null);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [rideClass, setRideClass] = useState<RideClass>("go");
  const [busy, setBusy] = useState(false);

  const selectedClass = RIDE_CLASSES.find((option) => option.id === rideClass) ?? RIDE_CLASSES[0];
  const fare = estimate && selectedClass
    ? estimateFare(estimate.distanceMeters, estimate.durationSeconds, selectedClass.multiplier)
    : null;

  async function showRoute() {
    if (!origin || !destination) {
      toast.error("Choose both pickup and destination.");
      return;
    }
    setBusy(true);
    try {
      const result = await calculateRoute({
        data: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
        },
      });
      setEstimate(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't find that route.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRide() {
    if (!origin || !destination || !estimate || fare == null) return;
    setBusy(true);
    try {
      await saveRide({
        data: {
          originLabel: origin.label,
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLabel: destination.label,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
          distanceMeters: estimate.distanceMeters,
          durationSeconds: estimate.durationSeconds,
          rideClass,
          fareEstimate: fare,
        },
      });
      toast.success("Ride requested. Your trip is saved.");
      navigate({ to: "/trips" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't request your ride.");
    } finally {
      setBusy(false);
    }
  }

  function updateOrigin(place: PlaceDetail | null) {
    setOrigin(place);
    setEstimate(null);
  }

  function updateDestination(place: PlaceDetail | null) {
    setDestination(place);
    setEstimate(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="z-10 border-b border-border bg-background p-5 lg:border-b-0 lg:border-r lg:p-7">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Where to?</p>
          <h1 className="text-display mt-2 text-4xl text-foreground">Book your Cab</h1>

          <div className="mt-6 space-y-4">
            <PlaceField
              id="pickup"
              label="From"
              placeholder="Enter pickup location"
              dotClassName="bg-primary"
              value={origin}
              onChange={updateOrigin}
            />
            <PlaceField
              id="destination"
              label="To"
              placeholder="Enter destination"
              dotClassName="bg-foreground"
              value={destination}
              onChange={updateDestination}
            />
            <Button className="w-full" disabled={busy || !origin || !destination} onClick={() => void showRoute()}>
              <RouteIcon /> {busy && !estimate ? "Finding route…" : "See route & fare"}
            </Button>
          </div>

          {estimate ? (
            <div className="mt-7 border-t border-border pt-6">
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><RouteIcon className="size-4 text-primary" />{formatDistance(estimate.distanceMeters)}</span>
                <span className="flex items-center gap-2"><Clock3 className="size-4 text-primary" />{formatDuration(estimate.durationSeconds)}</span>
              </div>

              <h2 className="text-display mt-7 text-2xl text-foreground">Choose your ride</h2>
              <div className="mt-3 space-y-2">
                {RIDE_CLASSES.map((option) => {
                  const optionFare = estimateFare(
                    estimate.distanceMeters,
                    estimate.durationSeconds,
                    option.multiplier,
                  );
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRideClass(option.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                        rideClass === option.id
                          ? "border-primary bg-accent"
                          : "border-border bg-card hover:bg-secondary",
                      )}
                    >
                      <CarFront className="size-7 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-card-foreground">{option.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{option.blurb}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold text-card-foreground">{formatCurrency(optionFare)}</span>
                        <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Users className="size-3" />{option.seats}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-md border border-primary/40 bg-accent p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Estimated fare</p>
                    <p className="text-display mt-1 text-4xl text-foreground">{fare == null ? "—" : formatCurrency(fare)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Pay after ride</span>
                </div>
              </div>

              <Button className="mt-4 w-full shadow-ember" size="lg" disabled={busy} onClick={() => void confirmRide()}>
                {busy ? "Requesting…" : "Confirm Cab"}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="relative h-[54vh] min-h-[420px] lg:h-[calc(100vh-3.5rem)]">
          <MapView
            origin={origin ? { lat: origin.lat, lng: origin.lng } : null}
            destination={destination ? { lat: destination.lat, lng: destination.lng } : null}
            polyline={estimate?.polyline ?? null}
          />
          {!origin && !destination ? (
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md border border-border bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow-panel backdrop-blur">
              Your route will appear here
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}