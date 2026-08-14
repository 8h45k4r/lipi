import { getEnv } from './env';

export interface ExtractionField {
  name: string;
  type: string;
  description?: string;
}

export interface ExtractionRequest {
  ocrText: string;
  fields: ExtractionField[];
  systemPrompt: string;
  settings?: {
    includeImages?: boolean;
    optimizeForLatency?: boolean;
    arrayExtract?: boolean;
    includeCitations?: boolean;
  };
  parseConfig?: any;
}

export interface ExtractionResult {
  data: Record<string, any>;
  raw: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalDurationNs: number;
  };
}

export interface SplitSection {
  name: string;
  description: string;
}

export interface SplitRequest {
  ocrText: string;
  pageCount: number;
  sections: SplitSection[];
  partitionKey?: string;
}

export interface SplitResult {
  data: {
    splits?: Array<{
      name: string;
      pages: number[];
      confidence: 'high' | 'low';
      evidence: string;
    }>;
    partitions?: Array<{ key: string; name: string; pages: number[] }>;
    [key: string]: any;
  };
  raw: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalDurationNs: number;
  };
}

export interface ClassifyCategory {
  name: string;
  description: string;
}

export interface ClassifyRequest {
  ocrText: string;
  categories: ClassifyCategory[];
}

export interface ClassifyResult {
  data: {
    category?: string;
    scores?: Array<{ category: string; score: number }>;
    evidence?: string;
    confidence?: 'high' | 'low';
    [key: string]: any;
  };
  raw: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalDurationNs: number;
  };
}

async function callOllamaJson(systemMessage: string, userContent: string) {
  const env = getEnv();

  const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userContent },
      ],
      stream: false,
      format: 'json',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const message = json.message?.content ?? json.message ?? '';
  let parsed: any;

  try {
    parsed = typeof message === 'string' ? JSON.parse(message) : message;
  } catch (e) {
    console.warn("Model returned non-JSON output despite grammar constraint", e);
    // Fallback parsing just in case it included markdown blocks
    const jsonMatch = (message as string).match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[1]); } catch(e2) { throw new Error('Model returned non-JSON output'); }
    } else {
      throw new Error(`Model returned non-JSON output. Raw output: ${message}`);
    }
  }

  return {
    data: parsed,
    raw: typeof message === 'string' ? message : JSON.stringify(message),
    usage: {
      promptTokens: json.prompt_eval_count || 0,
      completionTokens: json.eval_count || 0,
      totalDurationNs: json.total_duration || 0,
    },
  };
}

export async function runLocalSplit(req: SplitRequest): Promise<SplitResult> {
  const { ocrText, pageCount, sections, partitionKey } = req;

  const sectionLines = sections
    .map((s) => `- "${s.name}": ${s.description}`)
    .join('\n');

  const systemMessage = `You are a precise document-splitting engine for Nepali and English government and legal documents (Gazette notices, citizenship certificates, land/parcel records).

You receive the OCR text of one document with approximately ${pageCount} page(s) and a list of user-described sections. Classify the document's content into those sections and estimate which pages each section covers.

Rules:
- Output exactly one valid JSON object and nothing else.
- The object must have a "splits" array. Each element: { "name": string (a section name from the list, exactly as given), "pages": number[] (1-based page numbers), "confidence": "high" | "low", "evidence": string (verbatim snippet from the OCR text that anchors the section) }.
- If explicit page markers are absent, estimate pages best-effort from content order and length; never invent pages beyond ${pageCount}.
- Preserve Nepali (Devanagari) text as-is in evidence snippets.
- Omit sections that clearly do not appear; do not guess.${partitionKey ? `
- The object must also have a "partitions" array. Group repeating sections by the identifier "${partitionKey}" read from the document. Each element: { "key": string (the ${partitionKey} value found in the text), "name": string, "pages": number[] }.` : `
- The object must also have a "partitions" array; set it to [].`}`;

  const userContent = `Sections to split into:

${sectionLines}

Document page count (approximate): ${pageCount}

OCR TEXT (single document):

${ocrText}
`;

  return callOllamaJson(systemMessage, userContent);
}

export async function runLocalClassify(req: ClassifyRequest): Promise<ClassifyResult> {
  const { ocrText, categories } = req;

  const categoryLines = categories
    .map((c) => `- "${c.name}": ${c.description}`)
    .join('\n');

  const systemMessage = `You are a precise document-classification engine for Nepali and English government and legal documents (Gazette notices, citizenship certificates, land/parcel records).

You receive the OCR text of one document and a list of user-described categories. Pick the best matching category.

Rules:
- Output exactly one valid JSON object and nothing else, with keys: "category" (the best matching category name, exactly as given), "scores" (array of { "category": string, "score": number } with a score between 0.0 and 1.0 for every category), "evidence" (verbatim snippet(s) from the OCR text justifying the choice), "confidence" ("high" or "low").
- Preserve Nepali (Devanagari) text as-is in evidence snippets.
- Base the decision only on the OCR text; do not invent content.
- If no category fits well, still pick the closest one but set confidence to "low".`;

  const userContent = `Categories:

${categoryLines}

OCR TEXT (single document):

${ocrText}
`;

  return callOllamaJson(systemMessage, userContent);
}

export async function runLocalGemmaExtraction(
  req: ExtractionRequest,
): Promise<ExtractionResult> {
  const { ocrText, fields, systemPrompt } = req;

  const schemaLines = fields.map(
    (f) =>
      `- "${f.name}" (${f.type})${f.description ? `: ${f.description}` : ''}`,
  ).join('\n');

  const systemMessage = `You are a precise, conservative extraction engine for Nepali and English documents used in government and legal workflows.

You receive raw OCR text from one document (Gazette notice, citizenship certificate, or land/parcel record) and a schema describing the fields to extract. Your goal is high-accuracy structured extraction (90%+ correctness) suitable for compliance, case work, and data pipelines.

Core rules:
- Output exactly one valid JSON object and nothing else.
- JSON must be syntactically valid and parseable.
- Keys must match the provided field names exactly (case-sensitive).
- Use null when a value cannot be confidently determined. Do not guess.
- Preserve Nepali text (Devanagari) as-is whenever it is part of a value (names, addresses, headings).
- Normalize obvious OCR noise: fix duplicated spaces, remove random punctuation, fix broken numbers (e.g., "20 25" -> "2025") when confident.
- Do not hallucinate fields that are not in the schema.
- Do not invent legal citations, parcel IDs, PAN numbers, or dates that are not present in the OCR text.

Metadata Objects (_confidence & _citations):
- You MUST include a "_confidence" object in your top-level JSON output. The "_confidence" object must map each extracted field name in the schema to a floating-point score between 0.0 and 1.0 (e.g. 0.95), scoring your confidence based on text clarity, legibility, and formatting.
- You MUST include a "_citations" object in your top-level JSON output. The "_citations" object must map each extracted field name in the schema to an array of citation objects containing verbatim text snippets from the OCR text that prove where you extracted the data (e.g. "_citations": { "owner_name": [{ "snippet": "जग्गाधनीको नाम: राम बहादुर थापा" }] }).

Document-type specific guidelines:
- Gazette (राजपत्र): Focus on: volume, issue number, publication date, section type, ministry/agency, notice titles, key subject entities, main operative clauses, and cited laws/sections. If the schema includes array fields (e.g., notices), treat each separate notice block as one element with its own fields.
- Citizenship certificate (नागरिकता प्रमाणपत्र): Focus on: full name, father/mother names, sex, date of birth, place of birth, district/local level, citizenship number, issuance date, document type, and remarks. Carefully differentiate district vs municipality vs ward; keep the hierarchy clear.
- Land records (जग्गा / कबुलियतम / नक्सा / लालपुर्जा, etc.): Focus on: parcel ID (kitta no.), area, unit, district, local level, ward, plot location, owner names, type of right, registration date, and references to maps or plans.

Uncertainty and conflicts:
- If multiple conflicting values appear, choose the one that is most clearly associated with the field.
- If you cannot resolve conflicts confidently, set the field to null and give it a low score in "_confidence" (e.g. 0.0 to 0.3).

FEW-SHOT EXAMPLES:
Here are examples of how you should map raw OCR text to the desired JSON output including _confidence and _citations:

Example 1: Land Record (जग्गा धनी प्रमाण पुर्जा)
[Mock OCR]
नेपाल सरकार
भूमि व्यवस्था, सहकारी तथा गरिबी निवारण मन्त्रालय
मालपोत कार्यालय, काठमाडौं
जग्गा धनी प्रमाण पुर्जा
जग्गाधनीको नाम: राम बहादुर थापा
कित्ता नं: ४०५
क्षेत्रफल: ०-४-२-०
दर्ता मिति: २०७५-०२-१५
[Mock JSON]
{
  "document_type": "Land Record",
  "owner_name": "राम बहादुर थापा",
  "parcel_id": "४०५",
  "area": "०-४-२-०",
  "registration_date": "2075-02-15 BS",
  "_confidence": {
    "document_type": 1.0,
    "owner_name": 0.95,
    "parcel_id": 0.9,
    "area": 0.95,
    "registration_date": 0.95
  },
  "_citations": {
    "document_type": [{ "snippet": "जग्गा धनी प्रमाण पुर्जा" }],
    "owner_name": [{ "snippet": "जग्गाधनीको नाम: राम बहादुर थापा" }],
    "parcel_id": [{ "snippet": "कित्ता नं: ४०५" }],
    "area": [{ "snippet": "क्षेत्रफल: ०-४-२-०" }],
    "registration_date": [{ "snippet": "दर्ता मिति: २०७५-०२-१५" }]
  }
}

Example 2: Citizenship Certificate (नेपाली नागरिकताको प्रमाण-पत्र)
[Mock OCR]
नेपाल सरकार
गृह मन्त्रालय
नेपाली नागरिकताको प्रमाण-पत्र
प्रमाण-पत्र नं: ३४-०१-७२-०४५६१
नाम थर: सिता शर्मा
जन्म मिति: २०५०-०८-२२
लिङ्ग: महिला
[Mock JSON]
{
  "document_type": "Citizenship",
  "citizenship_no": "३४-०१-७२-०४५६१",
  "full_name": "सिता शर्मा",
  "date_of_birth": "2050-08-22 BS",
  "sex": "Female",
  "_confidence": {
    "document_type": 1.0,
    "citizenship_no": 0.95,
    "full_name": 1.0,
    "date_of_birth": 0.9,
    "sex": 0.95
  },
  "_citations": {
    "document_type": [{ "snippet": "नेपाली नागरिकताको प्रमाण-पत्र" }],
    "citizenship_no": [{ "snippet": "प्रमाण-पत्र नं: ३४-०१-७२-०४५६१" }],
    "full_name": [{ "snippet": "नाम थर: सिता शर्मा" }],
    "date_of_birth": [{ "snippet": "जन्म मिति: २०५०-०८-२२" }],
    "sex": [{ "snippet": "लिङ्ग: महिला" }]
  }
}
`;

  const userContent = `You will now receive the extraction schema, extraction settings, parse configuration summary, and the OCR text of a single document.

Schema (fields to extract)
For each field, you are given its name, type, and description. Use these to decide what to pull from the OCR text.

${schemaLines}

Extraction Settings
These settings control how you structure the output:

Include Images: ${req.settings?.includeImages || false}
Optimize for Latency: ${req.settings?.optimizeForLatency || false}
Array Extract: ${req.settings?.arrayExtract || false}
Include Citations: ${req.settings?.includeCitations || false}

If Array Extract is true, treat repeating entities as arrays (notices, parcels, entries, etc.).

Parse Configuration (context only)
The OCR/parse system has used the following configuration:

Agentic: ${req.parseConfig?.agentic || false}
Figure: ${req.parseConfig?.figure || false}
Table: ${req.parseConfig?.table || false}
Text: ${req.parseConfig?.text || false}
Summarize Figures: ${req.parseConfig?.summarizeFigures || true}
Intelligent Ordering: ${req.parseConfig?.intelligentOrdering || false}
Chunking: ${req.parseConfig?.chunking || false}
Filter Blocks: ${req.parseConfig?.filterBlocks || '[]'}
Embedding Optimized: ${req.parseConfig?.embeddingOptimized || false}
Add Page Markers: ${req.parseConfig?.addPageMarkers || false}
Merge Tables: ${req.parseConfig?.mergeTables || false}
Table Output Format: ${req.parseConfig?.tableOutputFormat || 'dynamic'}
Detect Formatting: ${req.parseConfig?.detectFormatting || '[]'}
Include Cell Metadata: ${req.parseConfig?.includeCellMetadata || false}
Exclude Hidden Content: ${req.parseConfig?.excludeHiddenContent || false}
Split Large Tables: ${req.parseConfig?.splitLargeTables || false} (size ${req.parseConfig?.splitSize || 50})
Table Clustering Mode: ${req.parseConfig?.tableClusteringMode || 'default'}
Max Cell Count: ${req.parseConfig?.maxCellCount || 'null'}
Extraction Mode: ${req.parseConfig?.extractionMode || 'hybrid'}
OCR System: ${req.parseConfig?.ocrSystem || 'standard'}
Return OCR Data: ${req.parseConfig?.returnOcrData || false}
Return Images: ${req.parseConfig?.returnImages || '[]'}
Embed PDF Metadata: ${req.parseConfig?.embedPdfMetadata || false}
Timeout Seconds: ${req.parseConfig?.timeoutSeconds || 900}
Page Range: ${req.parseConfig?.pageRange || 'all'}

Use this only as hints about the quality and structure of the OCR—do not attempt to re-run OCR yourself.

Rules for JSON output
- Output exactly one JSON object.
- Do not wrap JSON in backticks or quotes.
- Do not include commentary before or after the JSON.
- The top-level JSON object must contain all field keys in the schema, alongside the mandatory _confidence and _citations objects.

OCR TEXT (single document)
Below is the full OCR text of the document. Use it, together with the schema above, to build your final JSON:

${ocrText}
`;

  return callOllamaJson(systemMessage, userContent);
}
