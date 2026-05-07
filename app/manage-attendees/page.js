import { Suspense } from "react";
import ManageAttendeesClient from "./ManageAttendeesClient";

export default function ManageAttendeesPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ManageAttendeesClient />
    </Suspense>
  );
}
