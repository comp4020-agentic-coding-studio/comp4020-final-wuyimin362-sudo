import type { APIRoute } from "astro";
import { stream } from "../../../lib/live";
import { threadFor } from "../../../lib/messages";
import { currentPlayer } from "../../../lib/players";

// A game's stream is its two players' alone, like its messages.
export const GET: APIRoute = ({ params, cookies, request }) => {
  const player = currentPlayer(cookies);
  const id = Number(params.id);
  if (!player || !threadFor(id, player)) {
    return new Response("Only the game's two players can listen here.", { status: 403 });
  }
  return stream([`game:${id}`], request.signal);
};
