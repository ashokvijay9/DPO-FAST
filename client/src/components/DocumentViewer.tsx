import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, X, FileText, File } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentViewerProps {
  documentId: string;
  fileName: string;
  fileType: string;
  trigger?: React.ReactNode;
}

export function DocumentViewer({
  documentId,
  fileName,
  fileType,
  trigger
}: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const isPDF = fileType === 'application/pdf';
  const isDOCX = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const handleViewDocument = async () => {
    if (!isPDF && !isDOCX) {
      // For other file types, just download
      handleDownload();
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    try {
      if (isDOCX) {
        // For DOCX, get HTML preview
        const response = await fetch(`/api/documents/${documentId}/preview`);
        if (!response.ok) {
          throw new Error('Failed to load document preview');
        }
        const data = await response.json();
        setHtmlContent(data.html);
      }
      // For PDF, react-pdf will handle loading
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/documents/${documentId}/view`;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('PDF loading error:', error);
    setError('Failed to load PDF document');
    setIsLoading(false);
  };

  const getFileIcon = () => {
    if (isPDF) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleViewDocument}
      className="flex items-center gap-2"
      data-testid={`button-view-document-${documentId}`}
    >
      <Eye className="w-4 h-4" />
      Ver Documento
    </Button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={handleViewDocument} style={{ cursor: 'pointer' }}>
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {getFileIcon()}
                {fileName}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  data-testid={`button-download-${documentId}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Carregando documento...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-red-600">
                  <p className="font-medium">Erro ao carregar documento</p>
                  <p className="text-sm">{error}</p>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="mt-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Fazer Download
                  </Button>
                </div>
              </div>
            )}

            {isPDF && !isLoading && !error && (
              <div className="h-full flex flex-col">
                {numPages > 1 && (
                  <div className="flex items-center justify-center gap-4 p-2 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {pageNumber} de {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}

                <div className="flex-1 overflow-auto flex justify-center p-4">
                  <Document
                    file={`/api/documents/${documentId}/view`}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    className="max-w-full"
                  >
                    <Page
                      pageNumber={pageNumber}
                      className="shadow-lg"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      width={Math.min(800, window.innerWidth - 100)}
                    />
                  </Document>
                </div>
              </div>
            )}

            {isDOCX && !isLoading && !error && htmlContent && (
              <div className="h-full overflow-auto p-4">
                <div
                  className="prose prose-sm max-w-none bg-white p-6 rounded border"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  data-testid={`docx-content-${documentId}`}
                />
              </div>
            )}

            {!isPDF && !isDOCX && !isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">Visualização não disponível</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Este tipo de arquivo não pode ser visualizado no navegador
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Fazer Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}