import type { APIRoute } from "astro";
import { join } from "../lib/players";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const player = join(String(form.get("name") ?? ""), cookies);
  return redirect(player ? "/?done=joined" : "/?problem=name", 303);
};
