"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Workflow, Plus, Play, Pause, Trash2, X, Search, LayoutGrid, LayoutList, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pipeline } from "@/contexts/app-context";

export default function PipelinesPage() {
  const router = useRouter();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [showModal, setShowModal] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("Manual");

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/pipelines');
      if (res.ok) {
        const data = await res.json();
        setPipelines(data.pipelines || []);
      }
    } catch (error) {
      console.error("Failed to fetch pipelines:", error);
      toast.error("Failed to load pipelines");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleCreate = async () => {
    if (!pipelineName.trim()) {
      toast.error("Pipeline name is required");
      return;
    }
    
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: pipelineName,
          description,
          triggerType
        })
      });
      
      if (res.ok) {
        toast.success("Pipeline created successfully");
        setShowModal(false);
        setPipelineName("");
        setDescription("");
        setTriggerType("Manual");
        fetchPipelines();
      } else {
        toast.error("Failed to create pipeline");
      }
    } catch (error) {
      console.error("Error creating pipeline:", error);
      toast.error("Failed to create pipeline");
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete pipeline "${name}"?`)) {
      try {
        const res = await fetch(`/api/pipelines/${id}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          toast.success("Pipeline deleted");
          fetchPipelines();
        } else {
          toast.error("Failed to delete pipeline");
        }
      } catch (error) {
        console.error("Error deleting pipeline:", error);
        toast.error("Failed to delete pipeline");
      }
    }
  };

  const handleToggle = async (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = currentStatus === "Active" ? "Paused" : "Active";
    
    // Optimistic UI update
    setPipelines(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    
    try {
      const res = await fetch(`/api/pipelines/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error toggling pipeline status:", error);
      toast.error("Failed to update pipeline status");
      // Revert on failure
      fetchPipelines();
    }
  };

  const filteredPipelines = useMemo(() => {
    if (!searchTerm.trim()) return pipelines;
    const term = searchTerm.toLowerCase().trim();
    return pipelines.filter(
      p =>
        p.name?.toLowerCase().includes(term) ||
        p.id?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.triggerType?.toLowerCase().includes(term)
    );
  }, [pipelines, searchTerm]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Automate document processing workflows and extraction pipelines.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors duration-200 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Pipeline
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
            placeholder="Filter pipelines by name, ID, or trigger..."
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
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 rounded-none text-xs"
              onClick={() => setViewMode('cards')}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              Cards
            </Button>
          </div>

          <span className="font-mono text-xs text-muted-foreground bg-muted px-2.5 py-1 border border-border rounded-none whitespace-nowrap">
            {filteredPipelines.length} of {pipelines.length} pipelines
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border bg-card rounded-none">
          Loading pipelines...
        </div>
      ) : viewMode === 'table' ? (
        /* Enterprise Responsive Table Layout */
        <div className="bg-card border border-border shadow-sm rounded-none overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-290px)] overflow-y-auto">
            <table className="w-full text-sm text-left min-w-[800px] border-collapse">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/80 backdrop-blur-sm border-b border-border sticky top-0 z-10 font-semibold select-none">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Pipeline Name / ID</th>
                  <th scope="col" className="px-5 py-3.5">Trigger</th>
                  <th scope="col" className="px-5 py-3.5">Steps</th>
                  <th scope="col" className="px-5 py-3.5">Runs</th>
                  <th scope="col" className="px-5 py-3.5">Success Rate</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPipelines.map((pipeline) => (
                  <tr 
                    key={pipeline.id} 
                    onClick={() => router.push(`/pipelines/${pipeline.id}`)}
                    className="hover:bg-muted/40 transition-colors duration-200 cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 rounded-none group-hover:border-primary/50 transition-colors">
                          <Workflow className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 block truncate">
                            {pipeline.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono block truncate">{pipeline.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono border border-border bg-muted/30 rounded-none">
                        {pipeline.triggerType || 'Manual'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {pipeline.steps?.length || 1} steps
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono whitespace-nowrap">
                      {pipeline.runs || 0}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono whitespace-nowrap">
                      {pipeline.successRate || '-'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={pipeline.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-none border-border text-foreground h-8 font-medium transition-colors duration-200 text-xs px-2.5" 
                          onClick={(e) => handleToggle(pipeline.id, pipeline.status, e)}
                        >
                          {pipeline.status === "Active" ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                          {pipeline.status === "Active" ? "Pause" : "Run"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:text-destructive rounded-none transition-colors duration-200" 
                          onClick={(e) => handleDelete(pipeline.id, pipeline.name, e)}
                          title="Delete Pipeline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:text-primary rounded-none transition-colors duration-200" 
                          onClick={() => router.push(`/pipelines/${pipeline.id}`)}
                          title="View Details"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPipelines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      {searchTerm ? (
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 text-muted-foreground/40 mb-1" />
                          <p className="font-medium text-foreground">No pipelines found matching "{searchTerm}"</p>
                          <p className="text-xs">Try searching for another keyword or clear search filters.</p>
                          <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-3 rounded-none">
                            Clear Search
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Workflow className="w-8 h-8 text-muted-foreground/40 mb-1" />
                          <p className="font-medium text-foreground">No pipelines found</p>
                          <p className="text-xs">Create your first pipeline to automate workflows.</p>
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
        /* Cards View */
        <div className="grid grid-cols-1 gap-4">
          {filteredPipelines.map(pipeline => (
            <div 
              key={pipeline.id} 
              onClick={() => router.push(`/pipelines/${pipeline.id}`)}
              className="bg-card border border-border p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer hover:border-primary/50 transition-colors duration-200 rounded-none"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center border border-primary/20 rounded-none">
                  <Workflow className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground">{pipeline.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 border border-border rounded-none">{pipeline.id}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <StatusBadge status={pipeline.status} className="py-0 px-2 text-[10px]" />
                    <span>•</span>
                    <span>{pipeline.runs} Runs</span>
                    <span>•</span>
                    <span>{pipeline.successRate} Success Rate</span>
                    <span>•</span>
                    <span>{pipeline.steps?.length || 1} Steps</span>
                    <span>•</span>
                    <span>Trigger: {pipeline.triggerType || 'Manual'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button variant="outline" size="sm" className="rounded-none border-border text-foreground h-9 font-medium transition-colors duration-200" onClick={(e) => handleToggle(pipeline.id, pipeline.status, e)}>
                  {pipeline.status === "Active" ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {pipeline.status === "Active" ? "Pause" : "Run"}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-none h-9 w-9 border border-border opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20" onClick={(e) => handleDelete(pipeline.id, pipeline.name, e)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filteredPipelines.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border bg-card rounded-none">
              No pipelines found matching criteria.
            </div>
          )}
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 border border-border shadow-lg rounded-none relative">
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold mb-4 text-foreground">Create Pipeline</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pipeline Name</label>
                <input 
                  type="text" 
                  value={pipelineName} 
                  onChange={(e) => setPipelineName(e.target.value)} 
                  className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="Enter pipeline name" 
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
                <label className="text-sm font-medium">Trigger Type</label>
                <select 
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                >
                  <option value="Manual">Manual</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Webhook">Webhook</option>
                  <option value="File Upload">File Upload</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-none transition-colors duration-200">
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
    </div>
  );
}

