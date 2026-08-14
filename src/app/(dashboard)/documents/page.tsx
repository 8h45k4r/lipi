"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileText, Upload, Trash, X, Loader2, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DocumentItem {
  id: string;
  name: string;
  lang: string;
  pages: number;
  date: string;
  status: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("Nepali");
  const [projectId, setProjectId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Fetch projects for upload dropdown
    fetch("/api/projects")
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        toast.success("Document deleted");
      } else {
        toast.error("Failed to delete document");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("File is required");
      return;
    }
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (projectId) formData.append("projectId", projectId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Document uploaded successfully");
      setShowModal(false);
      setFile(null);
      setFileName("");
      setLanguage("Nepali");
      setProjectId("");
      
      router.push(`/workspace?docId=${data.docId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const term = searchTerm.toLowerCase().trim();
    return documents.filter(
      doc =>
        doc.name?.toLowerCase().includes(term) ||
        doc.id?.toLowerCase().includes(term) ||
        doc.lang?.toLowerCase().includes(term) ||
        doc.status?.toLowerCase().includes(term)
    );
  }, [documents, searchTerm]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage, process, and analyze your raw text documents.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors duration-200 self-start sm:self-auto">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Control Bar / Search Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 border border-border rounded-none shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name, ID, or language..."
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
            {filteredDocuments.length} of {documents.length} documents
          </span>
        </div>
      </div>

      {/* Enterprise Responsive Table */}
      <div className="bg-card border border-border shadow-sm rounded-none overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-290px)] overflow-y-auto">
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
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/40 transition-colors duration-200 group">
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-muted border border-border flex items-center justify-center shrink-0 rounded-none group-hover:border-primary/40 transition-colors">
                        <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <Link href={`/workspace?docId=${doc.id}`} className="font-semibold text-foreground hover:text-primary transition-colors duration-200 truncate block">
                          {doc.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground font-mono block truncate">{doc.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-medium">{doc.lang}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{doc.pages}</td>
                  <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">{doc.date}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive rounded-none transition-colors duration-200" onClick={() => deleteDocument(doc.id)} title="Delete Document">
                      <Trash className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredDocuments.length === 0 && (
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
                        <p className="font-medium text-foreground">No documents in workspace</p>
                        <p className="text-xs">Upload your first document to get started.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 border border-border shadow-lg rounded-none relative">
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4 text-foreground">Upload Document</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select File</label>
                <div className="border border-dashed border-border p-6 text-center hover:bg-muted/50 transition-colors duration-200 relative group rounded-none">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                        setFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <div className="pointer-events-none flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
                    <span className="text-sm text-foreground font-medium">Click to upload or drag and drop</span>
                    <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</span>
                  </div>
                </div>
                {fileName && (
                  <div className="text-sm text-primary flex items-center gap-2 bg-primary/10 p-2 border border-primary/20 rounded-none">
                    <FileText className="w-4 h-4" />
                    <span className="truncate flex-1">{fileName}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                >
                  <option value="Nepali">Nepali</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Maithili">Maithili</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <select 
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                >
                  <option value="">Select a project (Optional)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-none transition-colors duration-200">
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200">
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

