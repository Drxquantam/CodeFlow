type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const groqBaseUrl = "https://api.groq.com/openai/v1/chat/completions";
const defaultModel = "llama-3.3-70b-versatile";

export async function askGroqJson(prompt: string, maxTokens = 1600) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const response = await fetch(groqBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? defaultModel,
      temperature: 0.1,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are CodeFlow's senior DSA code analysis engine. Return only valid compact JSON. Do not wrap in markdown. The response must be a single JSON object.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      [
        `Groq request failed with HTTP ${response.status}.`,
        response.status === 403
          ? "The API key is present, but Groq refused access. Check project/org model permissions, the selected GROQ_MODEL, and whether this key is enabled for the deployed environment."
          : "",
        detail ? `Groq response: ${detail.slice(0, 500)}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const groq = (await response.json()) as GroqChatResponse;
  const content = groq.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return parseJsonObject(content);
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Groq response was not valid JSON.");
    }

    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      throw new Error("AI returned malformed JSON. Please click again; CodeFlow now requests strict JSON mode to prevent this.");
    }
  }
}
