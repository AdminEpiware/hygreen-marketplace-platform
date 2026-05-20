import { StarRating } from '@/components/ui/star-rating';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { ReviewWithResponse } from '@/types/types';

interface ReviewItemProps {
  review: ReviewWithResponse;
  canEdit?: boolean;
  canDelete?: boolean;
  canRespond?: boolean;
  onUpdate?: () => void;
}

export function ReviewItem({ review, canEdit, canDelete, canRespond, onUpdate }: ReviewItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [editedText, setEditedText] = useState(review.review_text || '');
  const [responseText, setResponseText] = useState(review.review_response?.response_text || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('reviews')
      .update({ review_text: editedText, updated_at: new Date().toISOString() })
      .eq('id', review.id);

    if (error) {
      toast.error('Failed to update review');
      console.error(error);
    } else {
      toast.success('Review updated successfully');
      setIsEditing(false);
      onUpdate?.();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', review.id);

    if (error) {
      toast.error('Failed to delete review');
      console.error(error);
    } else {
      toast.success('Review deleted successfully');
      onUpdate?.();
    }
    setLoading(false);
  };

  const handleRespond = async () => {
    if (!responseText.trim()) {
      toast.error('Response cannot be empty');
      return;
    }

    setLoading(true);
    if (review.review_response) {
      const { error } = await supabase
        .from('review_responses')
        .update({ response_text: responseText, updated_at: new Date().toISOString() })
        .eq('id', review.review_response.id);

      if (error) {
        toast.error('Failed to update response');
        console.error(error);
      } else {
        toast.success('Response updated successfully');
        setIsResponding(false);
        onUpdate?.();
      }
    } else {
      const { error } = await supabase
        .from('review_responses')
        .insert({
          review_id: review.id,
          seller_id: review.product?.seller_id,
          response_text: responseText,
        });

      if (error) {
        toast.error('Failed to add response');
        console.error(error);
      } else {
        toast.success('Response added successfully');
        setIsResponding(false);
        onUpdate?.();
      }
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span className="text-sm text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            {review.buyer && (
              <p className="text-sm font-medium">{review.buyer.full_name}</p>
            )}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={3}
                  placeholder="Write your review..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate} disabled={loading}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(review.review_text || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              review.review_text && (
                <p className="text-sm text-muted-foreground">{review.review_text}</p>
              )
            )}
          </div>
          {(canEdit || canDelete) && !isEditing && (
            <div className="flex gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {review.review_response && !isResponding && (
          <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Seller Response</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(review.review_response.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm">{review.review_response.response_text}</p>
            {canRespond && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsResponding(true);
                  setResponseText(review.review_response?.response_text || '');
                }}
              >
                <Edit className="mr-2 h-3 w-3" />
                Edit Response
              </Button>
            )}
          </div>
        )}

        {canRespond && !review.review_response && !isResponding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResponding(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Respond to Review
          </Button>
        )}

        {isResponding && (
          <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-2">
            <Badge variant="secondary">Seller Response</Badge>
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={3}
              placeholder="Write your response..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRespond} disabled={loading}>
                {review.review_response ? 'Update Response' : 'Submit Response'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsResponding(false);
                  setResponseText(review.review_response?.response_text || '');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
