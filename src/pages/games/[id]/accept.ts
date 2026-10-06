import type { APIRoute } from "astro";
import { acceptGame } from "../../../lib/games";
import { currentPlayer } from "../../../lib/players";

export const POST: APIRoute = ({ params, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player) return redirect("/?problem=join", 303);
  const problem = acceptGame(Number(params.id), player);
  return redirect(problem ? `/?problem=${problem}` : "/?done=accepted", 303);
};
