import { redirect } from "next/navigation";

/** The library has no landing page of its own: its sections are sidebar entries. */
export default function Page() {
  redirect("/library/styles");
}
