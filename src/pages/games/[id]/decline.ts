import type { APIRoute } from "astro";
import { declineInvitation } from "../../../lib/games";
import { currentPlayer } from "../../../lib/players";

export const POST: APIRoute = ({ params, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player) return redirect("/login", 303);
  const problem = declineInvitation(Number(params.id), player);
  return redirect(problem ? `/invites?problem=${problem}` : "/invites?done=declined", 303);
};
