import type { APIRoute } from "astro";
import { inviteTo, refusedOffer } from "../../../lib/games";
import { currentPlayer, isGuest } from "../../../lib/players";
import { wallClockFrom } from "../../../lib/time";

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player || isGuest(player)) return redirect("/login", 303);
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "");
  const offer = { startsAt: wallClockFrom(field), venue: field("venue"), kind: field("kind"), note: field("note") };
  const problem = inviteTo(player, String(params.id), offer);
  return redirect(problem ? `/players/${params.id}?${refusedOffer(problem, offer)}` : "/invites?done=sent", 303);
};
