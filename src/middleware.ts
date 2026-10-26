import { defineMiddleware } from "astro:middleware";
import { logAction } from "./lib/log";
import { currentPlayer } from "./lib/players";

// Every action, logged in one place so a new route can't forget to: every
// form POST, and every page someone was refused (a 4xx). Ordinary page views
// aren't actions, and the live streams and photos are a page's own requests,
// so they'd only bury the actions in noise.
export const onRequest = defineMiddleware(async (context, next) => {
  const { method } = context.request;
  const path = context.url.pathname;
  // who they were coming in, for a logout, which ends the session it reads
  const before = currentPlayer(context.cookies);
  const response = await next();
  const refused = response.status >= 400 && response.status < 500;
  if (method !== "GET" || refused) {
    // who they are now: someone joining, signing up or logging in has only just
    // been given their session, which the cookies now hold
    const after = currentPlayer(context.cookies) ?? before;
    logAction(after, method, path, response.status, response.headers.get("location"));
  }
  return response;
});
