import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  maxRating?: number;
  size?: number;
}

export function StarRatingInput({ value, onChange, maxRating = 5, size = 24 }: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || value;

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onChange(ratingValue)}
            onMouseEnter={() => setHoverRating(ratingValue)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            <Star
              size={size}
              className={
                ratingValue <= displayRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="text-sm text-muted-foreground ml-2">
          {value} {value === 1 ? 'star' : 'stars'}
        </span>
      )}
    </div>
  );
}
