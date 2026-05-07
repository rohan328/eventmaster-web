import { Suspense } from "react";
import EditEventClient from "./EditEventClient";

export default function EditEventPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <EditEventClient />
    </Suspense>
  );
}

