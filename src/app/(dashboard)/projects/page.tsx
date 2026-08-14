"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FolderOpen, Plus, Folder, Trash2, ArrowRight, X, Upload as UploadIcon, FileText, CheckCircle2, Search, LayoutGrid, LayoutList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ProjectsPage() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // New state for Upload/Import modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [uploadTab, setUploadTab] = useState<'upload' | 'import'>('upload');
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("Nepali");

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, description, language })
      });
      if (res.ok) {
        toast.success("Project created successfully");
        setShowCreateModal(false);
        setProjectName("");
        setDescription("");
        setLanguage("Nepali");
        fetchProjects();
      }
    } catch (e) {
      toast.error("Failed to create project");
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete project "${name}" and all its documents?`)) {
      try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        toast.success("Project deleted");
        fetchProjects();
      } catch (e) {
        toast.error("Failed to delete project");
      }
    }
  };

  // Upload modal functions
  const openUploadModal = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectId(projectId);
    setShowUploadModal(true);
    setUploadTab('upload');
  };

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
    if (!e.target.files || !e.target.files.length || !selectedProjectId) return;
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('projectId', selectedProjectId);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        toast.success("File uploaded successfully");
        setShowUploadModal(false);
        fetchProjects(); // refresh doc counts if supported
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed");
    }
  };

  const handleImport = async () => {
    if (!selectedProjectId || selectedDocIds.length === 0) return;
    try {
      const res = await fetch('/api/project-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, docIds: selectedDocIds })
      });
      if (res.ok) {
        toast.success("Documents imported successfully");
        setShowUploadModal(false);
        setSelectedDocIds([]);
        fetchProjects();
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

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase().trim();
    return projects.filter(
      p =>
        p.name?.toLowerCase().includes(term) ||
        p.id?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Organize your documents into projects and collections.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors duration-200 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Control Bar / Search Input & View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 border border-border rounded-none shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter projects by name or ID..."
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

        <div className="flex items-center gap-3">
          <div className="border border-border p-0.5 bg-background flex items-center rounded-none">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 rounded-none text-xs"
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5 mr-1.5" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 rounded-none text-xs"
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              Cards
            </Button>
          </div>

          <span className="font-mono text-xs text-muted-foreground bg-muted px-2.5 py-1 border border-border rounded-none whitespace-nowrap">
            {filteredProjects.length} of {projects.length} projects
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border bg-card rounded-none">
          Loading projects...
        </div>
      ) : viewMode === 'table' ? (
        /* Enterprise Responsive Table */
        <div className="bg-card border border-border shadow-sm rounded-none overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-290px)] overflow-y-auto">
            <table className="w-full text-sm text-left min-w-[750px] border-collapse">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/80 backdrop-blur-sm border-b border-border sticky top-0 z-10 font-semibold select-none">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Project Name / ID</th>
                  <th scope="col" className="px-5 py-3.5">Documents</th>
                  <th scope="col" className="px-5 py-3.5">Last Updated</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProjects.map((proj) => (
                  <tr 
                    key={proj.id} 
                    onClick={() => router.push(`/projects/${proj.id}`)}
                    className="hover:bg-muted/40 transition-colors duration-200 cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 rounded-none group-hover:border-primary/50 transition-colors">
                          <Folder className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 block truncate">
                            {proj.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono block truncate">{proj.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      <span className="font-medium text-foreground">{proj.documents || 0}</span> documents
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {proj.lastUpdated || proj.date || proj.createdAt || 'Recently'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={proj.status || "Active"} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:text-primary rounded-none transition-colors duration-200"
                          onClick={(e) => openUploadModal(proj.id, e)}
                          title="Upload/Import Documents"
                        >
                          <UploadIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:text-destructive rounded-none transition-colors duration-200"
                          onClick={(e) => handleDelete(proj.id, proj.name, e)}
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:text-primary rounded-none transition-colors duration-200"
                          onClick={() => router.push(`/projects/${proj.id}`)}
                          title="View Details"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-muted-foreground">
                      {searchTerm ? (
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 text-muted-foreground/40 mb-1" />
                          <p className="font-medium text-foreground">No projects found matching "{searchTerm}"</p>
                          <p className="text-xs">Try searching for another term or clear search.</p>
                          <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-3 rounded-none">
                            Clear Search
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Folder className="w-8 h-8 text-muted-foreground/40 mb-1" />
                          <p className="font-medium text-foreground">No projects found</p>
                          <p className="text-xs">Create your first project to organize documents.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredProjects.map(proj => (
            <div 
              key={proj.id} 
              onClick={() => router.push(`/projects/${proj.id}`)}
              className="bg-card border border-border p-6 shadow-sm hover:border-primary/50 transition-colors duration-200 cursor-pointer group relative flex flex-col h-[185px] rounded-none"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center border border-primary/20 rounded-none">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:text-primary hover:bg-primary/10 rounded-none"
                    onClick={(e) => openUploadModal(proj.id, e)}
                    title="Upload/Import Documents"
                  >
                    <UploadIcon className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:text-destructive hover:bg-destructive/10 rounded-none"
                    onClick={(e) => handleDelete(proj.id, proj.name, e)}
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-semibold text-lg text-foreground">{proj.name}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{proj.id}</p>
              
              <div className="mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{proj.documents || 0} Documents</span>
                    <span>•</span>
                    <StatusBadge status={proj.status || "Active"} className="py-0.5 px-1.5 text-[10px]" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground border border-dashed border-border bg-card rounded-none">
              No projects found matching current criteria.
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 border border-border shadow-lg rounded-none relative">
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => setShowCreateModal(false)}>
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4 text-foreground">Create Project</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)} 
                  className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="Enter project name" 
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full p-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 min-h-[80px] resize-none"
                  placeholder="Optional description"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Language</label>
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

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-none transition-colors duration-200">
                  Cancel
                </Button>
                <Button onClick={handleCreate} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200">
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer rounded-none"
                  >
                    Choose File
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto border border-border rounded-none p-2 space-y-1 bg-muted/10">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center p-4">No documents available.</p>
                  ) : (
                    documents.map(doc => (
                      <div 
                        key={doc.doc_uid || doc.id} 
                        className={`flex items-center gap-3 p-2 cursor-pointer transition-colors ${selectedDocIds.includes(doc.doc_uid || doc.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}
                        onClick={() => toggleDocSelection(doc.doc_uid || doc.id)}
                      >
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-none ${selectedDocIds.includes(doc.doc_uid || doc.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                          {selectedDocIds.includes(doc.doc_uid || doc.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{doc.name || 'Untitled Document'}</span>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowUploadModal(false)} className="rounded-none transition-colors duration-200">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={selectedDocIds.length === 0}
                    className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
                  >
                    Import Selected ({selectedDocIds.length})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

