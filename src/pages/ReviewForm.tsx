import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRatingInput } from '@/components/ui/star-rating-input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, Order } from '@/types/types';

interface ReviewFormPageProps {
  productId: string;
  orderId: string;
}

export default function ReviewFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);

  // Get productId and orderId from URL params
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('productId');
  const orderId = params.get('orderId');

  useState(() => {
    if (productId && orderId) {
      fetchData();
    }
  });

  const fetchData = async () => {
    if (!productId || !orderId) return;

    const [productRes, orderRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).maybeSingle(),
      supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
    ]);

    if (productRes.data) setProduct(productRes.data);
    if (orderRes.data) setOrder(orderRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!productId || !orderId || !user) {
      toast.error('Invalid review data');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      buyer_id: user.id,
      order_id: orderId,
      rating,
      review_text: reviewText.trim() || null,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('You have already reviewed this product');
      } else {
        toast.error('Failed to submit review');
      }
      console.error(error);
    } else {
      toast.success('Review submitted successfully!');
      navigate('/buyer/dashboard');
    }

    setLoading(false);
  };

  if (!productId || !orderId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center text-muted-foreground">Invalid review link</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            {product && (
              <div className="mb-6 p-4 bg-muted rounded-lg flex items-center gap-4">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {product.category}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Rating *</Label>
                <StarRatingInput value={rating} onChange={setRating} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review">Your Review (Optional)</Label>
                <Textarea
                  id="review"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  placeholder="Share your experience with this product..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading || rating === 0}>
                  {loading ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/buyer/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
