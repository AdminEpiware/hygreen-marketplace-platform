// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OCR_ENDPOINT = "https://app-b90lb7mv1w5d-api-W9z3M6eONl3L.gateway.appmedo.com/parse/image";
const LLM_ENDPOINT =
  "https://app-b90lb7mv1w5d-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

const PRODUCT_FIELDS = [
  "Product Name",
  "Price",
  "Quantity",
  "Product Code",
  "Category",
  "Store Name",
  "Currency",
  "Product Image Link",
  "Description",
  "Barcode",
  "Unit",
];

const LLM_SYSTEM_PROMPT = `You are a product data extraction assistant. Given raw text extracted from a document (PDF, image, Word, CSV, or plain text), extract every product entry found and return a JSON array.

Each object in the array MUST have exactly these 11 keys (use empty string "" if data is unavailable):
- "Product Name"       (string)
- "Price"              (string — numeric value only, no currency symbols)
- "Quantity"           (string — numeric value only, default "1" if missing)
- "Product Code"       (string)
- "Category"           (string)
- "Store Name"         (string)
- "Currency"           (string — ISO code like USD, INR, GBP; default "INR" if missing)
- "Product Image Link" (string — URL if found, else "")
- "Description"        (string — brief description of the product)
- "Barcode"            (string)
- "Unit"               (string — e.g. kg, pcs, litre, box, pack; default "pcs" if missing)

Rules:
- Return ONLY a valid JSON array, no markdown, no explanation, no code fences.
- If no products are found, return an empty array: []
- Never hallucinate product names; only extract what is in the text.
- Do not duplicate rows.`;

/** Use OCR.space to extract text from an image or PDF (base64) */
async function extractTextWithOCR(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const form = new FormData();
  // Include data URI prefix
  const prefix = base64Data.startsWith("data:") ? base64Data : `data:${mimeType};base64,${base64Data}`;
  form.append("base64Image", prefix);
  form.append("language", "eng");
  form.append("detectOrientation", "true");
  form.append("isTable", "true");
  form.append("OCREngine", "2");

  const res = await fetch(OCR_ENDPOINT, {
    method: "POST",
    headers: { "X-Gateway-Authorization": apiKey },
    body: form,
  });

  if (!res.ok) throw new Error(`OCR API error: ${res.status}`);

  const json = await res.json();
  if (json.IsErroredOnProcessing) {
    throw new Error(`OCR processing error: ${json.ParsedResults?.[0]?.ErrorMessage ?? "unknown"}`);
  }

  return (json.ParsedResults ?? []).map((r: any) => r.ParsedText ?? "").join("\n\n");
}

/** Extract text from .docx via mammoth (npm) */
async function extractTextFromDocx(base64Data: string): Promise<string> {
  try {
    // @ts-ignore
    const mammoth = await import("npm:mammoth@1.8.0");
    const binaryStr = atob(base64Data.includes(",") ? base64Data.split(",")[1] : base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
    return result.value ?? "";
  } catch (e) {
    throw new Error(`DOCX extraction failed: ${(e as Error).message}`);
  }
}

/** Call Gemini LLM, collect SSE stream, return parsed product rows */
async function parseWithLLM(rawText: string, apiKey: string): Promise<Record<string, string>[]> {
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: LLM_SYSTEM_PROMPT },
          { text: `\n\nExtracted document text:\n\n${rawText.slice(0, 30000)}` },
        ],
      },
    ],
  };

  const res = await fetch(LLM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gateway-Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) throw new Error(`LLM API error: ${res.status}`);
  if (!res.body) throw new Error("No response body from LLM");

  // Collect SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === "[DONE]") continue;
      try {
        const frame = JSON.parse(dataStr);
        const text = frame?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) fullText += text;
      } catch { /* skip incomplete frames */ }
    }
  }

  // Strip markdown fences if present
  const cleaned = fullText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find the JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];

    // Ensure every row has all 11 mandatory fields
    return parsed.map((row: any) => {
      const normalized: Record<string, string> = {};
      for (const field of PRODUCT_FIELDS) {
        normalized[field] = String(row[field] ?? "").trim();
      }
      // Apply defaults
      if (!normalized["Quantity"]) normalized["Quantity"] = "1";
      if (!normalized["Currency"]) normalized["Currency"] = "INR";
      if (!normalized["Unit"])     normalized["Unit"] = "pcs";
      return normalized;
    });
  } catch {
    return [];
  }
}

/** Parse CSV / TSV / plain text client-side-style in the edge function */
function parseStructuredText(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const fieldMap: Record<string, string> = {
    "product name": "Product Name", name: "Product Name", product: "Product Name", item: "Product Name",
    price: "Price", cost: "Price", amount: "Price", rate: "Price",
    quantity: "Quantity", qty: "Quantity", stock: "Quantity",
    "product code": "Product Code", code: "Product Code", sku: "Product Code",
    category: "Category", type: "Category",
    "store name": "Store Name", store: "Store Name",
    currency: "Currency",
    "product image link": "Product Image Link", image: "Product Image Link",
    "image url": "Product Image Link", "image link": "Product Image Link",
    description: "Description", desc: "Description",
    barcode: "Barcode",
    unit: "Unit",
  };

  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const mapped = fieldMap[h];
    if (mapped) colMap[mapped] = i;
  });

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i]
      .split(delimiter)
      .map((v) => v.trim().replace(/^["']|["']$/g, ""));

    const row: Record<string, string> = {};
    for (const field of PRODUCT_FIELDS) {
      const idx = colMap[field];
      row[field] = idx !== undefined ? (vals[idx] ?? "") : "";
    }
    if (!row["Quantity"]) row["Quantity"] = "1";
    if (!row["Currency"]) row["Currency"] = "INR";
    if (!row["Unit"])     row["Unit"] = "pcs";
    if (row["Product Name"]) rows.push(row);
  }
  return rows;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  let fileData: string;
  let mimeType: string;
  let fileName: string;

  try {
    const body = await req.json();
    fileData = body.fileData;   // base64 string (may include data URI prefix)
    mimeType = body.mimeType;
    fileName = body.fileName ?? "";
    if (!fileData || !mimeType) throw new Error("Missing fileData or mimeType");
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  try {
    let products: Record<string, string>[] = [];

    const ext = fileName.toLowerCase().split(".").pop() ?? "";
    const isImage = mimeType.startsWith("image/");
    const isPDF = mimeType === "application/pdf" || ext === "pdf";
    const isDocx =
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx";
    const isDoc = mimeType === "application/msword" || ext === "doc";
    const isCsvOrTxt =
      mimeType === "text/csv" ||
      mimeType === "text/plain" ||
      ext === "csv" ||
      ext === "txt";

    if (isImage || isPDF) {
      // Step 1: OCR to extract text
      const rawText = await extractTextWithOCR(fileData, mimeType, apiKey);
      // Step 2: LLM to parse into product rows
      products = await parseWithLLM(rawText, apiKey);
    } else if (isDocx) {
      const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
      const rawText = await extractTextFromDocx(base64);
      products = await parseWithLLM(rawText, apiKey);
    } else if (isDoc) {
      // .doc is binary — use OCR as fallback
      const rawText = await extractTextWithOCR(fileData, mimeType, apiKey);
      products = await parseWithLLM(rawText, apiKey);
    } else if (isCsvOrTxt) {
      // Decode base64 to text
      const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
      const decoded = atob(base64);
      // Try structured CSV/TSV parse first
      const structured = parseStructuredText(decoded);
      if (structured.length > 0) {
        products = structured;
      } else {
        // Fall back to LLM
        products = await parseWithLLM(decoded, apiKey);
      }
    } else {
      // Unknown: try LLM directly on whatever text we can decode
      try {
        const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
        const decoded = atob(base64);
        products = await parseWithLLM(decoded, apiKey);
      } catch {
        products = await parseWithLLM(fileData, apiKey);
      }
    }

    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (e) {
    console.error("file-converter error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});
