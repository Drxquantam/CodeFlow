export function normalizeInputForVisualizer(rawInput: string) {
  const input = rawInput.trim();
  if (!input) return "";

  return normalizeWeightedEdgeInput(input)
    ?? normalizeAlienDictionaryInput(input)
    ?? normalizeLinkedListInput(input)
    ?? normalizeInlineArrayInput(input)
    ?? input;
}

export function formatInputForDisplay(rawInput: string) {
  const input = rawInput.trim();
  if (!input) return "";

  return formatWeightedEdgeInput(input)
    ?? formatAlienDictionaryInput(input)
    ?? formatLinkedListInput(input)
    ?? formatArrayInput(input)
    ?? input;
}

export function canNormalizeInput(rawInput: string) {
  const input = rawInput.trim();
  return Boolean(input && normalizeInputForVisualizer(input) !== input);
}

function normalizeAlienDictionaryInput(input: string) {
  const compact = input.replace(/\s+/g, " ");
  const n = readNamedNumber(compact, "N");
  const k = readNamedNumber(compact, "K");
  const dictMatch = compact.match(/dict\s*=\s*\[([^\]]+)\]/i);

  if (!dictMatch) {
    return null;
  }

  const words = [...dictMatch[1].matchAll(/"([^"]+)"|'([^']+)'|([A-Za-z]+)/g)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter(Boolean)
    .slice(0, n ?? undefined);

  if (!words.length) {
    return null;
  }

  const inferredN = n ?? words.length;
  const inferredK = k ?? inferAlphabetSize(words);

  return [String(inferredN), String(inferredK)].join(" ") + "\n" + words.slice(0, inferredN).join("\n");
}

function normalizeInlineArrayInput(input: string) {
  const arrayMatch = input.match(/(?:arr|nums|array|input)\s*=\s*\[([^\]]+)\]/i);
  if (!arrayMatch) return null;
  const target = readNamedNumber(input, "target");

  const values = arrayMatch[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.length) return null;

  return [String(values.length), values.join(" "), target == null ? "" : String(target)]
    .filter(Boolean)
    .join("\n");
}

function normalizeWeightedEdgeInput(input: string) {
  const parsed = parseWeightedEdgeInput(input);
  if (!parsed) return null;

  return [
    `${parsed.v} ${parsed.triples.length}${parsed.source == null ? "" : ` ${parsed.source}`}`,
    ...parsed.triples.map((edge) => edge.join(" ")),
  ].join("\n");
}

function formatWeightedEdgeInput(input: string) {
  const parsed = parseWeightedEdgeInput(input);
  if (!parsed) return null;

  return [
    `Vertices: ${parsed.v}`,
    parsed.source == null ? "" : `Source: ${parsed.source}`,
    "Edges:",
    ...parsed.triples.map(([from, to, weight]) => `${from} -> ${to} (${weight})`),
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeLinkedListInput(input: string) {
  const match = input.match(/head\s*=\s*\[([^\]]+)\]/i);
  if (!match) return null;

  const values = match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.length) return null;

  return `list\n${values.length}\n${values.join(" ")}`;
}

function readNamedNumber(input: string, name: string) {
  const match = input.match(new RegExp(`\\b${name}\\s*=\\s*(\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function parseWeightedEdgeInput(input: string) {
  const compact = input.replace(/\s+/g, " ");
  const v = readNamedNumber(compact, "V") ?? readNamedNumber(compact, "Vertices");
  const source = readNamedNumber(compact, "S") ?? readNamedNumber(compact, "Source");
  const edgeMatch = compact.match(/Edges?\s*=\s*(\[[\s\S]+\])/i);

  if (v != null && !edgeMatch && /Edges\s*:/i.test(input)) {
    const triples = [...input.matchAll(/(-?\d+)\s*->\s*(-?\d+)\s*\((-?\d+)\)/g)]
      .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number]);

    return triples.length ? { v, source, triples } : null;
  }

  if (v == null || !edgeMatch) return null;

  const triples = [...edgeMatch[1].matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)]
    .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number]);

  return triples.length ? { v, source, triples } : null;
}

function formatAlienDictionaryInput(input: string) {
  const normalized = normalizeAlienDictionaryInput(input);
  if (!normalized || normalized === input.trim()) return null;
  const [header, ...words] = normalized.split(/\r?\n/);
  const [n, k] = header.split(/\s+/);

  return [`Words: ${n}`, `Letters: ${k}`, "Dictionary:", ...words].join("\n");
}

function formatLinkedListInput(input: string) {
  const normalized = normalizeLinkedListInput(input);
  if (!normalized || normalized === input.trim()) return null;
  const lines = normalized.split(/\r?\n/);

  return `Linked List:\n${lines[2]?.split(/\s+/).join(" -> ") ?? ""}`;
}

function formatArrayInput(input: string) {
  const normalized = normalizeInlineArrayInput(input);
  if (!normalized || normalized === input.trim()) return null;
  const lines = normalized.split(/\r?\n/);

  return [
    `Array: [${lines[1]?.split(/\s+/).join(", ") ?? ""}]`,
    lines[2] ? `Target: ${lines[2]}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function inferAlphabetSize(words: string[]) {
  const maxChar = words.join("").toLowerCase().split("").reduce((max, char) => {
    const code = char.charCodeAt(0) - 96;
    return code >= 1 && code <= 26 ? Math.max(max, code) : max;
  }, 0);

  return Math.max(maxChar, 1);
}
