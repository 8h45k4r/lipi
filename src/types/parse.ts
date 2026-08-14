export interface ParseConfig {
  agentic?: boolean;
  table?: boolean;
  figure?: boolean;
  text?: boolean;
  summarizeFigures?: boolean;
  intelligentOrdering?: boolean;
  chunking?: boolean;
  filterBlocks?: string[] | string;
  embeddingOptimized?: boolean;
  addPageMarkers?: boolean;
  mergeTables?: boolean;
  tableOutputFormat?: string;
  extractionMode?: string;
  ocrSystem?: string;
  pageRangeStart?: number | string;
  pageRangeEnd?: number | string;

  // Additional OCR & parsing configuration options
  detectFormatting?: string[] | string;
  includeCellMetadata?: boolean;
  excludeHiddenContent?: boolean;
  splitLargeTables?: boolean;
  splitSize?: number;
  tableClusteringMode?: string;
  maxCellCount?: number | null;
  returnOcrData?: boolean;
  returnImages?: string[] | string;
  embedPdfMetadata?: boolean;
  timeoutSeconds?: number;
  pageRange?: string;
}

export interface ParseRequest {
  docId: string;
  parseConfig?: ParseConfig;
}

export interface ParseResponse {
  success: boolean;
  pageCount: number;
  ocrText: string;
  error?: string;
}
