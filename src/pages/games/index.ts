import type { APIRoute } from "astro";
import { postGame } from "../../lib/games";
import { currentPlayer } from "../../lib/players";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player) return redirect("/?problem=join", 303);
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "");
  const problem = postGame(player, {
    startsAt: field("startsAt"),
    venue: field("venue"),
    kind: field("kind"),
    note: field("note"),
  });
  return redirect(problem ? `/?problem=${problem}` : "/?done=posted", 303);
};
