import { useState, useEffect } from 'react';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

export default function PRDViewer() {
  const [prdContent, setPrdContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPRD();
  }, []);

  const fetchPRD = async () => {
    try {
      const response = await fetch('/docs/prd.md');
      if (!response.ok) throw new Error('Failed to load PRD');
      const text = await response.text();
      setPrdContent(text);
    } catch (error) {
      console.error('Error loading PRD:', error);
      toast.error('Failed to load requirements document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info('Use the Print button and select "Save as PDF" as your printer');
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Loading requirements document...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-5xl mx-auto">
          <Card className="mb-6 print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Product Requirements Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleDownloadPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download as PDF
                </Button>
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Click "Download as PDF" and select "Save as PDF" as your printer destination.
              </p>
            </CardContent>
          </Card>

          <Card className="print:shadow-none print:border-none">
            <CardContent className="p-8 md:p-12">
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {prdContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <style>{`
        @media print {
          body {
            background: white;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          .prose {
            max-width: 100% !important;
          }
          
          .prose h1 {
            page-break-before: auto;
            page-break-after: avoid;
            font-size: 2em;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          
          .prose h2 {
            page-break-before: auto;
            page-break-after: avoid;
            font-size: 1.5em;
            margin-top: 1.2em;
            margin-bottom: 0.4em;
          }
          
          .prose h3 {
            page-break-after: avoid;
            font-size: 1.25em;
            margin-top: 1em;
            margin-bottom: 0.3em;
          }
          
          .prose p, .prose ul, .prose ol {
            page-break-inside: avoid;
          }
          
          .prose pre {
            page-break-inside: avoid;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          .prose table {
            page-break-inside: avoid;
          }
          
          @page {
            margin: 2cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}
