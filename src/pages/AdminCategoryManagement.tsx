import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Layers, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@/types/types';

export default function AdminCategoryManagement() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: null as string | null,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchCategories();
  }, [user, profile]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', parent_id: null, sort_order: categories.length, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      parent_id: cat.parent_id ?? null,
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const openDelete = (cat: Category) => {
    setDeletingCategory(cat);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      parent_id: formData.parent_id || null,
      sort_order: Number(formData.sort_order),
      is_active: formData.is_active,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editingCategory.id);
      if (error) { toast.error('Failed to update category'); console.error(error); }
      else { toast.success('Category updated'); fetchCategories(); setDialogOpen(false); }
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) { toast.error('Failed to create category'); console.error(error); }
      else { toast.success('Category created'); fetchCategories(); setDialogOpen(false); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    // Check if there are child categories
    const children = categories.filter((c) => c.parent_id === deletingCategory.id);
    if (children.length > 0) {
      toast.error(`Cannot delete "${deletingCategory.name}" — it has ${children.length} subcategory(ies). Remove them first.`);
      setDeleteDialogOpen(false);
      return;
    }
    const { error } = await supabase.from('categories').delete().eq('id', deletingCategory.id);
    if (error) { toast.error('Failed to delete category'); console.error(error); }
    else { toast.success('Category deleted'); fetchCategories(); }
    setDeleteDialogOpen(false);
    setDeletingCategory(null);
  };

  const toggleActive = async (cat: Category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);
    if (error) toast.error('Failed to update');
    else {
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
    }
  };

  // Build flat display with parent name
  const rootCategories = categories.filter((c) => !c.parent_id);
  const childCategories = categories.filter((c) => !!c.parent_id);

  const getParentName = (parentId: string | null | undefined) => {
    if (!parentId) return '—';
    return categories.find((c) => c.id === parentId)?.name ?? '—';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-muted-foreground">Loading categories…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Category Management</h1>
              <p className="text-sm text-muted-foreground">Manage product categories and subcategories</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold">{categories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Root Categories</p>
              <p className="text-2xl font-semibold">{rootCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Subcategories</p>
              <p className="text-2xl font-semibold">{childCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{categories.filter((c) => c.is_active).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>
              Root categories and subcategories. Toggle active/inactive to show or hide from product forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Parent</TableHead>
                    <TableHead className="whitespace-nowrap">Sort Order</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {cat.parent_id && (
                          <span className="text-muted-foreground mr-1.5">↳</span>
                        )}
                        {cat.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {getParentName(cat.parent_id)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{cat.sort_order}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cat.is_active ?? true}
                            onCheckedChange={() => toggleActive(cat)}
                          />
                          <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(cat)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No categories yet. Click "Add Category" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Electronics"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-parent">Parent Category (optional)</Label>
                <Select
                  value={formData.parent_id ?? 'none'}
                  onValueChange={(v) => setFormData({ ...formData, parent_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger id="cat-parent">
                    <SelectValue placeholder="No parent (root category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Root category —</SelectItem>
                    {rootCategories
                      .filter((c) => !editingCategory || c.id !== editingCategory.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-sort">Sort Order</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="cat-active">Active</Label>
                <Switch
                  id="cat-active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">"{deletingCategory?.name}"</span>?
              This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
