import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders(extra: Record<string, string> = {}) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error("Maps service is not configured.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function readError(response: Response): Promise<never> {
  const body = await response.text();
  console.error(`Google Maps gateway failed [${response.status}]: ${body}`);
  if (response.status === 403) {
    throw new Error("Maps request was denied (403). Check the Google Maps key restrictions.");
  }
  throw new Error(`Maps request failed [${response.status}]: ${body}`);
}

export type PlaceSuggestion = { placeId: string; label: string };

export const autocompletePlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        input: z.string().min(2).max(120),
        sessionToken: z.string().min(8).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const response = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: gatewayHeaders({
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      }),
      body: JSON.stringify({ input: data.input, sessionToken: data.sessionToken }),
    });
    if (!response.ok) await readError(response);
    const json = (await response.json()) as {
      suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }>;
    };
    return (json.suggestions ?? [])
      .map((s) => ({
        placeId: s.placePrediction?.placeId ?? "",
        label: s.placePrediction?.text?.text ?? "",
      }))
      .filter((s) => s.placeId && s.label)
      .slice(0, 5);
  });

export type PlaceDetail = { placeId: string; label: string; lat: number; lng: number };

export const getPlaceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3).max(300),
        sessionToken: z.string().min(8).max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PlaceDetail> => {
    const query = data.sessionToken ? `?sessionToken=${encodeURIComponent(data.sessionToken)}` : "";
    const response = await fetch(
      `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(data.placeId)}${query}`,
      {
        method: "GET",
        headers: gatewayHeaders({
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
        }),
      },
    );
    if (!response.ok) await readError(response);
    const json = (await response.json()) as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    };
    if (json.location?.latitude == null || json.location?.longitude == null) {
      throw new Error("That place has no location information.");
    }
    return {
      placeId: json.id ?? data.placeId,
      label: json.formattedAddress ?? json.displayName?.text ?? "Selected place",
      lat: json.location.latitude,
      lng: json.location.longitude,
    };
  });

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
};

export const computeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        origin: z.object({ lat: z.number(), lng: z.number() }),
        destination: z.object({ lat: z.number(), lng: z.number() }),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<RouteEstimate> => {
    const response = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: gatewayHeaders({
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      }),
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } },
        destination: {
          location: { latLng: { latitude: data.destination.lat, longitude: data.destination.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!response.ok) await readError(response);
    const json = (await response.json()) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
      }>;
    };
    const route = json.routes?.[0];
    if (!route) throw new Error("No driving route found between those two places.");
    return {
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds: Number.parseInt(route.duration?.replace("s", "") ?? "0", 10),
      polyline: route.polyline?.encodedPolyline ?? "",
    };
  });
