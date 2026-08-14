"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  description?: string;
  date: string;
}

export interface Document {
  id: string;
  name: string;
  projectId: string | null;
  pipelineId?: string | null;
  lang: string;
  status: string; // 'Completed', 'Processing', 'Failed', 'Queued'
  date: string;
  confidence: string;
  pages: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  triggerType?: string;
  status: string; // 'Active', 'Paused'
  runs: string;
  successRate: string;
  steps: string[]; // e.g. ['Upload', 'OCR', 'Export']
}

interface AppData {
  projects: Project[];
  documents: Document[];
  pipelines: Pipeline[];
}

const defaultData: AppData = {
  projects: [
    { id: "proj_1", name: "Ministry of Law", description: "Official gazette records and legal documents", date: "2026-08-01" },
    { id: "proj_2", name: "Land Records 2024", description: "Scanned land ownership records (Lalpurja)", date: "2026-07-15" },
    { id: "proj_3", name: "Citizenship Scans", description: "National identity card extraction pipeline", date: "2026-08-05" },
    { id: "proj_4", name: "Historical Archives", description: "Digitization of historical letters and treaties", date: "2026-08-06" },
    { id: "proj_5", name: "Census 2025", description: "Pre-processing forms for upcoming national census", date: "2026-08-06" },
  ],
  documents: [
    { id: "doc_1", name: "Nepal_Gazette_Vol_37.pdf", projectId: "proj_1", pipelineId: "pipe_1", lang: "Nepali", status: "Completed", date: "2026-08-05", confidence: "99.4%", pages: 11 },
    { id: "doc_2", name: "Citizenship_Front_Ram.jpg", projectId: "proj_3", pipelineId: "pipe_2", lang: "Nepali", status: "Completed", date: "2026-08-05", confidence: "98.1%", pages: 1 },
    { id: "doc_3", name: "Lalpurja_Kathmandu_Ward_4.pdf", projectId: "proj_2", pipelineId: "pipe_3", lang: "Nepali", status: "Processing", date: "2026-08-04", confidence: "-", pages: 3 },
    { id: "doc_4", name: "Company_Registration.png", projectId: null, pipelineId: null, lang: "English", status: "Failed", date: "2026-08-04", confidence: "-", pages: 1 },
    { id: "doc_5", name: "Treaty_Sugauli_Scan.pdf", projectId: "proj_4", pipelineId: null, lang: "English", status: "Completed", date: "2026-08-06", confidence: "92.4%", pages: 5 },
    { id: "doc_6", name: "Census_Form_Sample.pdf", projectId: "proj_5", pipelineId: null, lang: "Nepali", status: "Queued", date: "2026-08-06", confidence: "-", pages: 2 },
    { id: "doc_7", name: "Citizenship_Back_Sita.jpg", projectId: "proj_3", pipelineId: "pipe_2", lang: "Nepali", status: "Completed", date: "2026-08-06", confidence: "99.1%", pages: 1 },
    { id: "doc_8", name: "Lalpurja_Lalitpur_Ward_2.pdf", projectId: "proj_2", pipelineId: "pipe_3", lang: "Nepali", status: "Completed", date: "2026-08-06", confidence: "97.5%", pages: 4 },
  ],
  pipelines: [
    { id: "pipe_1", name: "Gazette Extraction", status: "Active", runs: "1.2k", successRate: "99.4%", steps: ["Upload Trigger", "Mistral OCR", "LLM Extraction", "Webhook"] },
    { id: "pipe_2", name: "Citizenship OCR", status: "Paused", runs: "850", successRate: "97.1%", steps: ["Upload Trigger", "Google Vision", "Validation", "PostgreSQL Export"] },
    { id: "pipe_3", name: "Land Record Processing", status: "Active", runs: "3.4k", successRate: "98.8%", steps: ["Upload Trigger", "Tesseract", "Export"] },
  ]
};

interface AppContextType {
  projects: Project[];
  documents: Document[];
  pipelines: Pipeline[];
  isLoaded: boolean;
  addProject: (name: string, description?: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addDocument: (name: string, projectId?: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  addPipeline: (name: string) => void;
  deletePipeline: (id: string) => void;
  togglePipelineStatus: (id: string) => void;
  updatePipelineSteps: (id: string, steps: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({ projects: [], documents: [], pipelines: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lipi_app_data");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        setData(defaultData);
      }
    } else {
      setData(defaultData);
    }
    setIsLoaded(true);
  }, []);

  const saveToStorage = (newData: AppData) => {
    setData(newData);
    localStorage.setItem("lipi_app_data", JSON.stringify(newData));
  };

  const addProject = (name: string, description?: string) => {
    const newProj: Project = { id: `proj_${Date.now()}`, name, description, date: "Just now" };
    saveToStorage({ ...data, projects: [newProj, ...data.projects] });
    toast.success(`Project "${name}" created successfully`);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const newProjects = data.projects.map(p => p.id === id ? { ...p, ...updates } : p);
    saveToStorage({ ...data, projects: newProjects });
    toast.success("Project updated");
  };

  const deleteProject = (id: string) => {
    // Delete project and all associated documents
    const newProjects = data.projects.filter(p => p.id !== id);
    const newDocuments = data.documents.filter(d => d.projectId !== id);
    saveToStorage({ ...data, projects: newProjects, documents: newDocuments });
    toast.success("Project deleted");
  };

  const addDocument = (name: string, projectId?: string) => {
    const newDoc: Document = {
      id: `doc_${Date.now()}`,
      name,
      projectId: projectId || null,
      pipelineId: null,
      lang: "Nepali",
      status: "Processing",
      date: "Just now",
      confidence: "-",
      pages: Math.floor(Math.random() * 10) + 1,
    };
    saveToStorage({ ...data, documents: [newDoc, ...data.documents] });
    toast.success("Document uploaded successfully. Processing started.");
  };

  const updateDocument = (id: string, updates: Partial<Document>) => {
    const newDocuments = data.documents.map(d => d.id === id ? { ...d, ...updates } : d);
    saveToStorage({ ...data, documents: newDocuments });
  };

  const deleteDocument = (id: string) => {
    saveToStorage({ ...data, documents: data.documents.filter(d => d.id !== id) });
    toast.success("Document deleted");
  };

  const addPipeline = (name: string) => {
    const newPipe: Pipeline = {
      id: `pipe_${Date.now()}`,
      name,
      status: "Paused",
      runs: "0",
      successRate: "-",
      steps: ["Upload Trigger"]
    };
    saveToStorage({ ...data, pipelines: [...data.pipelines, newPipe] });
    toast.success(`Pipeline "${name}" created successfully`);
  };

  const deletePipeline = (id: string) => {
    saveToStorage({ ...data, pipelines: data.pipelines.filter(p => p.id !== id) });
    toast.success("Pipeline deleted");
  };

  const togglePipelineStatus = (id: string) => {
    const newPipelines = data.pipelines.map(p => 
      p.id === id ? { ...p, status: p.status === "Active" ? "Paused" : "Active" } : p
    );
    saveToStorage({ ...data, pipelines: newPipelines });
  };

  const updatePipelineSteps = (id: string, steps: string[]) => {
    const newPipelines = data.pipelines.map(p => 
      p.id === id ? { ...p, steps } : p
    );
    saveToStorage({ ...data, pipelines: newPipelines });
  }

  return (
    <AppContext.Provider value={{
      projects: data.projects,
      documents: data.documents,
      pipelines: data.pipelines,
      isLoaded,
      addProject,
      updateProject,
      deleteProject,
      addDocument,
      updateDocument,
      deleteDocument,
      addPipeline,
      deletePipeline,
      togglePipelineStatus,
      updatePipelineSteps
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
