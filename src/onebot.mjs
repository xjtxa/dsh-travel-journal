const MAX_MESSAGE_BYTES = 1024 * 1024;
const MAX_QUEUED_EVENTS = 100;
const MAX_PENDING_CALLS = 100;
const DEFAULT_TIMEOUT_MS = 15_000;

function transportError(message, code = 'ONEBOT_TRANSPORT') {
  return Object.assign(new Error(message), { code });
}

function endpoint(value, protocols, label) {
  if (value == null || value === '') return '';
  let parsed;
  try { parsed = new URL(String(value)); } catch {
    throw transportError(`Invalid ${label} endpoint.`, 'ONEBOT_CONFIG');
  }
  const host = parsed.hostname.toLowerCase();
  const loopback = host === 'localhost' || host === '[::1]' || host === '::1'
    || /^127(?:\.\d{1,3}){3}$/.test(host);
  if (!protocols.includes(parsed.protocol) || !loopback || parsed.username || parsed.password || parsed.hash) {
    throw transportError(`${label} must use a loopback address with an allowed protocol and no URL credentials.`, 'ONEBOT_CONFIG');
  }
  return parsed.toString();
}

function readConfig(getConfig) {
  const raw = getConfig?.() ?? {};
  if (raw.enabled !== true) return { enabled: false };
  const botQQ = String(raw.botQQ ?? '').trim();
  if (!/^[1-9]\d{3,19}$/.test(botQQ)) {
    throw transportError('A valid expected botQQ is required.', 'ONEBOT_CONFIG');
  }
  const wsUrl = endpoint(raw.wsUrl, ['ws:', 'wss:'], 'WebSocket');
  const httpUrl = endpoint(raw.httpUrl, ['http:', 'https:'], 'HTTP');
  if (!wsUrl && !httpUrl) throw transportError('Configure a loopback WebSocket or HTTP endpoint.', 'ONEBOT_CONFIG');
  const accessToken = String(raw.accessToken ?? '');
  if (accessToken.length > 4096 || /[\r\n]/.test(accessToken)) {
    throw transportError('Invalid access token format.', 'ONEBOT_CONFIG');
  }
  return { enabled: true, wsUrl, httpUrl, accessToken, botQQ };
}

function byteLength(value) { return new TextEncoder().encode(value).byteLength; }

async function limitedResponseText(response) {
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (declaredLength > MAX_MESSAGE_BYTES) {
    throw transportError('OneBot response exceeds the size limit.', 'ONEBOT_SIZE');
  }
  if (!response.body?.getReader) {
    const value = await response.text();
    if (byteLength(value) > MAX_MESSAGE_BYTES) throw transportError('OneBot response exceeds the size limit.', 'ONEBOT_SIZE');
    return value;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_MESSAGE_BYTES) {
        await reader.cancel().catch(() => {});
        throw transportError('OneBot response exceeds the size limit.', 'ONEBOT_SIZE');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

/**
 * Local-only OneBot v11 client. No outgoing chat is generated automatically.
 * call() resolves to the API response's data field; state is a read-only snapshot.
 * ownerQQ authorization and inbound message-id deduplication belong to the engine.
 */
export function createOneBotClient({
  getConfig,
  onEvent = () => {},
  onState = () => {},
  WebSocketImpl = globalThis.WebSocket,
  fetchImpl = globalThis.fetch,
} = {}) {
  let running = false;
  let generation = 0;
  let sequence = 0;
  let config = { enabled: false };
  let socket = null;
  let reconnectTimer = null;
  let connectionTimer = null;
  let reconnectAttempt = 0;
  let status = 'stopped';
  let connected = false;
  let verified = false;
  let actualBotQQ = '';
  let lastError = '';
  let eventQueue = [];
  let drainingGeneration = null;
  let decodingMessages = 0;
  const pending = new Map();

  function snapshot() {
    return Object.freeze({ status, connected, verified, botQQ: actualBotQQ,
      generation, reconnectAttempt, lastError,
      queuedEvents: eventQueue.length, pendingCalls: pending.size });
  }

  function publish() {
    try { Promise.resolve(onState(snapshot())).catch(() => {}); } catch { /* Observer cannot stop transport cleanup. */ }
  }

  function isCurrent(epoch) { return running && epoch === generation; }

  function settle(echo, error, data) {
    const request = pending.get(echo);
    if (!request) return;
    pending.delete(echo);
    clearTimeout(request.timer);
    if (error) {
      request.controller?.abort();
      request.reject(error);
    } else request.resolve(data);
  }

  function rejectPending(epoch, reason) {
    for (const [echo, request] of pending) {
      if (epoch == null || request.generation === epoch) settle(echo, reason);
    }
  }

  function closeSocket() {
    clearTimeout(connectionTimer);
    connectionTimer = null;
    const previous = socket;
    socket = null;
    if (!previous) return;
    previous.onopen = previous.onclose = previous.onerror = previous.onmessage = null;
    try { previous.close(); } catch { /* Already closed. */ }
  }

  function disconnect(epoch, message, retry = true) {
    if (!isCurrent(epoch)) return;
    connected = verified = false;
    actualBotQQ = '';
    lastError = message;
    eventQueue = [];
    closeSocket();
    rejectPending(epoch, transportError(message, 'ONEBOT_DISCONNECTED'));
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (retry) {
      status = 'reconnecting';
      const delay = Math.min(30_000, 1000 * (2 ** Math.min(reconnectAttempt, 5)));
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (isCurrent(epoch)) connect();
      }, delay);
      reconnectTimer.unref?.();
    } else status = 'error';
    publish();
  }

  async function drainEvents(epoch) {
    if (!isCurrent(epoch) || !verified || drainingGeneration === epoch) return;
    drainingGeneration = epoch;
    try {
      while (isCurrent(epoch) && verified && eventQueue.length) {
        const event = eventQueue.shift();
        try { await onEvent(event); } catch {
          if (isCurrent(epoch)) {
            lastError = 'The event handler could not process an event.';
            publish();
          }
        }
      }
    } finally {
      if (drainingGeneration === epoch) drainingGeneration = null;
    }
  }

  function handlePayload(epoch, payload) {
    if (!isCurrent(epoch) || !payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    if (Object.hasOwn(payload, 'echo')) {
      const echo = String(payload.echo);
      const request = pending.get(echo);
      if (!request || request.generation !== epoch) return;
      if (payload.status !== 'ok' || Number(payload.retcode) !== 0) {
        settle(echo, transportError('OneBot API reported a failure.', 'ONEBOT_API'));
      } else settle(echo, null, payload.data);
      return;
    }
    if (typeof payload.post_type !== 'string') return;
    if (eventQueue.length >= MAX_QUEUED_EVENTS) {
      disconnect(epoch, 'The inbound event queue exceeded its limit.');
      return;
    }
    eventQueue.push(payload);
    void drainEvents(epoch);
  }

  async function receive(epoch, source, data) {
    if (!isCurrent(epoch) || socket !== source) return;
    if (decodingMessages >= MAX_QUEUED_EVENTS) {
      disconnect(epoch, 'Too many inbound messages are waiting to decode.');
      return;
    }
    decodingMessages += 1;
    try {
      let text;
      if (typeof data === 'string') {
        if (data.length > MAX_MESSAGE_BYTES || byteLength(data) > MAX_MESSAGE_BYTES) throw new Error('size');
        text = data;
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        if (data.byteLength > MAX_MESSAGE_BYTES) throw new Error('size');
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        text = new TextDecoder().decode(bytes);
      } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
        if (data.size > MAX_MESSAGE_BYTES) throw new Error('size');
        text = await data.text();
      } else return;
      if (!isCurrent(epoch) || socket !== source) return;
      let payload;
      try { payload = JSON.parse(text); } catch {
        disconnect(epoch, 'OneBot sent invalid JSON.');
        return;
      }
      handlePayload(epoch, payload);
    } catch {
      if (isCurrent(epoch) && socket === source) disconnect(epoch, 'An inbound OneBot message exceeded its size limit or could not be decoded.');
    } finally { decodingMessages -= 1; }
  }

  function request(action, params, options, epoch, internal = false) {
    if (!isCurrent(epoch) || (!internal && !verified)) {
      return Promise.reject(transportError('OneBot is not ready.', 'ONEBOT_NOT_READY'));
    }
    if (typeof action !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(action)
      || !params || typeof params !== 'object' || Array.isArray(params)) {
      return Promise.reject(transportError('Invalid OneBot action or parameters.', 'ONEBOT_ARGUMENT'));
    }
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
      return Promise.reject(transportError('timeoutMs must be between 1 and 120000.', 'ONEBOT_ARGUMENT'));
    }
    if (pending.size >= MAX_PENDING_CALLS) return Promise.reject(transportError('Too many pending OneBot calls.', 'ONEBOT_LIMIT'));
    const echo = `travel-${epoch}-${++sequence}`;
    let body;
    let wsBody;
    try {
      body = JSON.stringify(params);
      wsBody = JSON.stringify({ action, params, echo });
      if (byteLength(wsBody) > MAX_MESSAGE_BYTES) throw new Error('size');
    } catch { return Promise.reject(transportError('OneBot parameters are not serializable or exceed the size limit.', 'ONEBOT_ARGUMENT')); }
    const useSocket = socket?.readyState === 1;
    if (!useSocket && (!config.httpUrl || typeof fetchImpl !== 'function')) {
      return Promise.reject(transportError('No OneBot API transport is connected.', 'ONEBOT_DISCONNECTED'));
    }
    return new Promise((resolve, reject) => {
      const controller = useSocket ? null : new AbortController();
      const timer = setTimeout(() => {
        settle(echo, transportError('OneBot API timed out; the action was not retried and its outcome may be unknown.', 'ONEBOT_TIMEOUT'));
      }, timeoutMs);
      pending.set(echo, { generation: epoch, resolve, reject, timer, controller });
      if (useSocket) {
        try { socket.send(wsBody); } catch {
          settle(echo, transportError('The OneBot API request could not be sent.', 'ONEBOT_DISCONNECTED'));
        }
        return;
      }
      const url = new URL(config.httpUrl);
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/${action}`;
      const headers = { 'Content-Type': 'application/json' };
      if (config.accessToken) headers.Authorization = `Bearer ${config.accessToken}`;
      void (async () => {
        try {
          const response = await fetchImpl(url.toString(), {
            method: 'POST', headers, body, signal: controller.signal, redirect: 'error',
          });
          if (!response.ok) throw transportError('OneBot HTTP returned an unsuccessful status.', 'ONEBOT_HTTP');
          const text = await limitedResponseText(response);
          const payload = JSON.parse(text);
          if (!isCurrent(epoch) || !pending.has(echo)) return;
          handlePayload(epoch, { ...payload, echo });
        } catch (error) {
          if (!isCurrent(epoch) || !pending.has(echo)) return;
          settle(echo, error?.code?.startsWith?.('ONEBOT_') ? error
            : transportError('The OneBot HTTP request failed.', 'ONEBOT_HTTP'));
        }
      })();
    });
  }

  async function verifyLogin(epoch) {
    try {
      const login = await request('get_login_info', {}, {}, epoch, true);
      if (!isCurrent(epoch)) return;
      const qq = String(login?.user_id ?? '');
      if (qq !== config.botQQ) {
        disconnect(epoch, 'The connected account does not match the configured botQQ.', false);
        return;
      }
      actualBotQQ = qq;
      verified = connected = true;
      reconnectAttempt = 0;
      status = 'ready';
      lastError = '';
      publish();
      void drainEvents(epoch);
    } catch (error) {
      if (isCurrent(epoch) && status !== 'reconnecting' && status !== 'error') {
        disconnect(epoch, error?.code === 'ONEBOT_TIMEOUT'
          ? 'OneBot login verification timed out.' : 'OneBot login verification failed.');
      }
    }
  }

  function connect() {
    const epoch = ++generation;
    connected = verified = false;
    actualBotQQ = '';
    eventQueue = [];
    try { config = readConfig(getConfig); } catch (error) {
      status = 'error';
      lastError = error?.code === 'ONEBOT_CONFIG' ? error.message : 'Could not read OneBot configuration.';
      publish();
      return;
    }
    if (!config.enabled) {
      running = false;
      status = 'disabled';
      lastError = '';
      publish();
      return;
    }
    status = config.wsUrl ? 'connecting' : 'verifying';
    lastError = '';
    publish();
    if (!config.wsUrl) { void verifyLogin(epoch); return; }
    if (typeof WebSocketImpl !== 'function') {
      disconnect(epoch, 'WebSocket is unavailable in this runtime.', false);
      return;
    }
    try {
      const url = new URL(config.wsUrl);
      if (config.accessToken) url.searchParams.set('access_token', config.accessToken);
      const source = new WebSocketImpl(url.toString());
      socket = source;
      connectionTimer = setTimeout(() => {
        if (isCurrent(epoch) && socket === source) disconnect(epoch, 'The OneBot WebSocket connection timed out.');
      }, DEFAULT_TIMEOUT_MS);
      connectionTimer.unref?.();
      source.onopen = () => {
        if (!isCurrent(epoch) || socket !== source) return;
        clearTimeout(connectionTimer);
        connectionTimer = null;
        connected = true;
        status = 'verifying';
        publish();
        void verifyLogin(epoch);
      };
      source.onmessage = (event) => { void receive(epoch, source, event.data); };
      source.onclose = () => {
        if (isCurrent(epoch) && socket === source) disconnect(epoch, 'The OneBot WebSocket disconnected.');
      };
      source.onerror = () => {
        if (isCurrent(epoch) && socket === source) disconnect(epoch, 'The OneBot WebSocket connection failed.');
      };
    } catch { disconnect(epoch, 'The OneBot WebSocket could not be opened.'); }
  }

  function start() {
    if (running) return snapshot();
    running = true;
    reconnectAttempt = 0;
    connect();
    return snapshot();
  }

  function stop() {
    running = false;
    generation += 1;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    closeSocket();
    rejectPending(null, transportError('OneBot was stopped.', 'ONEBOT_STOPPED'));
    eventQueue = [];
    connected = verified = false;
    actualBotQQ = '';
    reconnectAttempt = 0;
    status = 'stopped';
    lastError = '';
    publish();
    return snapshot();
  }

  return Object.freeze({
    start,
    stop,
    restart() { stop(); return start(); },
    call(action, params = {}, options = {}) { return request(action, params, options, generation); },
    get state() { return snapshot(); },
  });
}
