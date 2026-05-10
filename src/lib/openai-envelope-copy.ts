const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type EnhanceCopyInput = { subject: string; rawDescription?: string };
export type EnhanceCopyOutput = { title: string; description: string };

const MAX_SUBJECT_IN = 500;
const MAX_NOTES_IN = 8000;

/**
 * Uses OpenAI to produce a professional envelope title and expanded description
 * from the user’s subject and optional rough notes. Server-only.
 */
export async function enhanceEnvelopeCopy(input: EnhanceCopyInput): Promise<EnhanceCopyOutput> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const subject = input.subject.trim().slice(0, MAX_SUBJECT_IN);
  if (!subject) {
    throw new Error("subject is required");
  }

  const notes = (input.rawDescription ?? "").trim().slice(0, MAX_NOTES_IN);

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const system = `You polish copy for e-signature envelope records (agreements and documents sent for signature).
Respond with ONLY valid JSON (no markdown) using exactly these keys: "title" and "description".

Rules:
- title: One clear, professional subject line suitable for a document list. Fix grammar and capitalization. Stay faithful to the user’s intent. Aim under 100 characters when reasonable.
- description: 2–5 sentences of internal context for the sender (not legal advice). Expand judiciously from the subject and notes using professional plain English. If notes are empty, write a brief scope summary inferred only from the subject. Do not invent specific parties, dates, amounts, or legal obligations not implied by the input.`;

  const userContent = JSON.stringify({
    subject,
    notes: notes.length > 0 ? notes : null,
  });

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Polish this envelope metadata:\n${userContent}` },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${text.slice(0, 280)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw?.trim()) {
    throw new Error("Empty response from OpenAI");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const obj = parsed as Record<string, unknown>;
  const title = String(obj.title ?? "").trim();
  const description = String(obj.description ?? "").trim();
  if (!title) {
    throw new Error("Model returned an empty title");
  }

  return { title, description };
}
