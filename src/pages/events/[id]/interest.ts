import type { APIRoute } from "astro";
import { setInterest } from "../../../lib/events";
import { currentPlayer, isGuest } from "../../../lib/players";

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player || isGuest(player)) return redirect("/login", 303);
  const kind = String((await request.formData()).get("kind") ?? "");
  const ok = setInterest(String(params.id), player, kind);
  return redirect(ok ? `/events#event-${params.id}` : "/events?problem=interest", 303);
};
