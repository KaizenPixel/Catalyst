import handler from 'vinext/server/fetch-handler';
import { handleMentorRequest } from '../lib/server/mentor.mjs';

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    if (new URL(request.url).pathname === '/api/mentor') {
      return handleMentorRequest(request, env);
    }
    return handler.fetch(request, env, ctx);
  },
};
