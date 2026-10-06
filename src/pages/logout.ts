import type { APIRoute } from "astro";
import { logOut } from "../lib/players";

export const POST: APIRoute = ({ cookies, redirect }) => {
  logOut(cookies);
  return redirect("/?done=loggedout", 303);
};
