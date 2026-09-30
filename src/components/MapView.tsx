import { useEffect, useRef, useState } from "react";
import { decodePolyline } from "@/lib/polyline";

type LatLng = { lat: number; lng: number };

type MapViewProps = {
  origin: LatLng | null;
  destination: LatLng | null;
  polyline: string | null;
};

declare global {
  interface Window {
    __cabInitMap?: () => void;
  }
}

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1b1b1b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d0d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2b2b2b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a2222" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
];

let loaderPromise: Promise<void> | null = null;

function loadMapsApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
    | string
    | undefined;
  if (!key) return Promise.reject(new Error("Maps key missing"));

  loaderPromise = new Promise<void>((resolve, reject) => {
    window.__cabInitMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__cabInitMap${
      channel ? `&channel=${channel}` : ""
    }`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export default function MapView({ origin, destination, polyline }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMapsApi()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const maps = window.google?.maps;
        if (!maps) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: origin ?? { lat: 12.9716, lng: 77.5946 },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: MAP_STYLE,
        });
        setMapReady(true);
      })
      .catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    lineRef.current?.setMap(null);
    lineRef.current = null;

    const bounds = new maps.LatLngBounds();
    const addMarker = (position: LatLng, label: string, color: string) => {
      const marker = new maps.Marker({
        position,
        map,
        label: { text: label, color: "#ffffff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#000000",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
      bounds.extend(position);
    };

    if (origin) addMarker(origin, "A", "#e50914");
    if (destination) addMarker(destination, "B", "#ffffff");

    if (polyline) {
      const path = decodePolyline(polyline);
      lineRef.current = new maps.Polyline({
        path,
        map,
        strokeColor: "#e50914",
        strokeOpacity: 0.95,
        strokeWeight: 5,
      });
      path.forEach((p) => bounds.extend(p));
    }

    if (origin || destination) {
      if (origin && destination) {
        map.fitBounds(bounds, 64);
      } else {
        const point = origin ?? destination;
        if (point) map.setCenter(point);
        map.setZoom(14);
      }
    }
  }, [origin, destination, polyline, mapReady]);

  return <div ref={containerRef} className="h-full w-full" />;
}
