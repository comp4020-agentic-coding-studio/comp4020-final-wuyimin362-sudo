import type { APIRoute } from "astro";
import { currentPlayer, isGuest } from "../../lib/players";
import { photoOf } from "../../lib/profiles";

// A member's photo, for members only. It's sent as the type its own bytes
// declared on upload, and the browser is told not to guess otherwise.
export const GET: APIRoute = ({ params, cookies }) => {
  const viewer = currentPlayer(cookies);
  if (!viewer || isGuest(viewer)) return new Response("Photos are for members only.", { status: 403 });
  const photo = photoOf(String(params.id));
  if (!photo) return new Response("No photo.", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "content-type": photo.type,
      "cache-control": "private, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
};
