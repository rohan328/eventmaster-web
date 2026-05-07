import EventDetailClient from "./EventDetailClient";

function apiRoot() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? `${String(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "")}/api`
      : "http://localhost:8000/api")
  );
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const raw = sp?.id;
  const id =
    raw === undefined || raw === "" ? null : Array.isArray(raw) ? raw[0] : raw;
  if (!id || Number.isNaN(Number(id))) {
    return { title: "Event" };
  }
  try {
    const res = await fetch(`${apiRoot()}/events/${id}/`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { title: "Event" };
    const data = await res.json();
    return {
      title: data.title ? `${data.title} · Eventmaster` : "Event",
    };
  } catch {
    return { title: "Event" };
  }
}

export default async function EventDetailPage({ searchParams }) {
  const sp = await searchParams;
  const raw = sp?.id;
  const eventId =
    raw === undefined || raw === "" ? null : Array.isArray(raw) ? raw[0] : raw;

  return <EventDetailClient key={`event-${eventId ?? "none"}`} eventId={eventId} />;
}
