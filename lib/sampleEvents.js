/** Demo payloads aligned with the Django `Event` model (+ implicit `id`, optional `organizer_username` for display). */

export const sampleEvents = [
  {
    id: 1,
    organizer: 101,
    organizer_username: "valleywine",
    title: "Silicon Valley Wine Tasting Night 2026",
    description:
      "Regional wineries, live music, and small plates outdoors. Casual dress; tastings until sold out.",
    location: "Saratoga, CA",
    starts_at: "2026-04-14T23:00:00.000Z",
    ends_at: "2026-04-15T03:00:00.000Z",
    status: "published",
    capacity: 120,
    created_at: "2026-02-01T14:22:00.000Z",
    updated_at: "2026-03-10T09:15:00.000Z",
  },
  {
    id: 2,
    organizer: 202,
    organizer_username: "baymeetups",
    title: "Startup Seminar & Technical Convention 2026",
    description:
      "Talks from founders and engineers on scalability, fundraising, and product. Lunch included.",
    location: "San Mateo, CA",
    starts_at: "2026-06-29T16:30:00.000Z",
    ends_at: "2026-06-29T22:30:00.000Z",
    status: "published",
    capacity: null,
    created_at: "2026-01-18T11:00:00.000Z",
    updated_at: "2026-04-02T16:40:00.000Z",
  },
];

export function getSampleEventById(id) {
  const n = Number(id);
  if (Number.isNaN(n)) return null;
  return sampleEvents.find((e) => e.id === n) ?? null;
}
