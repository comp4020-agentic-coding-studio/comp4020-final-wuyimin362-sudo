import type { APIRoute } from "astro";
import { currentPlayer, isGuest } from "../../lib/players";
import { PHOTO_MAX, savePhoto } from "../../lib/profiles";

// The body is checked for size before it's read, so an oversized upload never
// lands in the memory of a 256 MB machine.
const BODY_MAX = PHOTO_MAX + 64 * 1024;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const player = currentPlayer(cookies);
  if (!player || isGuest(player)) return redirect("/login", 303);
  const length = Number(request.headers.get("content-length"));
  if (!(length > 0 && length <= BODY_MAX)) return redirect("/profile?problem=photo", 303);
  const problem = await savePhoto(player.id, (await request.formData()).get("photo"));
  return redirect(problem ? "/profile?problem=photo" : "/profile?done=photo", 303);
};
