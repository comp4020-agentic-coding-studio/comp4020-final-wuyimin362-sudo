import type { APIRoute } from "astro";
import { inviteTo } from "../../../lib/games";
import { currentPlayer, isGuest } from "../../../lib/players";

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player || isGuest(player)) return redirect("/login", 303);
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "");
  const problem = inviteTo(player, String(params.id), {
    startsAt: field("startsAt"),
    venue: field("venue"),
    kind: field("kind"),
    note: field("note"),
  });
  return redirect(problem ? `/players/${params.id}?problem=${problem}` : "/invites?done=sent", 303);
};
