"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export default function EventMap({ latitude, longitude, locationLabel, height = 260 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    // Reset any previous Leaflet instance bound to this container.
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    container.innerHTML = "";
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const map = L.map(container).setView([latitude, longitude], 15);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.circleMarker([latitude, longitude], {
      radius: 10,
      color: "#7c5fd4",
    }).addTo(map);

    if (locationLabel) {
      marker.bindPopup(locationLabel);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (containerRef.current?._leaflet_id) {
        delete containerRef.current._leaflet_id;
      }
    };
  }, [latitude, longitude, locationLabel]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, borderRadius: "0.75rem" }}
    />
  );
}

