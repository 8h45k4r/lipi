"use client";

import React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfDocumentProps {
  file: string;
  pageNumber: number;
  scale?: number;
  width?: number;
  className?: string;
  onLoadSuccess?: (pdf: { numPages: number }) => void;
  onLoadError?: (error: Error) => void;
}

export default function PdfDocument({
  file,
  pageNumber,
  scale = 1.0,
  width,
  className,
  onLoadSuccess,
  onLoadError
}: PdfDocumentProps) {
  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      className="flex flex-col items-center"
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        width={width}
        className={className}
      />
    </Document>
  );
}
