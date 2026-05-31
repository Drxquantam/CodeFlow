type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Model tier list — ordered from best quality to most rate-limit-friendly.
 *
 * Free-tier Groq TPM limits (approximate, as of 2025):
 *   llama-3.3-70b-versatile  →  12 000 TPM   (primary, best quality)
 *   llama-3.1-70b-versatile  →  12 000 TPM
 *   llama-3.1-8b-instant     →  30 000 TPM   (fallback, 2.5× headroom)
 *   gemma2-9b-it             →  15 000 TPM   (second fallback)
 */
const MODEL_CHAIN = [
  process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
] as const;

const SYSTEM_PROMPT =
  "You are CodeFlow's senior DSA code analysis engine. " +
  "Return only valid compact JSON. Do not wrap in markdown. " +
  "The response must be a single JSON object.";

/** Parse the seconds-to-wait hint from a Groq 429 body. */
function parseRetryAfter(body: string): number {
  const m = body.match(/try again in (\d+(?:\.\d+)?)s/i);
  // cap at 6 s so we don't time-out serverless functions
  return m ? Math.min(Math.ceil(parseFloat(m[1])), 6) * 1_000 : 3_000;
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

/**
 * Call the Groq chat-completions endpoint with automatic 429 retry:
 *  1. Try the primary model.
 *  2. On 429: wait the hint duration (≤ 6 s), then retry same model.
 *  3. If still 429: immediately switch to the next model in MODEL_CHAIN.
 *  4. Repeat until all models exhausted, then throw.
 */
async function groqRequest(
  model: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
): Promise<Response> {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: prompt },
      ],
    }),
  });
}

export async function askGroqJson(prompt: string, maxTokens = 1600) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  // Clamp tokens so a single request never exceeds ~40 % of the free-tier TPM
  // budget (leaves room for the input prompt tokens).
  const safeMax = Math.min(maxTokens, 4_000);

  let lastError = "";

  for (const model of MODEL_CHAIN) {
    // --- first attempt with this model ---
    let response = await groqRequest(model, prompt, safeMax, apiKey);

    // On 429: wait the suggested delay and retry once with the same model
    if (response.status === 429) {
      const body  = await response.text().catch(() => "");
      const delay = parseRetryAfter(body);
      await sleep(delay);
      response = await groqRequest(model, prompt, safeMax, apiKey);
    }

    // If still not OK, collect the error and try the next model
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      lastError = buildErrorMessage(response.status, detail, model);

      if (response.status === 429) {
        // Rate-limited even after retry — try next model immediately
        continue;
      }

      // Any other HTTP error is fatal (bad key, model not found, etc.)
      throw new Error(lastError);
    }

    // --- success ---
    const groq    = (await response.json()) as GroqChatResponse;
    const content = groq.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`Groq (${model}) returned an empty response.`);
    }

    return parseJsonObject(content);
  }

  // All models exhausted
  throw new Error(
    lastError ||
      "Groq rate limit reached on all available models. " +
      "Please wait a minute and try again, or upgrade to Groq Dev tier for higher limits.",
  );
}

function buildErrorMessage(status: number, detail: string, model: string): string {
  const parts: string[] = [`Groq request failed with HTTP ${status} (model: ${model}).`];

  if (status === 429) {
    parts.push(
      "You've hit the free-tier token-per-minute limit. " +
        "CodeFlow is switching to a faster model automatically. " +
        "If this keeps happening, try again in a minute or upgrade at https://console.groq.com/settings/billing.",
    );
  } else if (status === 403) {
    parts.push(
      "The API key is present but Groq refused access. " +
        "Check project/org model permissions and whether this key is enabled.",
    );
  }

  if (detail) parts.push(`Groq response: ${detail.slice(0, 400)}`);
  return parts.filter(Boolean).join(" ");
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end   = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Groq response was not valid JSON.");
    }
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      throw new Error(
        "AI returned malformed JSON. Please click again — strict JSON mode is enabled.",
      );
    }
  }
}
