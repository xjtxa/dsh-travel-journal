import { randomUUID } from 'node:crypto';

const failure = (message, code) => Object.assign(new Error(message), { code });
const supportsImages = (info) => Array.isArray(info?.inputModalities) && info.inputModalities.includes('image');
export const TRAVEL_MODEL = Object.freeze({
  provider: 'deepseek-account',
  model: 'deepseek-flash',
  displayName: 'DeepSeek V4.1 Flash',
});

function conciseReasoning(info) {
  // DSH fills an omitted effort from reasoning.defaultEffort. Only an advertised
  // `off` id is safe to request; DeepSeek maps it to thinking.type = 'disabled'.
  if (Array.isArray(info?.reasoning?.efforts) && info.reasoning.efforts.some((effort) => effort?.id === 'off')) return { reasoningEffort: 'off' };
  return typeof info?.reasoning?.defaultEffort === 'string' ? { reasoningDefault: info.reasoning.defaultEffort } : {};
}

function actualUsage(value) {
  // DSH 0.2.1-rc.5 emits a cumulative `usage` chunk, separate from `finish`.
  // Its BlockAssembler replaces the prior usage snapshot, rather than adding it.
  if (!value || !Number.isSafeInteger(value.inputTokens) || value.inputTokens < 0
    || !Number.isSafeInteger(value.outputTokens) || value.outputTokens < 0) return null;
  const result = { inputTokens: value.inputTokens, outputTokens: value.outputTokens };
  for (const name of ['totalTokens', 'cacheReadTokens', 'cacheWriteTokens']) {
    if (Number.isSafeInteger(value[name]) && value[name] >= 0) result[name] = value[name];
  }
  return result;
}

function notify(callback, value) {
  if (typeof callback !== 'function') return;
  try { Promise.resolve(callback(Object.freeze({ ...value }))).catch(() => {}); } catch { /* Observers cannot invalidate the model result. */ }
}

async function withDeadline(config, externalSignal, work) {
  const requested = Number(config.modelTimeoutMs);
  const timeoutMs = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 300_000) : 60_000;
  const controller = new AbortController();
  const timeoutError = failure('AI 整理超时，已保存的原图和原话不受影响', 'MODEL_TIMEOUT');
  const cancel = () => controller.abort(failure('AI 整理已取消', 'MODEL_ABORTED'));
  let rejectAborted;
  const aborted = new Promise((_, reject) => { rejectAborted = reject; });
  const onAbort = () => rejectAborted(controller.signal.reason || failure('AI 整理已取消', 'MODEL_ABORTED'));
  controller.signal.addEventListener('abort', onAbort, { once: true });
  externalSignal?.addEventListener('abort', cancel, { once: true });
  if (externalSignal?.aborted) cancel();
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);
  const check = () => { if (controller.signal.aborted) throw controller.signal.reason; };
  const step = async (fn) => {
    check();
    const result = await Promise.race([Promise.resolve().then(() => { check(); return fn(); }), aborted]);
    check();
    return result;
  };
  try {
    return await Promise.race([Promise.resolve().then(() => { check(); return work({ signal: controller.signal, check, step }); }), aborted]);
  } catch (error) {
    if (!controller.signal.aborted) controller.abort(error);
    throw error;
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', onAbort);
    externalSignal?.removeEventListener('abort', cancel);
  }
}

/** Uses only the desktop LLM/attachment services. No persona, tools, or host settings are written. */
export function createModelAdapter(ctx, getConfig = () => ({})) {
  return createAdapter(ctx, getConfig);
}

export function createTravelModelAdapter(ctx, getConfig = () => ({})) {
  return createAdapter(ctx, getConfig, TRAVEL_MODEL);
}

function createAdapter(ctx, getConfig, fixedModel = null) {
  const service = (key) => { try { return ctx[key] || ctx.get?.(key); } catch { return undefined; } };

  function baseSelection(config = getConfig() || {}) {
    if (fixedModel) return { ...fixedModel, explicit: true };
    const explicit = Boolean(config.modelProvider || config.modelId);
    if (explicit && (!config.modelProvider || !config.modelId)) throw failure('请同时指定模型提供方和模型 ID', 'MODEL_SELECTION');
    const selected = explicit ? { provider: config.modelProvider, model: config.modelId }
      : service('agentDefaultModel')?.currentSelection?.();
    if (!selected?.provider || !selected?.model) return null;
    return { provider: String(selected.provider), model: String(selected.model), explicit };
  }

  async function chooseModel(llm, config, needsImages, session) {
    const selected = baseSelection(config);
    if (!selected) throw failure('请先在 DSH 中配置默认模型，或在旅行记忆设置中指定模型', 'MODEL_SELECTION');
    const choice = {
      provider: selected.provider, model: selected.model,
      source: fixedModel ? 'fixed' : selected.explicit ? 'plugin' : 'desktop', autoSelected: false,
    };
    const unavailable = () => failure('DSH 账号暂时无法使用 DeepSeek V4.1 Flash，请检查登录和模型可用性', 'MODEL_FIXED_UNAVAILABLE');
    let exactInfo = null;
    if (typeof llm.resolveModelInfo === 'function') {
      try { exactInfo = await session.step(() => llm.resolveModelInfo(selected.provider, selected.model, session.signal)); }
      catch (error) {
        if (!fixedModel) throw error;
        session.check();
        throw unavailable();
      }
    }
    if (fixedModel) {
      if (exactInfo?.provider !== selected.provider || exactInfo?.id !== selected.model
        || !Array.isArray(exactInfo.inputModalities) || !exactInfo.inputModalities.includes('text')) throw unavailable();
      // DSH returns generic text-only metadata for models absent from the account catalog.
      if (!supportsImages(exactInfo)) {
        if (!needsImages) throw unavailable();
        throw failure('DSH 账号中的 DeepSeek V4.1 Flash 暂不可用于照片整理', 'MODEL_VISION_UNAVAILABLE');
      }
      const efforts = exactInfo.reasoning?.efforts;
      if (Array.isArray(efforts) && !efforts.some((effort) => effort?.id === 'off')) {
        throw failure('当前 DSH 模型未提供关闭思考的选项', 'MODEL_REASONING_UNAVAILABLE');
      }
      // The bundled DeepSeek Account adapter maps off to thinking.type=disabled.
      return { ...choice, displayName: fixedModel.displayName, inputModalities: [...exactInfo.inputModalities], reasoningEffort: 'off' };
    }
    if (!needsImages) return { ...choice, ...conciseReasoning(exactInfo) };
    if (supportsImages(exactInfo)) return { ...choice, inputModalities: [...exactInfo.inputModalities], ...conciseReasoning(exactInfo) };
    if (selected.explicit) throw failure('指定模型未声明看图能力；请在旅行记忆设置中选择视觉模型，原图仍保留', 'MODEL_VISION_UNAVAILABLE');
    const models = typeof llm.listModels === 'function'
      ? await session.step(() => llm.listModels(selected.provider)) : [];
    const candidates = Array.isArray(models) ? models.filter((model) => model?.provider === selected.provider && typeof model.id === 'string' && model.id
      && supportsImages(model) && !(model.id === selected.model && Array.isArray(exactInfo?.inputModalities))).slice(0, 16) : [];
    for (const candidate of candidates) {
      const info = candidate.id === selected.model ? exactInfo : typeof llm.resolveModelInfo === 'function'
        ? await session.step(() => llm.resolveModelInfo(selected.provider, candidate.id, session.signal)) : null;
      const capability = Array.isArray(info?.inputModalities) ? info : candidate;
      if (supportsImages(capability)) return { provider: selected.provider, model: candidate.id,
        inputModalities: [...capability.inputModalities], source: 'same-provider-vision', autoSelected: candidate.id !== selected.model, ...conciseReasoning(info) };
    }
    throw failure('当前模型未声明看图能力，且同一提供方没有已声明可用的视觉模型；请手动指定，原图仍保留', 'MODEL_VISION_UNAVAILABLE');
  }

  async function askModel({ system = '', text, images = [], maxTokens = 1000, onUsage, onModel, signal: externalSignal } = {}) {
    const config = getConfig() || {};
    let latestUsage = null;
    let chosen = null;
    try {
      return await withDeadline(config, externalSignal, async (session) => {
        const llm = service('llm');
        if (!llm?.stream) throw failure('DSH 模型服务不可用', 'MODEL_SERVICE');
        if (!Array.isArray(images)) throw failure('图片输入格式无效', 'MODEL_INPUT');
        chosen = await chooseModel(llm, config, images.length > 0, session);
        session.check();
        notify(onModel, chosen);
        let content = [{ type: 'text', text: String(text ?? '') }];
        if (images.length) {
          const attachments = service('attachments');
          if (!attachments?.admitPromptContent) throw failure('DSH 附件服务不可用', 'MODEL_ATTACHMENT');
          // The installed admission API has no AbortSignal parameter. The shared
          // deadline stops our wait and prevents a late admission from dispatching.
          content = await session.step(() => attachments.admitPromptContent([...content,
            ...images.map((image, index) => ({ type: 'image', data: image.data, mediaType: image.mediaType, name: `travel-${index + 1}` }))]));
        }
        const params = {
          provider: chosen.provider, model: chosen.model, system,
          messages: [{ id: randomUUID(), role: 'user', content, source: { kind: 'plugin', plugin: 'travel-journal' } }],
          maxTokens, temperature: 0.2, signal: session.signal,
          ...(chosen.reasoningEffort ? { reasoningEffort: chosen.reasoningEffort } : {}),
        };
        const stream = await session.step(() => llm.stream(params));
        const iterator = stream?.[Symbol.asyncIterator]?.();
        if (!iterator) throw failure('DSH 模型服务未返回有效响应流', 'MODEL_STREAM');
        let result = '';
        let ended = false;
        try {
          for (;;) {
            const part = await session.step(() => iterator.next());
            if (part.done) { ended = true; break; }
            const chunk = part.value;
            if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') result += chunk.text;
            if (chunk?.type === 'usage') {
              const usage = actualUsage(chunk.usage);
              if (usage) latestUsage = usage;
            }
            if (chunk?.type === 'finish') {
              if (chunk.reason?.kind === 'error') throw failure('DSH 模型调用失败', 'MODEL_FAILED');
              if (chunk.reason?.kind === 'aborted') throw failure('AI 整理已取消', 'MODEL_ABORTED');
              if (chunk.reason?.kind === 'max-tokens') throw failure('AI 整理达到输出上限，结果不完整，可稍后重试', 'MODEL_TRUNCATED');
              if (chunk.reason?.kind === 'tool-calls') throw failure('模型要求工具调用，旅行整理未提供工具', 'MODEL_TOOL_CALL');
            }
            if (result.length > 32_000) throw failure('AI 返回内容过长', 'MODEL_OUTPUT_LIMIT');
          }
        } finally {
          if (!ended && typeof iterator.return === 'function') {
            try { Promise.resolve(iterator.return()).catch(() => {}); } catch { /* Cleanup must not extend the call deadline. */ }
          }
        }
        if (!result.trim()) throw failure('AI 返回空结果', 'MODEL_EMPTY');
        return result.trim();
      });
    } finally {
      // Report once, including provider-reported usage on failed/aborted calls.
      // A missing usage chunk stays unknown; no character/image estimate is made.
      if (latestUsage) notify(onUsage, { ...latestUsage, provider: chosen?.provider, model: chosen?.model,
        ...(chosen?.reasoningEffort ? { reasoningEffort: chosen.reasoningEffort } : {}),
        ...(chosen?.reasoningDefault ? { reasoningDefault: chosen.reasoningDefault } : {}) });
    }
  }

  askModel.getModelSelection = () => {
    const selected = baseSelection();
    return selected ? { provider: selected.provider, model: selected.model } : null;
  };
  askModel.getModelKey = () => {
    const selected = askModel.getModelSelection();
    return selected ? JSON.stringify([selected.provider, selected.model]) : 'unconfigured';
  };
  askModel.resolveModelSelection = async ({ images = false, signal } = {}) => {
    const config = getConfig() || {};
    return withDeadline(config, signal, (session) => {
      const llm = service('llm');
      if (!llm?.stream) throw failure('DSH 模型服务不可用', 'MODEL_SERVICE');
      return chooseModel(llm, config, Boolean(images), session);
    });
  };
  return askModel;
}
