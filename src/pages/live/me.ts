import type { APIRoute } from "astro";
import { stream } from "../../lib/live";
import { currentPlayer, isGuest } from "../../lib/players";

// A member's own stream: invitations and match reports waiting on them, the
// answers to the ones they sent, and any change to what only members can see
// of each other. The cookie picks the stream, not the address, so there's no
// asking for anyone else's. Guests have neither invitations nor matches, and
// can't see what members share, so it's for members only.
export const GET: APIRoute = ({ cookies, request }) => {
  const player = currentPlayer(cookies);
  if (!player || isGuest(player)) {
    return new Response("Only a signed-in member can listen here.", { status: 403 });
  }
  return stream([`player:${player.id}`, "members"], request.signal);
};
