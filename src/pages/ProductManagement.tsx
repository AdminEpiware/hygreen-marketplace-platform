import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ImageUploadDialog } from '@/components/common/ImageUploadDialog';
import { Plus, Edit, Trash2, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getProductImageWithFallback, isValidImageUrl } from '@/utils/productImages';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/currency';
import type { Product, ProductCategory, Category } from '@/types/types';

const CATEGORY_IMAGES: Record<string, string> = {
  vegetables: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4ad056d3-bfaf-4281-9b60-ff376887b64f.jpg',
  fruits: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f826d455-53f6-4cfb-a66b-45f9ee82b240.jpg',
  grocery: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4564ddc4-bf70-40d6-abc7-0abd56a2a571.jpg',
  dairy: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dca201d4-a2b1-4723-98c0-acf0fda0a166.jpg',
  bakery: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_65229494-c829-4eeb-b23c-67a8aff2c832.jpg',
  meat: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5bd9c6eb-6dce-4157-bec5-44dcda46413a.jpg',
  beverages: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f75af92b-0f5b-439e-96f0-f5957f5feb8c.jpg',
  snacks: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b9c1a5df-4b25-4825-a977-e47ac8442ef4.jpg',
};

const DEFAULT_PRODUCT_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4ad056d3-bfaf-4281-9b60-ff376887b64f.jpg';

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [validatingImage, setValidatingImage] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand_name: '',
    category: '' as ProductCategory,
    price: '',
    unit: 'kg',
    available_quantity: '',
    description: '',
    image_url: '',
    image_source: 'default' as 'upload' | 'google' | 'default',
  });
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-open edit dialog when navigated with ?edit=ID
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && products.length > 0) {
      const p = products.find((x) => x.id === editId);
      if (p) handleEdit(p);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, products]);

  useEffect(() => {
    if (user && profile?.role === 'seller') {
      fetchProducts();
      fetchCategories();
    }
  }, [user, profile]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load products');
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate image URL if provided
    let finalImageUrl = formData.image_url;
    let finalImageSource = formData.image_source;

    if (formData.image_url && formData.image_url.trim() !== '') {
      setValidatingImage(true);
      
      try {
        const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate_image_url', {
          body: { imageUrl: formData.image_url },
        });

        if (validationError) {
          const errorMsg = await validationError?.context?.text();
          toast.error(errorMsg || 'Failed to validate image URL');
          setValidatingImage(false);
          return;
        }

        if (!validationResult.valid) {
          toast.error(`Invalid image URL: ${validationResult.error || 'Unknown error'}`);
          setValidatingImage(false);
          return;
        }

        // Image is valid, use it
        finalImageSource = 'google';
        toast.success('Image URL validated successfully');
      } catch (error) {
        console.error('Image validation error:', error);
        toast.error('Failed to validate image URL');
        setValidatingImage(false);
        return;
      } finally {
        setValidatingImage(false);
      }
    } else {
      // No image provided, use category default
      finalImageUrl = CATEGORY_IMAGES[formData.category] ?? DEFAULT_PRODUCT_IMAGE;
      finalImageSource = 'default';
    }

    const productData = {
      name: formData.name,
      brand_name: formData.brand_name || null,
      category: formData.category,
      price: parseFloat(formData.price),
      unit: formData.unit,
      available_quantity: parseFloat(formData.available_quantity),
      description: formData.description || null,
      image_url: finalImageUrl,
      image_source: finalImageSource,
      seller_id: user!.id,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Failed to update product');
        console.error(error);
      } else {
        toast.success('Product updated successfully');
        setDialogOpen(false);
        resetForm();
        fetchProducts();
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        toast.error('Failed to add product');
        console.error(error);
      } else {
        toast.success('Product added successfully');
        setDialogOpen(false);
        resetForm();
        fetchProducts();
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand_name: product.brand_name || '',
      category: product.category,
      price: product.price.toString(),
      unit: product.unit,
      available_quantity: product.available_quantity.toString(),
      description: product.description || '',
      image_url: product.image_url || '',
      image_source: product.image_source || 'default',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete product');
      console.error(error);
    } else {
      toast.success('Product deleted successfully');
      fetchProducts();
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand_name: '',
      category: '',
      price: '',
      unit: 'kg',
      available_quantity: '',
      description: '',
      image_url: '',
      image_source: 'default',
    });
  };

  // Filter products by category and search query
  const filteredProducts = products.filter((product) => {
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!user || profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Please sign in as a seller</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Product Management</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/seller/bulk-upload')}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand_name">Brand Name</Label>
                    <Input
                      id="brand_name"
                      value={formData.brand_name}
                      onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                      placeholder="Optional brand name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as ProductCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="kg, gram, piece"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Available Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.available_quantity}
                      onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Product Image</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value, image_source: e.target.value ? 'google' : 'default' })}
                      placeholder="Paste image URL or use upload button"
                    />
                    {editingProduct && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedProductForImage(editingProduct);
                          setImageUploadOpen(true);
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste an image URL or click Upload to select from your device (any format, max 2MB)
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={validatingImage}>
                    {validatingImage ? 'Validating...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as ProductCategory | 'all')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {products.length === 0 ? 'No products yet. Add your first product!' : 'No products match your search.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <button
                          onClick={() => {
                            setSelectedProductForImage(product);
                            setImageUploadOpen(true);
                          }}
                          className="relative group cursor-pointer"
                          title="Click to change image"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted">
                            <img
                              src={getProductImageWithFallback(product.image_url, product.category)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatPrice(product.price, product.base_currency || DEFAULT_CURRENCY)} / {product.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.available_quantity > 0 ? 'default' : 'destructive'}>
                          {product.available_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.available_quantity} {product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Image Upload Dialog */}
        {selectedProductForImage && (
          <ImageUploadDialog
            open={imageUploadOpen}
            onOpenChange={setImageUploadOpen}
            currentImageUrl={selectedProductForImage.image_url || ''}
            productId={selectedProductForImage.id}
            productName={selectedProductForImage.name}
            onImageUploaded={(newUrl) => {
              // Refresh products list
              fetchProducts();
              setSelectedProductForImage(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
