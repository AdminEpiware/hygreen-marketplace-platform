import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Store, Plus, Edit, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { BuyerStore } from '@/types/types';

export function StoreManagement() {
  const { buyerStores, activeStore, setActiveStore, createStore, updateStore, deleteStore } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<BuyerStore | null>(null);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreAddress, setEditStoreAddress] = useState('');

  const handleCreateStore = async () => {
    if (!newStoreName.trim() || !newStoreAddress.trim()) {
      toast.error('Store name and address are required');
      return;
    }

    const store = await createStore(newStoreName, newStoreAddress);
    if (store) {
      setNewStoreName('');
      setNewStoreAddress('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleEditStore = async () => {
    if (!editingStore || !editStoreName.trim() || !editStoreAddress.trim()) {
      toast.error('Store name and address are required');
      return;
    }

    const success = await updateStore(editingStore.id, editStoreName, editStoreAddress);
    if (success) {
      setEditingStore(null);
      setEditStoreName('');
      setEditStoreAddress('');
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (buyerStores.length === 1) {
      toast.error('Cannot delete the only store');
      return;
    }

    if (confirm('Are you sure you want to delete this store?')) {
      await deleteStore(storeId);
    }
  };

  const openEditDialog = (store: BuyerStore) => {
    setEditingStore(store);
    setEditStoreName(store.store_name);
    setEditStoreAddress(store.delivery_address);
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Management
            </CardTitle>
            <CardDescription>Manage your stores and delivery addresses</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Store</DialogTitle>
                <DialogDescription>
                  Add a new store with a separate delivery address
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Store Name</Label>
                  <Input
                    id="store-name"
                    placeholder="e.g., Home, Office, Parents' House"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-address">Delivery Address</Label>
                  <Textarea
                    id="store-address"
                    placeholder="Enter full delivery address"
                    value={newStoreAddress}
                    onChange={(e) => setNewStoreAddress(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateStore}>Create Store</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {buyerStores.map((store) => (
            <div
              key={store.id}
              className={`p-4 rounded-lg border ${
                activeStore?.id === store.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{store.store_name}</h4>
                    {activeStore?.id === store.id && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{store.delivery_address}</p>
                </div>
                <div className="flex gap-2">
                  {activeStore?.id !== store.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveStore(store)}
                    >
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(store)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {buyerStores.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteStore(store.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Store</DialogTitle>
              <DialogDescription>
                Update store name and delivery address
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-store-name">Store Name</Label>
                <Input
                  id="edit-store-name"
                  placeholder="e.g., Home, Office, Parents' House"
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-store-address">Delivery Address</Label>
                <Textarea
                  id="edit-store-address"
                  placeholder="Enter full delivery address"
                  value={editStoreAddress}
                  onChange={(e) => setEditStoreAddress(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditStore}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
