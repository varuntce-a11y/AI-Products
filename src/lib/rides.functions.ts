import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rideInput = z.object({
  originLabel: z.string().min(1).max(300),
  originLat: z.number(),
  originLng: z.number(),
  destinationLabel: z.string().min(1).max(300),
  destinationLat: z.number(),
  destinationLng: z.number(),
  distanceMeters: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
  rideClass: z.string().min(1).max(40),
  fareEstimate: z.number().nonnegative(),
});

export const createRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rideInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("rides")
      .insert({
        user_id: context.userId,
        origin_label: data.originLabel,
        origin_lat: data.originLat,
        origin_lng: data.originLng,
        destination_label: data.destinationLabel,
        destination_lat: data.destinationLat,
        destination_lng: data.destinationLng,
        distance_meters: data.distanceMeters,
        duration_seconds: data.durationSeconds,
        ride_class: data.rideClass,
        fare_estimate: data.fareEstimate,
        status: "requested",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rides")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const cancelRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rides")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().max(120).optional(),
        phone: z.string().max(30).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      full_name: data.fullName ?? null,
      phone: data.phone ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
