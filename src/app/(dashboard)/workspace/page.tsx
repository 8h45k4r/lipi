"use client";

import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Plus,
  Minus,
  Settings2,
  FileCode,
  LayoutTemplate,
  Trash,
  Play,
  Upload,
  Copy,
  Download,
  Code,
  Loader2,
  AlertCircle,
  Check,
  Edit2,
  Save,
  X,
  Eye,
  CheckCircle2,
  RotateCcw,
  CheckSquare
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { toast } from "sonner";

const PdfDocument = dynamic(
  () => import("@/components/workspace/pdf-document"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-4 text-xs text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
        <span>Loading PDF viewer...</span>
      </div>
    )
  }
);

const ToggleOption = ({ label, checked, onChange, description }: { label: string, checked: boolean, onChange: () => void, description?: string }) => (
  <div className="flex items-center justify-between">
    <div className="space-y-0.5 pr-4">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <div className={`w-9 h-5 border border-border relative shrink-0 cursor-pointer transition-colors duration-200 rounded-none ${checked ? 'bg-primary' : 'bg-muted'}`} onClick={onChange}>
      <div className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${checked ? 'left-[17px]' : 'left-[1px]'}`}></div>
    </div>
  </div>
);

const InputOption = ({ label, value, onChange, placeholder, description }: { label: string, value: string | number, onChange: (val: string) => void, placeholder?: string, description?: string }) => (
  <div className="space-y-1.5 w-full">
    <div className="space-y-0.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-border px-2 py-1 text-sm bg-background rounded-none" />
  </div>
);

const SelectOption = ({ label, value, onChange, options, description }: { label: string, value: string, onChange: (val: string) => void, options: {label: string, value: string}[], description?: string }) => (
  <div className="space-y-1.5 w-full">
    <div className="space-y-0.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border px-2 py-1 text-sm bg-background rounded-none">
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

function OcrWorkspaceContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("docId");
  const { documents } = useApp();
  
  const [activeTab, setActiveTab] = useState("configuration");
  const [mode, setMode] = useState("extract"); // 'parse' or 'extract'
  const [schemaFields, setSchemaFields] = useState([
    { id: 1, name: "document_type", type: "string", description: "The type of document (e.g. Gazette, Citizenship, Land Record)." },
    { id: 2, name: "volume", type: "string", description: "The volume number of the gazette." },
    { id: 3, name: "issue_number", type: "string", description: "The issue number." },
    { id: 4, name: "publication_date", type: "string", description: "The date the document was published or registered." },
    { id: 5, name: "ministry", type: "string", description: "The ministry or department issuing the document." },
    { id: 6, name: "notices", type: "array of objects", description: "A list of all individual notices, laws, or announcements contained in the document. Each object should have a 'title' and a 'summary'." }
  ]);
  const [newFieldName, setNewFieldName] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);
  const [resultsView, setResultsView] = useState("formatted"); // 'formatted' or 'json'
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Record<string, boolean>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleAcceptField = (fieldName: string) => {
    setAcceptedFields(prev => ({ ...prev, [fieldName]: true }));
    toast.success(`Accepted ${fieldName}`);
  };

  const handleStartEdit = (fieldName: string, currentValue: any) => {
    setEditingField(fieldName);
    setEditValue(typeof currentValue === 'object' ? JSON.stringify(currentValue) : String(currentValue ?? ''));
  };

  const handleSaveEdit = (fieldName: string) => {
    let parsedValue: any = editValue;
    try {
      if (editValue.startsWith('{') || editValue.startsWith('[')) {
        parsedValue = JSON.parse(editValue);
      }
    } catch (e) {
      // Keep string if not valid JSON
    }
    
    const updatedData = {
      ...extractionData,
      [fieldName]: parsedValue
    };
    
    setExtractionData(updatedData);
    setAnimatedText(JSON.stringify(updatedData, null, 2));
    setAcceptedFields(prev => ({ ...prev, [fieldName]: true }));
    setEditingField(null);
    toast.success(`Updated ${fieldName}`);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const getCitationSnippet = (citation: any): string => {
    if (!citation) return "No citation snippet available";
    if (typeof citation === "string") return citation;
    if (Array.isArray(citation)) {
      const snippets = citation
        .map(item => typeof item === "string" ? item : item?.snippet || JSON.stringify(item))
        .filter(Boolean);
      return snippets.length > 0 ? snippets.join("; ") : "No citation snippet available";
    }
    if (typeof citation === "object" && citation.snippet) {
      return citation.snippet;
    }
    return JSON.stringify(citation);
  };

  const [includeImages, setIncludeImages] = useState(false);
  const [optimizeLatency, setOptimizeLatency] = useState(false);
  const [arrayExtract, setArrayExtract] = useState(false);
  const [includeCitations, setIncludeCitations] = useState(true);

  // Basic Parse Settings
  const [parseAgentic, setParseAgentic] = useState(false);
  const [parseTable, setParseTable] = useState(false);
  const [parseFigure, setParseFigure] = useState(false);
  const [parseChunking, setParseChunking] = useState(false);

  // Enhance
  const [parseSummarizeFigures, setParseSummarizeFigures] = useState(true);
  const [parseIntelligentOrdering, setParseIntelligentOrdering] = useState(false);
  const [parseText, setParseText] = useState(false);
  
  // Retrieval
  const [parseFilterBlocks, setParseFilterBlocks] = useState("[]");
  const [parseEmbeddingOptimized, setParseEmbeddingOptimized] = useState(false);

  // Formatting
  const [parseAddPageMarkers, setParseAddPageMarkers] = useState(false);
  const [parseMergeTables, setParseMergeTables] = useState(false);
  const [parseTableOutputFormat, setParseTableOutputFormat] = useState("dynamic");
  const [parseDetectFormatting, setParseDetectFormatting] = useState("[]");

  // Spreadsheet
  const [parseIncludeCellMetadata, setParseIncludeCellMetadata] = useState(false);
  const [parseExcludeHiddenContent, setParseExcludeHiddenContent] = useState(false);
  const [parseSplitLargeTables, setParseSplitLargeTables] = useState(true);
  const [parseSplitSize, setParseSplitSize] = useState<number | string>(50);
  const [parseTableClusteringMode, setParseTableClusteringMode] = useState("accurate");
  const [parseMaxCellCount, setParseMaxCellCount] = useState<number | string>("null");

  // Settings
  const [parseExtractionMode, setParseExtractionMode] = useState("hybrid");
  const [parseOcrSystem, setParseOcrSystem] = useState("standard");
  const [parseReturnOcrData, setParseReturnOcrData] = useState(false);
  const [parseReturnImages, setParseReturnImages] = useState("[]");
  const [parseEmbedPdfMetadata, setParseEmbedPdfMetadata] = useState(false);
  const [parseTimeoutSeconds, setParseTimeoutSeconds] = useState<number | string>(900);
  const [parsePageRangeStart, setParsePageRangeStart] = useState("");
  const [parsePageRangeEnd, setParsePageRangeEnd] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [animatedText, setAnimatedText] = useState("");

  const [systemPrompt, setSystemPrompt] = useState("Be precise and thorough.");
  const [extractionData, setExtractionData] = useState<any>(null);
  const [extractionReasoning, setExtractionReasoning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [stats, setStats] = useState<{ duration: number; tokens: number } | null>(null);

  const [fetchedDoc, setFetchedDoc] = useState<any>(null);
  const [isDocLoading, setIsDocLoading] = useState(true);
  const [docNotFound, setDocNotFound] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  useEffect(() => {
    if (!docId) {
      setDocNotFound(true);
      setDocError("No document ID specified in URL.");
      setIsDocLoading(false);
      return;
    }
    
    setIsDocLoading(true);
    setDocNotFound(false);
    setDocError(null);
    setPdfError(null);
    
    fetch(`/api/documents/${docId}`)
      .then(res => {
        if (!res.ok) throw new Error("Document could not be found or fetched.");
        return res.json();
      })
      .then(data => {
        setFetchedDoc(data.document || data);
        setIsDocLoading(false);
        
        // Populate latest extraction if exists
        const latest = data.document?.latestExtraction;
        if (latest) {
          setHasRun(true);
          setActiveTab("results");
          setExtractionData(latest.data);
          setAnimatedText(JSON.stringify(latest.data, null, 2));
          setStats(latest.metrics);
        }
      })
      .catch((err: any) => {
        setDocNotFound(true);
        setDocError(err.message || "Failed to load document.");
        setIsDocLoading(false);
      });
  }, [docId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const currentDoc = fetchedDoc || documents.find(d => d.id === docId);
  const documentName = currentDoc ? currentDoc.name : "Select a document from Dashboard";

  const addField = () => {
    if (newFieldName.trim()) {
      setSchemaFields([...schemaFields, { id: Date.now(), name: newFieldName.trim(), type: "string", description: "" }]);
      setNewFieldName("");
      setIsAddingField(false);
    }
  };

  const deleteField = (id: number) => {
    setSchemaFields(schemaFields.filter(f => f.id !== id));
  };

  const handleRun = async () => {
    if (!docId) {
      setErrorMessage("No document selected.");
      setActiveTab("results");
      return;
    }

    setActiveTab("results");
    setHasRun(true);
    setIsProcessing(true);
    setAnimatedText("");
    setErrorMessage(null);
    setExtractionData(null);
    setExtractionReasoning(null);
    setStats(null);
    
    const parseConfigPayload = {
      agentic: parseAgentic,
      table: parseTable,
      figure: parseFigure,
      chunking: parseChunking,
      summarizeFigures: parseSummarizeFigures,
      intelligentOrdering: parseIntelligentOrdering,
      text: parseText,
      filterBlocks: parseFilterBlocks,
      embeddingOptimized: parseEmbeddingOptimized,
      addPageMarkers: parseAddPageMarkers,
      mergeTables: parseMergeTables,
      tableOutputFormat: parseTableOutputFormat,
      detectFormatting: parseDetectFormatting,
      includeCellMetadata: parseIncludeCellMetadata,
      excludeHiddenContent: parseExcludeHiddenContent,
      splitLargeTables: parseSplitLargeTables,
      splitSize: typeof parseSplitSize === 'string' ? parseInt(parseSplitSize) || 50 : parseSplitSize,
      tableClusteringMode: parseTableClusteringMode,
      maxCellCount: parseMaxCellCount === "null" || parseMaxCellCount === "" ? null : (typeof parseMaxCellCount === 'string' ? parseInt(parseMaxCellCount) || null : parseMaxCellCount),
      extractionMode: parseExtractionMode,
      ocrSystem: parseOcrSystem,
      returnOcrData: parseReturnOcrData,
      returnImages: parseReturnImages,
      embedPdfMetadata: parseEmbedPdfMetadata,
      timeoutSeconds: typeof parseTimeoutSeconds === 'string' ? parseInt(parseTimeoutSeconds) || 900 : parseTimeoutSeconds,
      pageRangeStart: parsePageRangeStart,
      pageRangeEnd: parsePageRangeEnd
    };

    if (mode === "parse") {
      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId,
            parseConfig: parseConfigPayload
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to parse document");
        }

        setAnimatedText(JSON.stringify(result, null, 2));
        setStats({
          duration: result.totalDurationSeconds || 0,
          tokens: (result.promptTokens || 0) + (result.completionTokens || 0)
        });
        toast.success("Document parsed successfully!");
      } catch (error: any) {
        setErrorMessage(error.message || "An unexpected error occurred during parsing.");
        toast.error(error.message || "Parsing failed");
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId,
            fields: schemaFields,
            systemPrompt,
            settings: {
              includeImages,
              optimizeForLatency: optimizeLatency,
              arrayExtract,
              includeCitations
            },
            parseConfig: parseConfigPayload
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to extract data");
        }

        setExtractionData(result.data);
        setExtractionReasoning(result.raw || result.reasoning || null);
        setAnimatedText(JSON.stringify(result, null, 2));
        setStats({
          duration: result.metrics?.totalDurationSeconds || 0,
          tokens: (result.metrics?.promptTokens || 0) + (result.metrics?.completionTokens || 0)
        });
        toast.success("Data extracted successfully!");
      } catch (error: any) {
        setErrorMessage(error.message || "An unexpected error occurred during extraction.");
        toast.error(error.message || "Extraction failed");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleFeedback = async (value: 'up' | 'down') => {
    try {
      const extId = extractionData?.id || 1;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, extractionId: extId, value })
      });
      if (res.ok) {
        toast.success("Feedback submitted!");
      } else {
        toast.error("Failed to submit feedback");
      }
    } catch (error) {
      toast.error("Failed to submit feedback");
    }
  };

  const handleCopyResult = () => {
    if (!animatedText) return;
    navigator.clipboard.writeText(animatedText).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  const handleDownloadResult = () => {
    if (!animatedText) return;
    const blob = new Blob([animatedText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction_${docId || 'result'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download started");
  };

  const getRowConfidenceStyle = (confidence: any) => {
    if (confidence === undefined || confidence === null) {
      return {
        rowClass: "bg-card border-border border-l-4 border-l-muted-foreground/40",
        badgeClass: "bg-muted text-muted-foreground border-border",
        label: "N/A"
      };
    }
    const num = typeof confidence === 'number' ? confidence : parseFloat(confidence);
    if (isNaN(num)) {
      return {
        rowClass: "bg-card border-border border-l-4 border-l-muted-foreground/40",
        badgeClass: "bg-muted text-muted-foreground border-border",
        label: "N/A"
      };
    }
    const label = `${(num * 100).toFixed(0)}%`;
    if (num >= 0.90) {
      return {
        rowClass: "bg-emerald-500/5 border-emerald-500/30 text-foreground border-l-4 border-l-emerald-600 dark:bg-emerald-950/10",
        badgeClass: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-mono font-semibold",
        label
      };
    } else if (num >= 0.70) {
      return {
        rowClass: "bg-amber-500/5 border-amber-500/30 text-foreground border-l-4 border-l-amber-500 dark:bg-amber-950/10",
        badgeClass: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-mono font-semibold",
        label
      };
    } else {
      return {
        rowClass: "bg-rose-500/5 border-rose-500/30 text-foreground border-l-4 border-l-rose-600 dark:bg-rose-950/10",
        badgeClass: "bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 font-mono font-semibold",
        label
      };
    }
  };

  const renderExtractedData = () => {
    if (errorMessage) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-destructive/10 border border-destructive/30 rounded-none m-2 space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-destructive">Processing Error</h4>
            <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-none text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleRun}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Request
          </Button>
        </div>
      );
    }

    if (mode === "extract" && isReviewMode) {
      const fieldsToDisplay = extractionData 
        ? Object.keys(extractionData).filter(key => key !== '_confidence' && key !== '_citations')
        : [];

      return (
        <div className="flex-1 space-y-4 overflow-auto p-4">
          <div className="bg-muted/40 border border-border p-3 flex items-center justify-between rounded-none shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">HITL Review Mode</h4>
                <p className="text-[11px] text-muted-foreground">Verify, accept, or edit extracted values with inline speed.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono font-medium">
                {Object.keys(acceptedFields).length} / {fieldsToDisplay.length} Accepted
              </span>
            </div>
          </div>

          {fieldsToDisplay.length === 0 ? (
            <div className="text-center p-8 text-sm text-muted-foreground border border-border bg-card">
              No extracted fields to review. Run extraction first.
            </div>
          ) : (
            <div className="space-y-3">
              {fieldsToDisplay.map((fieldName) => {
                const rawValue = extractionData[fieldName];
                const confidence = extractionData._confidence?.[fieldName];
                const citation = extractionData._citations?.[fieldName];
                const citationSnippet = getCitationSnippet(citation);
                const isAccepted = !!acceptedFields[fieldName];
                const isEditing = editingField === fieldName;

                const { rowClass, badgeClass, label: confidenceLabel } = getRowConfidenceStyle(confidence);

                return (
                  <div 
                    key={fieldName} 
                    className={`border p-3.5 shadow-sm transition-all duration-200 rounded-none ${rowClass}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">{fieldName}</span>
                          <span className={`px-2 py-0.5 text-[11px] border rounded-none ${badgeClass}`}>
                            {confidenceLabel} Confidence
                          </span>
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 rounded-none">
                              <Check className="w-3 h-3" /> Accepted
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditing && (
                          <>
                            <Button 
                              size="sm" 
                              variant={isAccepted ? "secondary" : "outline"}
                              className={`h-7 px-2.5 text-xs font-medium rounded-none ${isAccepted ? 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 border border-emerald-600/30' : 'border-border hover:text-emerald-600 hover:border-emerald-600'}`}
                              onClick={() => handleAcceptField(fieldName)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> {isAccepted ? "Accepted" : "Accept"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2.5 text-xs font-medium rounded-none border-border hover:bg-muted"
                              onClick={() => handleStartEdit(fieldName, rawValue)}
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Extracted Value</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(fieldName);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="flex-1 text-xs font-mono px-2 py-1.5 border border-primary bg-background text-foreground rounded-none focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            placeholder="Enter value..."
                          />
                          <Button 
                            size="sm" 
                            className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-none shrink-0"
                            onClick={() => handleSaveEdit(fieldName)}
                            title="Save (Enter)"
                          >
                            <Save className="w-3.5 h-3.5 mr-1" /> Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2.5 text-xs rounded-none border border-border hover:bg-muted shrink-0"
                            onClick={handleCancelEdit}
                            title="Cancel (Esc)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="p-2 bg-background/80 border border-border/80 text-xs font-mono break-all text-foreground cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => handleStartEdit(fieldName, rawValue)}
                          title="Click to inline edit"
                        >
                          {rawValue !== undefined && rawValue !== null 
                            ? (typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue)) 
                            : <span className="italic text-muted-foreground">null</span>
                          }
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/40">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Citation Snippet</span>
                      <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 border border-border/40 font-sans">
                        "{citationSnippet}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (mode === "parse" || resultsView === 'json') {
      return (
        <div className="flex-1 bg-muted/30 border border-border p-4 font-mono text-xs overflow-auto whitespace-pre shadow-sm">
          {animatedText || "// No output data yet. Click Run to process."}
        </div>
      );
    }

    return (
      <div className="flex-1 space-y-6 overflow-auto p-4">
        {extractionReasoning && (
          <div className="border border-border bg-card shadow-sm rounded-none">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full bg-muted/30 p-2 text-xs font-semibold text-muted-foreground border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span>Extraction Reasoning</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showReasoning ? 'rotate-90' : ''}`} />
            </button>
            {showReasoning && (
              <div className="p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                {extractionReasoning}
              </div>
            )}
          </div>
        )}

        <div className="border border-border bg-card shadow-sm overflow-hidden rounded-none">
          <div className="bg-muted/30 p-2 text-xs font-semibold text-muted-foreground border-b border-border">Extracted Data</div>
          <div className="p-4 space-y-4">
            {schemaFields.map((field) => (
              <div key={field.id}>
                <p className="text-xs text-muted-foreground mb-1 font-medium">{field.name}</p>
                {extractionData && extractionData[field.name] !== undefined && extractionData[field.name] !== null ? (
                  <p className="text-sm font-medium font-mono break-all bg-muted/20 p-2 border border-border/50">
                    {typeof extractionData[field.name] === 'object' 
                      ? JSON.stringify(extractionData[field.name]) 
                      : String(extractionData[field.name])}
                  </p>
                ) : (
                  <p className="text-sm font-medium italic text-muted-foreground">null</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-4rem)] bg-muted/30 overflow-y-auto md:overflow-hidden">
      
      {/* LEFT COLUMN: Thumbnails */}
      <div className="w-64 border-r border-border bg-card flex-col hidden xl:flex shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Pages</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:text-primary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {numPages ? (
            Array.from(new Array(numPages), (el, index) => index + 1).map((pageNumber) => (
              <div 
                key={`thumb_${pageNumber}`} 
                className="relative group cursor-pointer"
                onClick={() => setCurrentPage(pageNumber)}
              >
                <div className={`w-full bg-muted overflow-hidden relative shadow-sm flex items-center justify-center rounded-none ${currentPage === pageNumber ? 'border-2 border-primary' : 'border border-border group-hover:border-primary/50 transition-colors'}`}>
                  <PdfDocument 
                    file={fetchedDoc?.storagePath || `/uploads/${docId}.pdf`}
                    pageNumber={pageNumber}
                    width={150}
                  />
                </div>
                <div className={`text-center mt-2 text-xs font-medium ${currentPage === pageNumber ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {pageNumber} / {numPages}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center mt-4">Loading pages...</div>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Document Viewer */}
      <div className="flex-1 flex flex-col bg-muted/10 relative min-h-[450px] md:min-h-0">
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 overflow-x-auto gap-4 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <Link href={currentDoc?.projectId ? `/projects/${currentDoc.projectId}` : "/dashboard"} className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap text-sm font-medium flex items-center">
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="max-w-[200px] truncate">{documentName}</span>
            </Link>
          </div>
          <div className="flex bg-muted p-1 border border-border shadow-sm shrink-0 mx-auto md:mx-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-7 text-xs font-medium px-4 rounded-none ${mode === 'parse' ? 'bg-background shadow-sm text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setMode('parse')}
            >
              <Maximize className="h-3 w-3 mr-1.5" /> Parse
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-7 text-xs font-medium px-4 rounded-none ${mode === 'extract' ? 'bg-background shadow-sm text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setMode('extract')}
            >
              <FileCode className="h-3 w-3 mr-1.5" /> Extract
            </Button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex hover:text-primary rounded-none"><Upload className="h-4 w-4" /></Button>
            <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-medium shadow-sm rounded-none">
              Deploy <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
        
        {/* Viewer Area */}
        <div className="flex-1 m-4 border border-border bg-card shadow-sm overflow-hidden relative flex items-center justify-center min-h-[350px]">
          {isProcessing && mode === 'parse' && (
            <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-none flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Parsing document...</p>
            </div>
          )}

          {isDocLoading ? (
            <div className="text-muted-foreground flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-sm">Loading document preview...</p>
            </div>
          ) : docNotFound ? (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-destructive/10 border border-destructive/30 rounded-none m-4 space-y-3 max-w-md">
              <AlertCircle className="h-10 w-10 text-destructive shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-destructive">Document Not Found</h4>
                <p className="text-xs text-muted-foreground">{docError || "The requested document could not be found or loaded."}</p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="rounded-none text-xs border-destructive/40 text-destructive hover:bg-destructive/10 mt-1">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-destructive/10 border border-destructive/30 rounded-none m-4 space-y-3 max-w-md">
              <AlertCircle className="h-10 w-10 text-destructive shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-destructive">PDF Render Error</h4>
                <p className="text-xs text-muted-foreground">{pdfError}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-none text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setPdfError(null)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Preview
              </Button>
            </div>
          ) : fetchedDoc || docId ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center bg-muted/30 p-4">
              {fetchedDoc?.mimeType?.includes('image/') ? (
                <img 
                  src={fetchedDoc.storagePath} 
                  alt={documentName}
                  className="max-w-full h-auto object-contain transition-transform duration-200 shadow-md" 
                  style={{ transform: `scale(${scale})` }} 
                />
              ) : (
                <PdfDocument 
                  file={fetchedDoc?.storagePath || `/uploads/${docId}.pdf`}
                  pageNumber={currentPage}
                  scale={scale}
                  className="shadow-lg border border-border"
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={(err) => setPdfError(err?.message || "Could not render PDF document.")}
                />
              )}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm flex flex-col items-center justify-center">
              <LayoutTemplate className="h-12 w-12 mb-4 opacity-20" />
              <p>No document selected</p>
            </div>
          )}
        </div>
        
        {/* Viewer Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 border border-border p-1 shadow-lg z-20 max-w-[95%] flex-wrap justify-center rounded-none">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs font-medium rounded-none hover:text-primary hover:bg-muted"
            onClick={() => setScale(s => Math.max(0.5, parseFloat((s - 0.15).toFixed(2))))}
            title="Zoom Out (-)"
            disabled={scale <= 0.5}
          >
            <Minus className="h-3.5 w-3.5 mr-1" /> -
          </Button>
          <span className="text-xs font-mono font-medium px-2 text-foreground min-w-[45px] text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs font-medium rounded-none hover:text-primary hover:bg-muted"
            onClick={() => setScale(s => Math.min(3.0, parseFloat((s + 0.15).toFixed(2))))}
            title="Zoom In (+)"
            disabled={scale >= 3.0}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-medium rounded-none border border-border/50 hover:text-primary hover:bg-muted transition-colors ml-1"
            onClick={() => setScale(1.0)}
            title="Fit Width (Reset Scale)"
          >
            Fit Width
          </Button>
          <div className="w-px h-4 bg-border mx-1 hidden sm:block"></div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-none hover:text-primary hover:bg-muted disabled:opacity-40" 
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono font-medium px-2 text-foreground select-none whitespace-nowrap">
            {currentPage} / {numPages || 1}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-none hover:text-primary hover:bg-muted disabled:opacity-40" 
            onClick={() => setCurrentPage(p => Math.min(p + 1, numPages || 1))}
            disabled={currentPage >= (numPages || 1)}
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: Configuration / Results */}
      <div className="w-full md:w-[450px] border-t md:border-l md:border-t-0 border-border bg-card flex flex-col shrink-0 min-h-[500px] md:min-h-0">
        <div className="min-h-[3.5rem] py-2 border-b border-border flex items-center justify-between px-3 md:px-4 text-sm font-medium bg-card/50 shrink-0 flex-wrap gap-y-2 gap-x-2">
          <div className="flex gap-4 md:gap-6 h-full shrink-0">
            <button 
              className={`h-full py-2 border-b-2 transition-colors flex items-center rounded-none font-semibold ${activeTab === 'configuration' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('configuration')}
            >
              Configuration
            </button>
            <button 
              className={`h-full py-2 border-b-2 transition-colors flex items-center rounded-none font-semibold ${activeTab === 'results' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'configuration' ? (
            <div className="p-6 space-y-8">
              
              {mode === 'parse' && (
                <div className="space-y-8">
                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <h4 className="font-semibold text-sm border-b border-border pb-2">Basic Settings</h4>
                    <div className="space-y-4">
                      <ToggleOption label="Agentic Pipeline" checked={parseAgentic} onChange={() => setParseAgentic(!parseAgentic)} description="Use vision language models to enhance extraction accuracy. Increases cost and latency." />
                      <ToggleOption label="Table Extraction" checked={parseTable} onChange={() => setParseTable(!parseTable)} description="Tables with misaligned columns, merged cells that didn't parse correctly, or numbers that appear in wrong columns." />
                      <ToggleOption label="Figure Extraction" checked={parseFigure} onChange={() => setParseFigure(!parseFigure)} description="Charts and graphs that need data extraction, including advanced chart extraction with structured data output." />
                      <ToggleOption label="Chunking" checked={parseChunking} onChange={() => setParseChunking(!parseChunking)} description="Divide documents into smaller, semantically meaningful pieces for LLMs to index and retrieve. Commonly used for RAG." />
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <h4 className="font-semibold text-sm border-b border-border pb-2">Enhance</h4>
                    <div className="space-y-4">
                      <ToggleOption label="Summarize Figures" checked={parseSummarizeFigures} onChange={() => setParseSummarizeFigures(!parseSummarizeFigures)} description="Summarize figures using a small vision language model. Defaults to true." />
                      <ToggleOption label="Intelligent Ordering" checked={parseIntelligentOrdering} onChange={() => setParseIntelligentOrdering(!parseIntelligentOrdering)} description="Use an advanced vision language model to improve reading order accuracy, with a small increase in latency. Defaults to false." />
                      <ToggleOption label="Parse Text" checked={parseText} onChange={() => setParseText(!parseText)} description="Handwritten text, faded scans, documents with unusual fonts, or when you see garbled characters in the output." />
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <h4 className="font-semibold text-sm border-b border-border pb-2">Retrieval</h4>
                    <div className="space-y-4">
                      <InputOption label="Filter Blocks" value={parseFilterBlocks} onChange={setParseFilterBlocks} placeholder="e.g. ['table', 'figure']" description="Block types to exclude from content and embed fields. By default, no blocks are filtered." />
                      <ToggleOption label="Embedding Optimized" checked={parseEmbeddingOptimized} onChange={() => setParseEmbeddingOptimized(!parseEmbeddingOptimized)} description="Optimize output for embedding and retrieval. Defaults to false." />
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <h4 className="font-semibold text-sm border-b border-border pb-2">Formatting</h4>
                    <div className="space-y-4">
                      <ToggleOption label="Add Page Markers" checked={parseAddPageMarkers} onChange={() => setParseAddPageMarkers(!parseAddPageMarkers)} description="Add page markers to the output. Useful for page-specific data extraction. Defaults to false." />
                      <ToggleOption label="Merge Tables" checked={parseMergeTables} onChange={() => setParseMergeTables(!parseMergeTables)} description="Merge consecutive tables with the same number of columns. Defaults to false." />
                      <SelectOption label="Table Output Format" value={parseTableOutputFormat} onChange={setParseTableOutputFormat} options={[{label: 'Dynamic', value: 'dynamic'}, {label: 'Markdown', value: 'markdown'}, {label: 'HTML', value: 'html'}]} description="Format for table output. Defaults to dynamic, which returns Markdown for simpler tables and HTML for more complex tables." />
                      <InputOption label="Detect Formatting" value={parseDetectFormatting} onChange={setParseDetectFormatting} placeholder="e.g. ['bold', 'italic']" description="Formatting types to detect in the output. Change tracking includes strikethrough, underline, etc." />
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <h4 className="font-semibold text-sm border-b border-border pb-2">Spreadsheet</h4>
                    <div className="space-y-4">
                      <ToggleOption label="Include Cell Metadata" checked={parseIncludeCellMetadata} onChange={() => setParseIncludeCellMetadata(!parseIncludeCellMetadata)} description="Include cell color, formula, and dropdown information in the output." />
                      <ToggleOption label="Exclude Hidden Content" checked={parseExcludeHiddenContent} onChange={() => setParseExcludeHiddenContent(!parseExcludeHiddenContent)} description="Exclude hidden sheets, rows, or columns from the output." />
                      <ToggleOption label="Split Large Tables" checked={parseSplitLargeTables} onChange={() => setParseSplitLargeTables(!parseSplitLargeTables)} description="Split large tables into smaller ones for easier processing. Defaults to enabled with size 50." />
                      <InputOption label="Split Size" value={parseSplitSize} onChange={setParseSplitSize} />
                      <SelectOption label="Table Clustering Mode" value={parseTableClusteringMode} onChange={setParseTableClusteringMode} options={[{label: 'Accurate', value: 'accurate'}, {label: 'Fast', value: 'fast'}]} description="Detect and split separate tables within a spreadsheet. Accurate mode uses more powerful models at 5x the default per-cell rate. Defaults to accurate." />
                      <InputOption label="Max Cell Count" value={parseMaxCellCount} onChange={setParseMaxCellCount} placeholder="null or number" description="Maximum total non-empty cells allowed across all sheets. If exceeded, the request is rejected with a 422 error. Set to null to disable the limit. Defaults to null." />
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <h4 className="font-semibold text-sm border-b border-border pb-2">Settings</h4>
                    <div className="space-y-4">
                      <SelectOption label="Extraction Mode" value={parseExtractionMode} onChange={setParseExtractionMode} options={[{label: 'Hybrid', value: 'hybrid'}, {label: 'Native', value: 'native'}, {label: 'OCR', value: 'ocr'}]} description="Mode for text extraction from PDFs. OCR uses optical character recognition only. Hybrid combines OCR with embedded PDF text for best accuracy. Defaults to hybrid." />
                      <SelectOption label="OCR System" value={parseOcrSystem} onChange={setParseOcrSystem} options={[{label: 'Standard', value: 'standard'}, {label: 'Advanced', value: 'advanced'}]} description="Standard is the best multilingual OCR system. Legacy only supports Germanic languages and is available for backwards compatibility. Defaults to standard." />
                      <ToggleOption label="Return OCR Data" checked={parseReturnOcrData} onChange={() => setParseReturnOcrData(!parseReturnOcrData)} description="Return OCR data in the result. Defaults to false." />
                      <InputOption label="Return Images" value={parseReturnImages} onChange={setParseReturnImages} placeholder="e.g. ['tables', 'figures']" description="Return images for the specified block types. By default, no images are returned." />
                      <ToggleOption label="Embed PDF Metadata" checked={parseEmbedPdfMetadata} onChange={() => setParseEmbedPdfMetadata(!parseEmbedPdfMetadata)} description="Embed OCR metadata into the returned PDF. Defaults to false." />
                      <InputOption label="Timeout (Seconds)" value={parseTimeoutSeconds} onChange={setParseTimeoutSeconds} description="Maximum processing time in seconds. Defaults to 900." />
                      <div className="grid grid-cols-2 gap-4">
                        <InputOption label="Page Range Start" value={parsePageRangeStart} onChange={setParsePageRangeStart} placeholder="e.g. 1" description="Pages to process, starting from 1. Defaults to the entire document." />
                        <InputOption label="Page Range End" value={parsePageRangeEnd} onChange={setParsePageRangeEnd} placeholder="e.g. 10" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'extract' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">Schema Builder</h3>
                        <p className="text-xs text-muted-foreground">Define the fields you'd like to extract from the document.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-border"><Upload className="h-3 w-3" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-border"><Copy className="h-3 w-3" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-none border-border"><Trash className="h-3 w-3" /></Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs rounded-none border-border">
                          <Settings2 className="h-3 w-3 mr-1" /> Generate
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border border-border text-sm overflow-x-auto rounded-none">
                      <div className="grid grid-cols-12 gap-2 bg-muted/30 p-2 border-b border-border text-muted-foreground text-xs font-medium min-w-[400px]">
                        <div className="col-span-4">Field</div>
                        <div className="col-span-3">Type</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-1"></div>
                      </div>
                      
                      {schemaFields.map(field => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 p-2 border-b border-border text-xs items-center min-w-[400px]">
                          <div className="col-span-4 font-medium">{field.name}</div>
                          <div className="col-span-3 text-muted-foreground">{field.type}</div>
                          <div className="col-span-4 text-muted-foreground truncate" title={field.description}>{field.description}</div>
                          <div className="col-span-1 flex justify-end">
                            <button onClick={() => deleteField(field.id)} className="text-muted-foreground hover:text-destructive"><Trash className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}

                      {isAddingField ? (
                        <div className="p-2 border-b border-border flex gap-2 min-w-[400px]">
                          <input 
                            type="text" 
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="Field name..."
                            className="flex-1 text-xs px-2 py-1 border border-input focus:outline-none focus:border-primary bg-background rounded-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && addField()}
                          />
                          <Button size="sm" className="h-6 text-xs rounded-none bg-primary text-primary-foreground" onClick={addField}>Save</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs rounded-none" onClick={() => setIsAddingField(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <div 
                          className="p-3 text-center text-xs text-primary font-semibold hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setIsAddingField(true)}
                        >
                          + Add field
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <div>
                      <h3 className="font-semibold text-sm border-b border-border pb-2 mb-3">System Prompt</h3>
                      <p className="text-xs text-muted-foreground mb-3">Provide more context for the document processing block.</p>
                      <textarea 
                        className="w-full h-24 border border-input bg-background px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm rounded-none"
                        placeholder="Be precise and thorough."
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border border-border p-4 bg-muted/10 space-y-4 rounded-none">
                    <div>
                      <h3 className="font-semibold text-sm border-b border-border pb-2 mb-4">Settings</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <label className="text-sm font-medium text-foreground">Include Images</label>
                          <p className="text-xs text-muted-foreground leading-relaxed">Include page images in the extraction context.</p>
                        </div>
                        <div className={`w-9 h-5 border border-border relative shrink-0 cursor-pointer transition-colors duration-200 rounded-none ${includeImages ? 'bg-primary' : 'bg-muted'}`} onClick={() => setIncludeImages(!includeImages)}>
                          <div className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${includeImages ? 'left-[17px]' : 'left-[1px]'}`}></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <label className="text-sm font-medium text-foreground">Optimize for Latency</label>
                        </div>
                        <div className={`w-9 h-5 border border-border relative shrink-0 cursor-pointer transition-colors duration-200 rounded-none ${optimizeLatency ? 'bg-primary' : 'bg-muted'}`} onClick={() => setOptimizeLatency(!optimizeLatency)}>
                          <div className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${optimizeLatency ? 'left-[17px]' : 'left-[1px]'}`}></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <label className="text-sm font-medium text-foreground">Array Extract</label>
                        </div>
                        <div className={`w-9 h-5 border border-border relative shrink-0 cursor-pointer transition-colors duration-200 rounded-none ${arrayExtract ? 'bg-primary' : 'bg-muted'}`} onClick={() => setArrayExtract(!arrayExtract)}>
                          <div className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${arrayExtract ? 'left-[17px]' : 'left-[1px]'}`}></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <label className="text-sm font-medium text-foreground">Include Citations</label>
                        </div>
                        <div className={`w-9 h-5 border border-border relative shrink-0 cursor-pointer transition-colors duration-200 rounded-none ${includeCitations ? 'bg-primary' : 'bg-muted'}`} onClick={() => setIncludeCitations(!includeCitations)}>
                          <div className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${includeCitations ? 'left-[17px]' : 'left-[1px]'}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col relative bg-muted/10">
              {/* Results Toolbar */}
              <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0 flex-wrap gap-2 shadow-sm">
                <div className="flex bg-muted p-1 border border-border items-center">
                  <button 
                    className={`px-3 py-1.5 text-[11px] md:text-xs font-medium flex items-center rounded-none transition-colors ${resultsView === 'formatted' && !isReviewMode ? 'bg-background shadow-sm text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => { setResultsView('formatted'); setIsReviewMode(false); }}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 mr-2" /> Formatted
                  </button>
                  <button 
                    className={`px-3 py-1.5 text-[11px] md:text-xs font-medium flex items-center rounded-none transition-colors ${resultsView === 'json' && !isReviewMode ? 'bg-background shadow-sm text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => { setResultsView('json'); setIsReviewMode(false); }}
                  >
                    <Code className="w-3.5 h-3.5 mr-2" /> JSON
                  </button>
                  {mode === 'extract' && hasRun && (
                    <>
                      <div className="w-px h-4 bg-border mx-1"></div>
                      <button 
                        className={`px-3 py-1.5 text-[11px] md:text-xs font-medium flex items-center rounded-none transition-colors ${isReviewMode ? 'bg-background shadow-sm text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setIsReviewMode(!isReviewMode)}
                      >
                        <CheckSquare className="w-3.5 h-3.5 mr-2" /> Review Mode
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <Button variant="outline" size="sm" className="h-8 text-[11px] md:text-xs rounded-none border-border bg-background hover:bg-muted font-medium" onClick={handleDownloadResult} disabled={!hasRun}>
                    <Download className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-[11px] md:text-xs rounded-none border-border bg-background hover:bg-muted font-medium" onClick={handleCopyResult} disabled={!hasRun}>
                    <Copy className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Copy</span>
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-none flex flex-col items-center justify-center text-muted-foreground space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {mode === 'extract' ? `Extracting... (${elapsedSeconds}s)` : `Parsing... (${elapsedSeconds}s)`}
                  </p>
                </div>
              )}

              {!isProcessing && hasRun ? (
                <div className="flex-1 flex flex-col relative p-4 md:p-6 overflow-auto">
                  {renderExtractedData()}
                  {stats && (
                    <div className="mt-4 p-2 border border-border bg-muted/30 text-center text-xs font-mono font-medium text-muted-foreground shrink-0 rounded-none shadow-sm">
                      Completed in {stats.duration ? stats.duration.toFixed(2) : elapsedSeconds.toFixed(2)}s, tokens used: {stats.tokens}
                    </div>
                  )}
                </div>
              ) : !isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 p-4 md:p-6">
                  <p className="text-sm">Click "Run" to process this document.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-card/50 flex justify-between items-center mt-auto shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Tell us how we did:</span> 
            <button onClick={() => handleFeedback('up')} className="hover:text-emerald-600 hover:bg-emerald-500/10 p-1.5 transition-colors duration-200 rounded-none">👍</button>
            <button onClick={() => handleFeedback('down')} className="hover:text-destructive hover:bg-destructive/10 p-1.5 transition-colors duration-200 rounded-none">👎</button>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-none font-medium text-xs px-5 h-9"
            onClick={handleRun}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-primary-foreground" />
                {mode === 'parse' ? 'Parsing...' : 'Extracting...'}
              </>
            ) : (
              <>
                Run <Play className="h-3.5 w-3.5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OcrWorkspace() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OcrWorkspaceContent />
    </Suspense>
  );
}
