export type RideClass = "go" | "premier" | "xl";

export const RIDE_CLASSES: Array<{
  id: RideClass;
  name: string;
  blurb: string;
  seats: number;
  multiplier: number;
}> = [
  { id: "go", name: "Cab Go", blurb: "Everyday rides, best price", seats: 4, multiplier: 1 },
  { id: "premier", name: "Cab Premier", blurb: "Top-rated drivers, sedans", seats: 4, multiplier: 1.35 },
  { id: "xl", name: "Cab XL", blurb: "Extra room for groups", seats: 6, multiplier: 1.7 },
];

const BASE_FARE = 45;
const PER_KM = 13;
const PER_MIN = 1.8;

export function estimateFare(
  distanceMeters: number,
  durationSeconds: number,
  multiplier: number,
): number {
  const km = distanceMeters / 1000;
  const minutes = durationSeconds / 60;
  const fare = (BASE_FARE + km * PER_KM + minutes * PER_MIN) * multiplier;
  return Math.round(fare);
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}
