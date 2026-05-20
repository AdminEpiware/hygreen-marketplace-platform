import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Store, Plus, Edit2, Trash2, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { BuyerStore } from '@/types/types';

export default function StoreManagement() {
  const { user, profile, buyerStores, activeStore, setActiveStore, fetchBuyerStores } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<BuyerStore | null>(null);
  const [deletingStore, setDeletingStore] = useState<BuyerStore | null>(null);

  const [storeForm, setStoreForm] = useState({
    store_name: '',
    delivery_address: '',
    contact_number: '',
  });

  useEffect(() => {
    if (profile?.role !== 'buyer') {
      navigate('/');
    }
  }, [profile, navigate]);

  const handleAddStore = () => {
    setEditingStore(null);
    setStoreForm({
      store_name: '',
      delivery_address: '',
      contact_number: '',
    });
    setStoreDialogOpen(true);
  };

  const handleEditStore = (store: BuyerStore) => {
    setEditingStore(store);
    setStoreForm({
      store_name: store.store_name,
      delivery_address: store.delivery_address,
      contact_number: store.contact_number || '',
    });
    setStoreDialogOpen(true);
  };

  const handleSaveStore = async () => {
    // Validation
    if (!storeForm.store_name.trim()) {
      toast.error('Store name is required');
      return;
    }

    if (!storeForm.delivery_address.trim()) {
      toast.error('Delivery address is required');
      return;
    }

    setLoading(true);

    try {
      if (editingStore) {
        // Update existing store
        const { error } = await supabase
          .from('buyer_stores')
          .update({
            store_name: storeForm.store_name.trim(),
            delivery_address: storeForm.delivery_address.trim(),
            contact_number: storeForm.contact_number.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStore.id)
          .eq('buyer_id', user!.id);

        if (error) throw error;

        toast.success('Store updated successfully');
      } else {
        // Create new store
        const { error } = await supabase
          .from('buyer_stores')
          .insert({
            buyer_id: user!.id,
            store_name: storeForm.store_name.trim(),
            delivery_address: storeForm.delivery_address.trim(),
            contact_number: storeForm.contact_number.trim() || null,
            is_active: buyerStores.length === 0, // First store is active by default
          });

        if (error) throw error;

        toast.success('Store created successfully');
      }

      await fetchBuyerStores();
      setStoreDialogOpen(false);
      setStoreForm({
        store_name: '',
        delivery_address: '',
        contact_number: '',
      });
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error('Failed to save store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = (store: BuyerStore) => {
    setDeletingStore(store);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteStore = async () => {
    if (!deletingStore) return;

    // Prevent deletion if it's the only store
    if (buyerStores.length === 1) {
      toast.error('Cannot delete the only store. You must have at least one store.');
      setDeleteDialogOpen(false);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('buyer_stores')
        .delete()
        .eq('id', deletingStore.id)
        .eq('buyer_id', user!.id);

      if (error) throw error;

      // If deleting active store, switch to another store
      if (activeStore?.id === deletingStore.id) {
        const remainingStores = buyerStores.filter(s => s.id !== deletingStore.id);
        if (remainingStores.length > 0) {
          await setActiveStore(remainingStores[0]);
        }
      }

      await fetchBuyerStores();
      toast.success('Store deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingStore(null);
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveStore = async (store: BuyerStore) => {
    if (activeStore?.id === store.id) return;

    try {
      await setActiveStore(store);
      toast.success(`Switched to ${store.store_name}`);
    } catch (error) {
      console.error('Error switching store:', error);
      toast.error('Failed to switch store. Please try again.');
    }
  };

  if (!user || profile?.role !== 'buyer') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Store Management</h1>
            <p className="text-muted-foreground mt-1">Manage your stores and delivery addresses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/buyer/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button onClick={handleAddStore}>
              <Plus className="mr-2 h-4 w-4" />
              Add Store
            </Button>
          </div>
        </div>

        {/* Active Store Indicator */}
        {activeStore && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Store</p>
                  <p className="font-semibold">{activeStore.store_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Store List */}
        <div className="grid md:grid-cols-2 gap-4">
          {buyerStores.map((store) => (
            <Card key={store.id} className={store.id === activeStore?.id ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{store.store_name}</CardTitle>
                      {store.id === activeStore?.id && (
                        <p className="text-xs text-primary mt-1">Active Store</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStore(store)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStore(store)}
                      disabled={buyerStores.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="text-sm">{store.delivery_address}</p>
                </div>
                {store.contact_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Number</p>
                    <p className="text-sm">{store.contact_number}</p>
                  </div>
                )}
                {store.id !== activeStore?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSetActiveStore(store)}
                  >
                    Switch to this Store
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {buyerStores.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No stores created yet. Create your first store to start shopping.
              </p>
              <Button onClick={handleAddStore}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Store
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Store Dialog */}
        <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStore ? 'Edit Store' : 'Add New Store'}
              </DialogTitle>
              <DialogDescription>
                {editingStore
                  ? 'Update your store details'
                  : 'Create a new store for separate shopping context'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Store Name *</Label>
                <Input
                  id="store_name"
                  placeholder="e.g., Home, Office, Business"
                  value={storeForm.store_name}
                  onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">Delivery Address *</Label>
                <Textarea
                  id="delivery_address"
                  placeholder="Enter complete delivery address"
                  value={storeForm.delivery_address}
                  onChange={(e) => setStoreForm({ ...storeForm, delivery_address: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input
                  id="contact_number"
                  placeholder="e.g., +1234567890"
                  value={storeForm.contact_number}
                  onChange={(e) => setStoreForm({ ...storeForm, contact_number: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStoreDialogOpen(false);
                    setStoreForm({
                      store_name: '',
                      delivery_address: '',
                      contact_number: '',
                    });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveStore} disabled={loading}>
                  {loading ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Store</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingStore?.store_name}"? This action cannot be undone.
                All cart items and order history associated with this store will remain accessible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteStore} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Store'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
