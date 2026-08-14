"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronLeft, FileText, Upload, Trash, CheckCircle2, AlertCircle, X, Upload as UploadIcon, Eye, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [project, setProject] = useState<{ id: string, name: string, date: string } | null>(null);
  const [projectDocs, setProjectDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Upload/Import Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState<'upload' | 'import'>('upload');
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Viewer Modal State
  const [viewerDocId, setViewerDocId] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<any | null>(null);
  const [viewerTab, setViewerTab] = useState<'formatted' | 'json'>('formatted');
  const [isViewerLoading, setIsViewerLoading] = useState(false);

  const fetchProjectData = () => {
    if (params.id) {
      fetch(`/api/projects/${params.id}`)
        .then(res => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then(data => {
          setProject(data.project);
          setProjectDocs(data.documents || []);
          setLoading(false);
        })
        .catch(() => {
          setProject(null);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [params.id]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch documents");
    }
  };

  useEffect(() => {
    if (showUploadModal && uploadTab === 'import') {
      fetchDocuments();
    }
  }, [showUploadModal, uploadTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !project) return;
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('projectId', project.id);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        toast.success("File uploaded successfully");
        setShowUploadModal(false);
        fetchProjectData();
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed");
    }
  };

  const handleImport = async () => {
    if (!project || selectedDocIds.length === 0) return;
    try {
      const res = await fetch('/api/project-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, docIds: selectedDocIds })
      });
      if (res.ok) {
        toast.success("Documents imported successfully");
        setShowUploadModal(false);
        setSelectedDocIds([]);
        fetchProjectData();
      } else {
        toast.error("Import failed");
      }
    } catch (error) {
      toast.error("Import failed");
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const openUploadModal = () => {
    setShowUploadModal(true);
    setUploadTab('upload');
  };

  const deleteDocument = async (docId: string) => {
    if (confirm("Remove this document from the project?")) {
      try {
        await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
        toast.success("Document removed");
        fetchProjectData();
      } catch {
        toast.error("Failed to remove document");
      }
    }
  };

  const openViewerModal = async (docId: string) => {
    setViewerDocId(docId);
    setViewerData(null);
    setIsViewerLoading(true);
    setViewerTab('formatted');
    
    try {
      const res = await fetch(`/api/documents/${docId}`);
      const data = await res.json();
      if (data.document?.latestExtraction?.data) {
        setViewerData(data.document.latestExtraction.data);
      } else {
        setViewerData({ error: "No extraction data found for this document." });
      }
    } catch (e) {
      setViewerData({ error: "Failed to load data." });
    } finally {
      setIsViewerLoading(false);
    }
  };

  const filteredDocs = useMemo(() => {
    if (!searchTerm.trim()) return projectDocs;
    const term = searchTerm.toLowerCase().trim();
    return projectDocs.filter(doc => {
      const id = doc.id || doc.doc_uid || '';
      return (
        doc.name?.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        doc.lang?.toLowerCase().includes(term) ||
        doc.status?.toLowerCase().includes(term)
      );
    });
  }, [projectDocs, searchTerm]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading project...</div>;
  }
  
  if (!project) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Project not found. <Button variant="link" onClick={() => router.push("/projects")} className="rounded-none">Go back</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <Link href="/projects" className="hover:text-foreground transition-colors flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" /> Projects
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{project.name}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{project.name}</h1>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 border border-border text-muted-foreground rounded-none">{project.id}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{projectDocs.length} Documents • Created {project.date}</p>
        </div>
        <Button onClick={openUploadModal} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm self-start sm:self-auto">
          <Upload className="w-4 h-4 mr-2" />
          Upload to Project
        </Button>
      </div>

      {/* Control Bar / Search Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 border border-border rounded-none shadow-sm mt-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter project documents by name or ID..."
            className="w-full h-9 pl-9 pr-8 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-2.5 py-1 border border-border rounded-none">
            {filteredDocs.length} of {projectDocs.length} documents
          </span>
        </div>
      </div>

      {/* Enterprise Responsive Table */}
      <div className="bg-card border border-border shadow-sm rounded-none overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full text-sm text-left min-w-[750px] border-collapse">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/80 backdrop-blur-sm border-b border-border sticky top-0 z-10 font-semibold select-none">
              <tr>
                <th scope="col" className="px-5 py-3.5">Filename / ID</th>
                <th scope="col" className="px-5 py-3.5">Language</th>
                <th scope="col" className="px-5 py-3.5">Pages</th>
                <th scope="col" className="px-5 py-3.5">Date</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDocs.map((doc) => {
                const docId = doc.id || doc.doc_uid;
                return (
                  <tr key={docId} className="hover:bg-muted/40 transition-colors duration-200 group">
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-muted border border-border flex items-center justify-center shrink-0 rounded-none group-hover:border-primary/40 transition-colors">
                          <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/workspace?docId=${docId}`} className="font-semibold text-foreground hover:text-primary transition-colors duration-200 truncate block">
                            {doc.name}
                          </Link>
                          <span className="text-[11px] text-muted-foreground font-mono block truncate">{docId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium">{doc.lang || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{doc.pages || 1}</td>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">{doc.date || doc.createdAt}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={doc.status || 'Queued'} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-primary rounded-none transition-colors duration-200" onClick={() => openViewerModal(docId)} title="View Extracted Data">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive rounded-none transition-colors duration-200" onClick={() => deleteDocument(docId)} title="Delete Document">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    {searchTerm ? (
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <p className="font-medium text-foreground">No documents found matching "{searchTerm}"</p>
                        <p className="text-xs">Try searching for a different keyword or clear search filters.</p>
                        <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-3 rounded-none">
                          Clear Search
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <p className="font-medium text-foreground">This project is empty</p>
                        <p className="text-xs">Upload a document to get started.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload/Import Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 border border-border shadow-lg rounded-none relative">
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => setShowUploadModal(false)}>
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4 text-foreground">Add Documents</h2>
            
            <div className="flex gap-4 border-b border-border mb-4">
              <button 
                className={`pb-2 text-sm font-medium transition-colors ${uploadTab === 'upload' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setUploadTab('upload')}
              >
                Upload New
              </button>
              <button 
                className={`pb-2 text-sm font-medium transition-colors ${uploadTab === 'import' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setUploadTab('import')}
              >
                Import Existing
              </button>
            </div>

            {uploadTab === 'upload' ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border p-8 text-center bg-muted/20 rounded-none">
                  <UploadIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">Select a file to upload directly to this project.</p>
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="bg-background border border-border px-4 py-2 text-sm cursor-pointer hover:bg-muted transition-colors rounded-none font-medium inline-block"
                  >
                    Browse Files
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto border border-border bg-background rounded-none">
                  {documents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No documents found in workspace.</div>
                  ) : (
                    documents.map(doc => {
                      // Don't show docs already in project
                      if (projectDocs.some(pd => (pd.id || pd.doc_uid) === doc.id)) return null;
                      
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div 
                          key={doc.id} 
                          className={`flex items-center gap-3 p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                          onClick={() => toggleDocSelection(doc.id)}
                        >
                          <div className={`w-4 h-4 border flex items-center justify-center rounded-none ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{doc.id} • {doc.date}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleImport}
                    disabled={selectedDocIds.length === 0}
                    className="rounded-none bg-primary hover:bg-primary/90"
                  >
                    Import {selectedDocIds.length > 0 ? `(${selectedDocIds.length})` : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Viewer Modal */}
      {viewerDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-4xl p-6 border border-border shadow-lg rounded-none relative flex flex-col max-h-[85vh]">
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => setViewerDocId(null)}>
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4 text-foreground">Extracted Data Viewer</h2>

            <div className="flex gap-4 border-b border-border mb-4">
              <button 
                className={`pb-2 text-sm font-medium transition-colors ${viewerTab === 'formatted' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setViewerTab('formatted')}
              >
                Formatted Data
              </button>
              <button 
                className={`pb-2 text-sm font-medium transition-colors ${viewerTab === 'json' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setViewerTab('json')}
              >
                {`{ }`} JSON
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px]">
              {isViewerLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Loading extraction data...</div>
              ) : viewerData?.error ? (
                <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                  <p>{viewerData.error}</p>
                </div>
              ) : viewerTab === 'json' ? (
                <pre className="p-4 bg-muted/20 border border-border text-xs text-foreground overflow-auto font-mono">
                  {JSON.stringify(viewerData, null, 2)}
                </pre>
              ) : (
                <div className="border border-border rounded-none overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2 font-medium">Field</th>
                        <th className="px-4 py-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(viewerData || {}).map((key) => (
                        <tr key={key} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium bg-muted/10 font-mono text-xs">{key}</td>
                          <td className="px-4 py-2">
                            {typeof viewerData[key] === 'object' ? JSON.stringify(viewerData[key]) : String(viewerData[key])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

