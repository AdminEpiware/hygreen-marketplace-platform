import { useState, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl?: string;
  productId: string;
  productName: string;
  onImageUploaded: (imageUrl: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function ImageUploadDialog({
  open,
  onOpenChange,
  currentImageUrl,
  productId,
  productName,
  onImageUploaded,
}: ImageUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG or PNG images only.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get user
      setUploadProgress(10);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload images');
        setUploading(false);
        return;
      }

      // Step 2: Generate filename
      setUploadProgress(20);
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
        toast.error('Invalid file extension. Please use JPG or PNG');
        setUploading(false);
        return;
      }
      const fileName = `${user.id}/${productId}_${Date.now()}.${fileExt}`;

      // Step 3: Upload to Supabase Storage
      setUploadProgress(40);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload image: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      // Step 4: Get public URL
      setUploadProgress(70);
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        toast.error('Failed to get image URL');
        setUploading(false);
        return;
      }

      // Step 5: Update product with new image URL
      setUploadProgress(90);
      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_url: urlData.publicUrl,
          image_source: 'upload',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error(`Failed to update product image: ${updateError.message}`);
        setUploading(false);
        return;
      }

      setUploadProgress(100);
      toast.success('Image uploaded successfully!');
      onImageUploaded(urlData.publicUrl);
      handleClose();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`An error occurred while uploading: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          image_url: null,
          image_source: 'default',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        console.error('Remove error:', error);
        toast.error('Failed to remove image');
        return;
      }

      toast.success('Image removed successfully');
      onImageUploaded('');
      handleClose();
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Product Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Product: {productName}</Label>
          </div>

          {/* Current Image */}
          {currentImageUrl && !previewUrl && (
            <div className="space-y-2">
              <Label>Current Image</Label>
              <div className="relative w-full aspect-square border rounded-lg overflow-hidden bg-muted">
                <img
                  src={currentImageUrl}
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative w-full aspect-square border rounded-lg overflow-hidden bg-muted">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* File Input */}
          {!previewUrl && (
            <div className="space-y-2">
              <Label htmlFor="image-upload">Select Image</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">JPG or PNG (max 5MB)</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Supported formats: JPG, PNG</p>
            <p>• Maximum file size: 5MB</p>
            <p>• Recommended: Square images (1:1 ratio)</p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {currentImageUrl && !previewUrl && (
            <Button
              variant="outline"
              onClick={handleRemoveImage}
              className="text-destructive"
            >
              Remove Image
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {selectedFile && (
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
