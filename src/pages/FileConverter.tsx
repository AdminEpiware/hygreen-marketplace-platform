import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Upload, FileText, Download, AlertCircle, CheckCircle2,
  Edit2, Save, X, FileImage, FileType, File, Sparkles, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

// ── Mandatory column order ────────────────────────────────────────────
const MANDATORY_COLUMNS = [
  'Product Name',
  'Price',
  'Quantity',
  'Product Code',
  'Category',
  'Store Name',
  'Currency',
  'Product Image Link',
  'Description',
  'Barcode',
  'Unit',
] as const;

type ProductField = typeof MANDATORY_COLUMNS[number];
type ProductRow = Record<ProductField, string> & { _errors: string[] };

// ── Accepted MIME types ───────────────────────────────────────────────
const ACCEPTED_TYPES = [
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
];
const ACCEPTED_EXT = /\.(pdf|csv|txt|doc|docx|xls|xlsx|jpg|jpeg|png|webp|gif|bmp|tiff?)$/i;

// ── Helpers ───────────────────────────────────────────────────────────
function fileTypeLabel(mimeType: string, ext: string): { label: string; icon: React.ReactNode } {
  if (mimeType.startsWith('image/')) return { label: 'Image', icon: <FileImage className="h-5 w-5" /> };
  if (mimeType === 'application/pdf' || ext === 'pdf') return { label: 'PDF', icon: <FileType className="h-5 w-5" /> };
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') return { label: 'Word', icon: <FileText className="h-5 w-5" /> };
  if (mimeType === 'text/csv' || ext === 'csv') return { label: 'CSV', icon: <FileText className="h-5 w-5" /> };
  return { label: 'Text', icon: <File className="h-5 w-5" /> };
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateRow(row: ProductRow): string[] {
  const errors: string[] = [];
  if (!row['Product Name'].trim()) errors.push('Product Name is required');
  if (row['Price'] && isNaN(Number(row['Price']))) errors.push('Price must be numeric');
  if (row['Quantity'] && isNaN(Number(row['Quantity']))) errors.push('Quantity must be numeric');
  return errors;
}

function buildEmptyRow(): ProductRow {
  const r = {} as ProductRow;
  for (const col of MANDATORY_COLUMNS) r[col] = '';
  r['Quantity'] = '1';
  r['Currency'] = 'INR';
  r['Unit'] = 'pcs';
  r['_errors'] = [];
  return r;
}

// ── Component ─────────────────────────────────────────────────────────
export default function FileConverter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileMeta, setFileMeta] = useState<{ label: string; icon: React.ReactNode } | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<ProductRow | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── File processing pipeline ───────────────────────────────────────
  const processFile = async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    const isValid = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXT.test(file.name);

    if (!isValid) {
      toast.error('Unsupported file format. Please upload PDF, Word, image, CSV, or TXT files.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20 MB limit.');
      return;
    }

    setProcessing(true);
    setProgress(10);
    setProgressLabel('Reading file…');
    setFileName(file.name);
    setFileMeta(fileTypeLabel(file.type, ext));
    setProducts([]);

    try {
      const base64 = await toBase64(file);
      setProgress(30);
      setProgressLabel('Sending to AI extraction engine…');

      const { data, error } = await supabase.functions.invoke('file-converter', {
        body: { fileData: base64, mimeType: file.type, fileName: file.name },
      });

      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(msg || error.message);
      }

      setProgress(85);
      setProgressLabel('Validating extracted data…');

      const rows: ProductRow[] = (data?.products ?? []).map((p: Record<string, string>) => {
        const row = buildEmptyRow();
        for (const col of MANDATORY_COLUMNS) {
          row[col] = p[col] ?? '';
        }
        row['_errors'] = validateRow(row);
        return row;
      });

      if (rows.length === 0) {
        toast.warning('No product data could be extracted from this file.');
      } else {
        toast.success(`Extracted ${rows.length} product${rows.length > 1 ? 's' : ''} successfully`);
      }

      setProducts(rows);
      setProgress(100);
      setProgressLabel('Done');
    } catch (err) {
      console.error('File converter error:', err);
      toast.error(`Extraction failed: ${(err as Error).message}`);
    } finally {
      setProcessing(false);
      setTimeout(() => { setProgress(0); setProgressLabel(''); }, 1200);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  // ── Inline editing ─────────────────────────────────────────────────
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditBuffer({ ...products[index] });
  };

  const commitEdit = (index: number) => {
    if (!editBuffer) return;
    const updated = [...products];
    editBuffer['_errors'] = validateRow(editBuffer);
    updated[index] = editBuffer;
    setProducts(updated);
    setEditingIndex(null);
    setEditBuffer(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditBuffer(null);
  };

  const handleCellChange = (field: ProductField, value: string) => {
    if (!editBuffer) return;
    setEditBuffer({ ...editBuffer, [field]: value });
  };

  // ── Export ─────────────────────────────────────────────────────────
  const handleExport = () => {
    if (products.length === 0) { toast.error('No products to export'); return; }
    const hasErrors = products.some(p => p['_errors'].length > 0);
    if (hasErrors) { toast.error('Fix all validation errors before exporting'); return; }

    try {
      const rows = products.map(p => {
        const row: Record<string, string | number> = {};
        for (const col of MANDATORY_COLUMNS) {
          row[col] = (col === 'Price' || col === 'Quantity') && p[col] !== ''
            ? Number(p[col])
            : p[col];
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: [...MANDATORY_COLUMNS] });
      ws['!cols'] = [
        { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 },
        { wch: 20 }, { wch: 10 }, { wch: 40 }, { wch: 35 }, { wch: 15 }, { wch: 12 },
      ];

      // Style header row bold
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cell]) ws[cell].s = { font: { bold: true } };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `products_${timestamp}.xlsx`);
      toast.success('Excel file downloaded successfully!');
    } catch (e) {
      toast.error('Failed to generate Excel file');
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────
  const validCount = products.filter(p => p['_errors'].length === 0).length;
  const errorCount = products.filter(p => p['_errors'].length > 0).length;

  // ── Access guard ───────────────────────────────────────────────────
  if (profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">This feature is only available for sellers.</p>
              <Button onClick={() => navigate('/')} className="mt-4">Go to Home</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Header />
      <main className="flex-1 container max-w-7xl py-10 space-y-8">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">File to Excel Converter</h1>
            <p className="text-sm text-muted-foreground">
              Upload any document — AI extracts product data and exports it as a structured Excel file.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/seller/bulk-upload')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bulk Upload
          </Button>
        </div>

        {/* Upload zone */}
        <Card className="border border-border shadow-none">
          <CardContent className="p-6 space-y-5">
            {/* Drop area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !processing && fileInputRef.current?.click()}
              className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer
                flex flex-col items-center justify-center gap-4 py-14 px-6 text-center
                ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}
                ${processing ? 'pointer-events-none opacity-60' : ''}`}
            >
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {dragOver ? 'Release to upload' : 'Drop your file here, or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF · Word (.docx / .doc) · Images (JPG, PNG, screenshots) · CSV · TXT · up to 20 MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',') + ',.pdf,.doc,.docx,.csv,.txt,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff'}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Progress */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                    {progressLabel}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            {/* Selected file info */}
            {fileName && !processing && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-muted/50 border border-border">
                <span className="text-muted-foreground">{fileMeta?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{fileMeta?.label} · Processed</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs h-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Replace
                </Button>
              </div>
            )}

            {/* Supported formats info */}
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mandatory output columns</p>
              <div className="flex flex-wrap gap-1.5">
                {MANDATORY_COLUMNS.map(col => (
                  <Badge key={col} variant="secondary" className="text-xs font-normal">{col}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All columns are always present in the exported Excel file. Empty values are preserved as blank cells.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {products.length > 0 && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Extracted', value: products.length, color: 'text-foreground' },
                { label: 'Ready to Export', value: validCount, color: 'text-green-600' },
                { label: 'Needs Review', value: errorCount, color: errorCount > 0 ? 'text-destructive' : 'text-muted-foreground' },
              ].map(stat => (
                <Card key={stat.label} className="border border-border shadow-none">
                  <CardContent className="p-5">
                    <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table card */}
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">Preview &amp; Edit</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Click the edit icon on any row to update values before exporting
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleExport}
                    disabled={errorCount > 0 || products.length === 0}
                    size="sm"
                    className="gap-2 shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table className="[&>div]:max-w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-10 whitespace-nowrap">#</TableHead>
                        {MANDATORY_COLUMNS.map(col => (
                          <TableHead key={col} className="whitespace-nowrap text-xs font-medium">
                            {col}
                          </TableHead>
                        ))}
                        <TableHead className="whitespace-nowrap text-right">Status</TableHead>
                        <TableHead className="whitespace-nowrap text-right w-20">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => {
                        const isEditing = editingIndex === index;
                        const row = isEditing ? editBuffer! : product;
                        return (
                          <TableRow
                            key={index}
                            className={product['_errors'].length > 0 ? 'bg-destructive/5' : ''}
                          >
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{index + 1}</TableCell>
                            {MANDATORY_COLUMNS.map(col => (
                              <TableCell key={col} className="whitespace-nowrap">
                                {isEditing ? (
                                  <Input
                                    value={row[col]}
                                    onChange={e => handleCellChange(col, e.target.value)}
                                    className="h-7 text-xs min-w-[100px] px-2"
                                    type={(col === 'Price' || col === 'Quantity') ? 'number' : 'text'}
                                    step={col === 'Price' ? '0.01' : undefined}
                                  />
                                ) : (
                                  <span className={`text-xs ${
                                    !row[col] && (col === 'Product Name') ? 'text-destructive' : 'text-foreground'
                                  }`}>
                                    {row[col] || <span className="text-muted-foreground/50">—</span>}
                                  </span>
                                )}
                              </TableCell>
                            ))}
                            {/* Status */}
                            <TableCell className="text-right whitespace-nowrap">
                              {product['_errors'].length > 0 ? (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {product['_errors'].length} issue{product['_errors'].length > 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs gap-1 text-green-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Valid
                                </Badge>
                              )}
                            </TableCell>
                            {/* Edit actions */}
                            <TableCell className="text-right whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => commitEdit(index)}>
                                    <Save className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(index)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {errorCount > 0 && (
                  <div className="px-6 py-4 border-t">
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errorCount} row{errorCount > 1 ? 's have' : ' has'} validation errors.
                      Edit the highlighted rows to fix them before downloading.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
