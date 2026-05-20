
-- Add new order statuses to the enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'on_the_way';

-- Add cancellation_reason column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Add comment explaining the status flow
COMMENT ON COLUMN orders.order_status IS 'Order status flow: placed → confirmed → preparing → on_the_way → delivered (or cancelled at any point)';
COMMENT ON COLUMN orders.cancellation_reason IS 'Mandatory reason when order is cancelled';
COMMENT ON COLUMN orders.order_type IS 'Order type: online (from cart/checkout) or direct (from direct billing)';

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_status order_status;
  new_status order_status;
BEGIN
  old_status := OLD.order_status;
  new_status := NEW.order_status;
  
  -- If status hasn't changed, allow
  IF old_status = new_status THEN
    RETURN NEW;
  END IF;
  
  -- If cancelling, require cancellation_reason
  IF new_status = 'cancelled' THEN
    IF NEW.cancellation_reason IS NULL OR trim(NEW.cancellation_reason) = '' THEN
      RAISE EXCEPTION 'Cancellation reason is required when cancelling an order';
    END IF;
    RETURN NEW;
  END IF;
  
  -- Validate forward transitions
  IF old_status = 'placed' AND new_status IN ('confirmed', 'cancelled') THEN
    RETURN NEW;
  ELSIF old_status = 'confirmed' AND new_status IN ('preparing', 'cancelled') THEN
    RETURN NEW;
  ELSIF old_status = 'preparing' AND new_status IN ('on_the_way', 'cancelled') THEN
    RETURN NEW;
  ELSIF old_status = 'on_the_way' AND new_status IN ('delivered', 'cancelled') THEN
    RETURN NEW;
  ELSIF old_status = 'packed' AND new_status IN ('on_the_way', 'delivered', 'cancelled') THEN
    -- Support legacy 'packed' status
    RETURN NEW;
  ELSIF old_status = 'delivered' OR old_status = 'cancelled' THEN
    -- Cannot change status once delivered or cancelled
    RAISE EXCEPTION 'Cannot change status from % to %', old_status, new_status;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status validation
DROP TRIGGER IF EXISTS validate_order_status_transition_trigger ON orders;
CREATE TRIGGER validate_order_status_transition_trigger
  BEFORE UPDATE OF order_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();

-- Create index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, order_status) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON orders(buyer_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type);
