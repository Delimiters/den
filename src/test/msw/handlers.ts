import { http, HttpResponse } from "msw";

const BASE = "http://localhost:54321/rest/v1";

export const defaultHandlers = [
  // voice_sessions
  http.post(`${BASE}/voice_sessions`, () => HttpResponse.json({})),
  http.delete(`${BASE}/voice_sessions`, () => HttpResponse.json({})),

  // user_presence
  http.post(`${BASE}/user_presence`, () => HttpResponse.json({})),

  // Catch-all: warn on unhandled Supabase REST calls so tests don't silently succeed
  http.all(`${BASE}/*`, ({ request }) => {
    console.warn(`[MSW] Unhandled request: ${request.method} ${request.url}`);
    return HttpResponse.json({ message: "Not mocked" }, { status: 404 });
  }),
];
