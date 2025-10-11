import { createServer } from 'node:http';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8000);
const LINEAR_WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET || '';

// In-memory session store keyed by issueId
const sessionsByIssueId = new Map();

// Simple per-issue rate limiter (max N commands per minute)
const MAX_COMMANDS_PER_MINUTE = 5;
const rateLimitState = new Map(); // issueId -> { count, resetAt }

function isRateLimited(issueId) {
  const now = Date.now();
  const existing = rateLimitState.get(issueId);
  if (!existing) {
    rateLimitState.set(issueId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (now > existing.resetAt) {
    rateLimitState.set(issueId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (existing.count >= MAX_COMMANDS_PER_MINUTE) {
    return true;
  }
  existing.count += 1;
  return false;
}

function emitActivity({ sessionId, issueId, activityType, payload }) {
  // Log in a parsable JSON format
  console.log(
    JSON.stringify({
      logType: 'AgentActivity',
      timestamp: new Date().toISOString(),
      issueId,
      sessionId,
      activityType,
      payload,
    })
  );
}

function ensureSession(issueId, requestedSessionId) {
  let session = sessionsByIssueId.get(issueId);
  if (!session) {
    session = {
      sessionId: requestedSessionId || randomUUID(),
      meta: {
        rerunCount: 0,
        lastCommandAt: null,
        commandHistory: [],
      },
    };
    sessionsByIssueId.set(issueId, session);
  } else if (requestedSessionId && session.sessionId !== requestedSessionId) {
    session.sessionId = requestedSessionId; // preserve continuity if provided
  }
  return session;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifyLinearSignature(rawBodyBuffer, signatureHeader) {
  if (!LINEAR_WEBHOOK_SECRET) return true; // allow when not configured
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', LINEAR_WEBHOOK_SECRET)
    .update(rawBodyBuffer)
    .digest('hex');
  const received = String(signatureHeader);
  // timingSafeEqual requires equal length
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

const commandHandlers = {
  async rerun_analysis(ctx) {
    const { issueId, session, body } = ctx;
    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'action',
      payload: { action: 'rerun_analysis', reason: body?.reason ?? null },
    });

    session.meta.rerunCount += 1;
    session.meta.lastCommandAt = new Date().toISOString();
    session.meta.commandHistory.push({ command: 'rerun_analysis', at: session.meta.lastCommandAt });

    const message = `Reran context analysis for ${issueId} (run ${session.meta.rerunCount}).`;

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'response',
      payload: { message },
    });

    return { ok: true, message, sessionId: session.sessionId };
  },

  async search_code(ctx) {
    const { issueId, session, body } = ctx;
    const query = body?.query ?? '';

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'action',
      payload: { action: 'search_code', query },
    });

    // Stubbed search; real implementation would query an index
    const message = query
      ? `Search results are not enabled in this demo. Query="${query}"`
      : 'Search results are not enabled in this demo.';

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'response',
      payload: { message },
    });

    return { ok: true, message, sessionId: session.sessionId };
  },

  async explain_context(ctx) {
    const { issueId, session } = ctx;

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'action',
      payload: { action: 'explain_context' },
    });

    const message = `Context for ${issueId}: The agent maintains session continuity and supports commands.`;

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'response',
      payload: { message },
    });

    return { ok: true, message, sessionId: session.sessionId };
  },

  async suggest_implementation(ctx) {
    const { issueId, session } = ctx;

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'action',
      payload: { action: 'suggest_implementation' },
    });

    const suggestions = [
      'Validate webhook signatures via X-Linear-Signature',
      'Emit activities before/after command execution',
      'Persist rerun counters in session metadata',
      'Introduce per-issue rate limiting to prevent spam',
    ];

    emitActivity({
      sessionId: session.sessionId,
      issueId,
      activityType: 'response',
      payload: { suggestions },
    });

    return { ok: true, suggestions, sessionId: session.sessionId };
  },
};

function json(res, statusCode, data) {
  const payload = Buffer.from(JSON.stringify(data));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(payload.length),
  });
  res.end(payload);
}

function notFound(res) {
  json(res, 404, { ok: false, error: 'Not Found' });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Basic health check
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json(res, 200, { ok: true, service: 'sniff-agent', status: 'healthy' });
    }

    if (req.method === 'POST' && url.pathname === '/index') {
      // Indexing endpoint (stub)
      // Consume body to allow signature verification if provided
      const rawBody = await readRawBody(req);
      const sig = req.headers['x-linear-signature'];
      if (!verifyLinearSignature(rawBody, sig)) {
        return json(res, 401, { ok: false, error: 'Invalid signature' });
      }
      emitActivity({
        sessionId: 'system',
        issueId: 'N/A',
        activityType: 'action',
        payload: { action: 'index' },
      });
      return json(res, 200, { ok: true, indexed: true });
    }

    if (req.method === 'POST' && url.pathname === '/agent/command') {
      const rawBody = await readRawBody(req);
      const sig = req.headers['x-linear-signature'];
      if (!verifyLinearSignature(rawBody, sig)) {
        return json(res, 401, { ok: false, error: 'Invalid signature' });
      }

      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (e) {
        return json(res, 400, { ok: false, error: 'Invalid JSON body' });
      }

      const issueId = body?.issueId;
      const command = body?.command;
      const requestedSessionId = body?.sessionId;

      if (!issueId || !command) {
        return json(res, 400, { ok: false, error: 'Missing issueId or command' });
      }

      if (isRateLimited(issueId)) {
        return json(res, 429, { ok: false, error: 'Rate limit exceeded' });
      }

      const handler = commandHandlers[command];
      if (!handler) {
        return json(res, 400, { ok: false, error: `Unknown command: ${command}` });
      }

      const session = ensureSession(issueId, requestedSessionId);

      emitActivity({
        sessionId: session.sessionId,
        issueId,
        activityType: 'action',
        payload: { action: 'dispatch', command },
      });

      const result = await handler({ issueId, session, body });
      return json(res, 200, result);
    }

    return notFound(res);
  } catch (err) {
    console.error('Server error', err);
    return json(res, 500, { ok: false, error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`sniff-agent server listening on http://localhost:${PORT}`);
});
