import type { APIRoute } from "astro";
import { stream } from "../../lib/live";

// The board is public, so anyone may hear that it changed.
export const GET: APIRoute = ({ request }) => stream(["board"], request.signal);
