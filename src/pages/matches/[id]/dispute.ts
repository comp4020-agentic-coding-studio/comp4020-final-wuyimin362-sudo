import type { APIRoute } from "astro";
import { disputeMatch } from "../../../lib/matches";
import { currentPlayer, isGuest } from "../../../lib/players";

export const POST: APIRoute = ({ params, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player || isGuest(player)) return redirect("/login", 303);
  const problem = disputeMatch(Number(params.id), player);
  return redirect(problem ? `/matches?problem=${problem}` : "/matches?done=disputed", 303);
};
