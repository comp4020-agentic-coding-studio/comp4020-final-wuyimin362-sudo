import type { APIRoute } from "astro";
import { withdrawGame } from "../../../lib/games";
import { currentPlayer } from "../../../lib/players";

export const POST: APIRoute = ({ params, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player) return redirect("/?problem=join", 303);
  const problem = withdrawGame(Number(params.id), player);
  return redirect(problem ? `/?problem=${problem}` : "/?done=withdrawn", 303);
};
