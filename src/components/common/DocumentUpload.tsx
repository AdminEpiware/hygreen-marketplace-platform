import { useState, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export type DocumentType = 'aadhaar' | 'company_id';

export interface UploadedDocument {
  type: DocumentType;
  url: string;
  fileName: string;
}

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

const DOCUMENT_SLOTS: { type: DocumentType; label: string; hint: string }[] = [
  { type: 'aadhaar',    label: 'Aadhaar Card',                hint: 'Upload a clear scan of your Aadhaar card' },
  { type: 'company_id', label: 'Company ID / Other Document', hint: 'Company ID, Passport, Driving Licence, etc.' },
];

function SlotUploader({
  slot,
  uploaded,
  uploading,
  onUpload,
  onRemove,
}: {
  slot: (typeof DOCUMENT_SLOTS)[number];
  uploaded?: UploadedDocument;
  uploading: boolean;
  onUpload: (type: DocumentType, file: File) => Promise<void>;
  onRemove: (doc: UploadedDocument) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{slot.label}</p>
          <p className="text-xs text-muted-foreground">{slot.hint}</p>
        </div>
        {uploaded ? (
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{uploaded.fileName}</span>
            <button
              type="button"
              onClick={() => onRemove(uploaded)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove ${slot.label}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={ref}
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onUpload(slot.type, file);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => ref.current?.click()}
              className="shrink-0"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </>
        )}
      </div>
      {uploaded && (
        <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-md">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{uploaded.fileName}</span>
        </div>
      )}
    </div>
  );
}

export function DocumentUpload({ documents, onDocumentsChange }: DocumentUploadProps) {
  const [uploading, setUploading] = useState<DocumentType | null>(null);

  const handleUpload = async (type: DocumentType, file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or PDF only.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 5 MB. Please choose a smaller file.');
      return;
    }

    setUploading(type);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('You must be logged in to upload documents'); return; }

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${type}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pay-later-documents')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload document. Please try again.');
        return;
      }

      const updated = documents.filter(d => d.type !== type);
      onDocumentsChange([...updated, { type, url: path, fileName: file.name }]);
      toast.success(`${DOCUMENT_SLOTS.find(s => s.type === type)?.label} uploaded successfully.`);
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error('An error occurred while uploading.');
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (doc: UploadedDocument) => {
    try {
      const { error } = await supabase.storage.from('pay-later-documents').remove([doc.url]);
      if (error) { console.error('Delete error:', error); toast.error('Failed to remove document.'); return; }
      onDocumentsChange(documents.filter(d => d.url !== doc.url));
      toast.success('Document removed.');
    } catch (err) {
      console.error('Error removing document:', err);
      toast.error('An error occurred.');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Verification Documents</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload one or both documents below. Supported formats: JPG, PNG, PDF (max 5 MB each).
        </p>
      </div>

      {DOCUMENT_SLOTS.map(slot => (
        <SlotUploader
          key={slot.type}
          slot={slot}
          uploaded={documents.find(d => d.type === slot.type)}
          uploading={uploading === slot.type}
          onUpload={handleUpload}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}

