"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Plus, Trash2, ArrowRight, Settings2, GripVertical, Brain, Database, FileText, Webhook, X, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const AVAILABLE_STEPS = [
  { id: 'ocr', name: 'OCR Extraction', type: 'extraction', icon: FileText, desc: 'Extract raw text and bounding boxes from documents.' },
  { id: 'llm', name: 'LLM Processing', type: 'processing', icon: Brain, desc: 'Run extracted text through a local or cloud LLM for structured JSON.' },
  { id: 'normalize', name: 'Data Normalization', type: 'processing', icon: LayoutTemplate, desc: 'Clean up dates, currencies, and standardize text formatting.' },
  { id: 'db_export', name: 'Database Export', type: 'export', icon: Database, desc: 'Push structured data directly to MySQL or Postgres.' },
  { id: 'webhook', name: 'Webhook Trigger', type: 'export', icon: Webhook, desc: 'Send a POST request with the extracted payload to an external service.' }
];

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPipeline = () => {
    if (params.id) {
      fetch(`/api/pipelines/${params.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.pipeline) {
            // Normalize steps to objects if they are strings (from old schema)
            const normalizedSteps = data.pipeline.steps.map((step: any) => {
              if (typeof step === 'string') {
                return { id: Date.now().toString() + Math.random(), name: step, type: 'legacy', config: {} };
              }
              return step;
            });
            setPipeline({ ...data.pipeline, steps: normalizedSteps });
          } else {
            setPipeline(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setPipeline(null);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!pipeline) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Pipeline not found. <Button variant="link" onClick={() => router.push("/pipelines")} className="rounded-none">Go back</Button>
      </div>
    );
  }

  const togglePipelineStatus = async () => {
    const newStatus = pipeline.status === 'Active' ? 'Paused' : 'Active';
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setPipeline({ ...pipeline, status: newStatus });
        toast.success(`Pipeline ${newStatus.toLowerCase()}`);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const syncStepsToBackend = async (newSteps: any[]) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: newSteps })
      });
      if (res.ok) {
        setPipeline({ ...pipeline, steps: newSteps });
        toast.success("Pipeline steps saved");
      } else {
        toast.error('Failed to save pipeline steps');
      }
    } catch (error) {
      toast.error('Failed to save pipeline steps');
    } finally {
      setIsUpdating(false);
      setShowAddModal(false);
      setSelectedStepId(null);
    }
  };

  const handleConfirmAddStep = () => {
    if (!selectedStepId) return;
    const stepDef = AVAILABLE_STEPS.find(s => s.id === selectedStepId);
    if (!stepDef) return;

    const newStep = {
      id: Date.now().toString(),
      name: stepDef.name,
      type: stepDef.type,
      config: {}
    };

    syncStepsToBackend([...pipeline.steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = [...pipeline.steps];
    newSteps.splice(index, 1);
    syncStepsToBackend(newSteps);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 relative">
      <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium mb-2">
        <Link href="/pipelines" className="hover:text-foreground transition-colors flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" /> Pipelines
        </Link>
        <span>/</span>
        <span className="text-foreground">{pipeline.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{pipeline.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className={`inline-flex items-center gap-1 ${pipeline.status === 'Active' ? 'text-success' : 'text-warning'}`}>
              <span className={`w-2 h-2 rounded-none ${pipeline.status === 'Active' ? 'bg-success' : 'bg-warning'}`}></span>
              {pipeline.status}
            </span>
            <span>•</span>
            <span>{pipeline.runs} Total Runs</span>
            <span>•</span>
            <span>{pipeline.successRate} Success Rate</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-none border-border text-foreground shadow-sm" onClick={togglePipelineStatus}>
            {pipeline.status === "Active" ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {pipeline.status === "Active" ? "Pause" : "Run"}
          </Button>
          <Button className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            Deploy Pipeline
          </Button>
        </div>
      </div>

      <div className="mt-8 border border-border bg-card shadow-sm flex flex-col min-h-[500px] rounded-none relative">
        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
          </div>
        )}
        <div className="border-b border-border bg-muted/30 p-4 flex items-center justify-between z-10">
          <h3 className="font-semibold text-sm">Pipeline Builder</h3>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="rounded-none h-8 text-xs border-border">
            <Plus className="w-3 h-3 mr-1" /> Add Step
          </Button>
        </div>

        <div className="flex-1 p-8 bg-[url('/grid.svg')] relative overflow-hidden flex flex-col items-center">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #003C8D 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10 w-full max-w-lg space-y-4">
            {pipeline.steps.length === 0 && (
              <div className="text-center p-8 bg-background border border-dashed border-border text-muted-foreground text-sm">
                No steps configured yet. Click "Add Step" to begin building your pipeline.
              </div>
            )}
            {pipeline.steps.map((step: any, index: number) => {
              // Map legacy strings to a default icon
              const iconMatch = AVAILABLE_STEPS.find(s => s.name === step.name);
              const StepIcon = iconMatch ? iconMatch.icon : Settings2;

              return (
                <div key={step.id || index} className="flex flex-col items-center">
                  <div className="w-full bg-background border border-border shadow-sm p-4 flex items-center group relative hover:border-primary/50 transition-colors rounded-none">
                    <GripVertical className="w-4 h-4 text-muted-foreground mr-3 cursor-grab opacity-30 group-hover:opacity-100" />
                    
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center mr-4 rounded-none border border-primary/20">
                      <StepIcon className="w-4 h-4 text-primary" />
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{step.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Automated Step {index + 1} {step.type && `• ${step.type}`}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" title="Configure Step">
                        <Settings2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:text-destructive" onClick={() => handleRemoveStep(index)} title="Remove Step">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {index < pipeline.steps.length - 1 && (
                    <div className="py-2 text-muted-foreground/30">
                      <ArrowRight className="w-5 h-5 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Step Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-2xl p-6 border border-border shadow-lg rounded-none relative flex flex-col max-h-[85vh]">
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => setShowAddModal(false)}>
              <X className="w-4 h-4" />
            </Button>
            
            <h2 className="text-xl font-bold mb-2">Add Pipeline Step</h2>
            <p className="text-sm text-muted-foreground mb-6">Select a module to add to your extraction pipeline sequence.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
              {AVAILABLE_STEPS.map(step => (
                <div 
                  key={step.id} 
                  className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors ${selectedStepId === step.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 bg-muted/20 hover:bg-muted/40'}`}
                  onClick={() => setSelectedStepId(step.id)}
                >
                  <div className={`w-10 h-10 flex items-center justify-center border shrink-0 ${selectedStepId === step.id ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground'}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{step.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                  <div className="pt-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedStepId === step.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                      {selectedStepId === step.id && <div className="w-1.5 h-1.5 bg-background rounded-full"></div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-none transition-colors duration-200">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmAddStep} 
                disabled={!selectedStepId || isUpdating}
                className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
              >
                {isUpdating ? 'Adding...' : 'Add Step to Pipeline'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
