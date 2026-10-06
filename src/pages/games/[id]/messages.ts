import type { APIRoute } from "astro";
import { postMessage } from "../../../lib/messages";
import { currentPlayer } from "../../../lib/players";

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player) return redirect("/login", 303);
  const id = Number(params.id);
  const problem = postMessage(id, player, String((await request.formData()).get("body") ?? ""));
  if (problem === "gone") return new Response("Only the game's two players can write here.", { status: 403 });
  return redirect(problem ? `/games/${id}?problem=${problem}` : `/games/${id}#latest`, 303);
};
