# Smart Grocery Purchase App - API Documentation

## Base URL
```
https://obhchghuhtgoruekosiz.supabase.co
```

## Authentication
All authenticated requests require the following headers:
```
Authorization: Bearer <access_token>
apikey: <anon_key>
```

---

## Authentication APIs

### 1. Sign Up
**Endpoint**: `POST /auth/v1/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "options": {
    "data": {
      "full_name": "John Doe",
      "mobile_number": "+1234567890",
      "address": "123 Main St, City, State",
      "role": "buyer"
    }
  }
}
```

**Response** (201 Created):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe",
      "mobile_number": "+1234567890",
      "address": "123 Main St, City, State",
      "role": "buyer"
    }
  }
}
```

### 2. Sign In
**Endpoint**: `POST /auth/v1/token?grant_type=password`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### 3. Sign Out
**Endpoint**: `POST /auth/v1/logout`

**Headers**: Authorization required

**Response** (204 No Content)

---

## Product APIs

### 1. Get All Products
**Endpoint**: `GET /rest/v1/products`

**Query Parameters**:
- `category=eq.vegetables` - Filter by category
- `available_quantity=gt.0` - Only available products
- `order=created_at.desc` - Sort by creation date

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "seller_id": "uuid",
    "name": "Fresh Tomatoes",
    "category": "vegetables",
    "price": 2.99,
    "unit": "kg",
    "available_quantity": 100,
    "description": "Fresh organic tomatoes",
    "image_url": "https://...",
    "created_at": "2026-04-27T10:00:00Z",
    "updated_at": "2026-04-27T10:00:00Z"
  }
]
```

### 2. Get Product by ID
**Endpoint**: `GET /rest/v1/products?id=eq.<product_id>`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "seller_id": "uuid",
  "name": "Fresh Tomatoes",
  "category": "vegetables",
  "price": 2.99,
  "unit": "kg",
  "available_quantity": 100,
  "description": "Fresh organic tomatoes",
  "image_url": "https://...",
  "created_at": "2026-04-27T10:00:00Z",
  "updated_at": "2026-04-27T10:00:00Z"
}
```

### 3. Create Product (Seller Only)
**Endpoint**: `POST /rest/v1/products`

**Headers**: Authorization required (seller role)

**Request Body**:
```json
{
  "seller_id": "uuid",
  "name": "Fresh Tomatoes",
  "category": "vegetables",
  "price": 2.99,
  "unit": "kg",
  "available_quantity": 100,
  "description": "Fresh organic tomatoes",
  "image_url": "https://..."
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "seller_id": "uuid",
  "name": "Fresh Tomatoes",
  "category": "vegetables",
  "price": 2.99,
  "unit": "kg",
  "available_quantity": 100,
  "description": "Fresh organic tomatoes",
  "image_url": "https://...",
  "created_at": "2026-04-27T10:00:00Z",
  "updated_at": "2026-04-27T10:00:00Z"
}
```

### 4. Update Product (Seller Only)
**Endpoint**: `PATCH /rest/v1/products?id=eq.<product_id>`

**Headers**: Authorization required (seller role)

**Request Body**:
```json
{
  "price": 3.49,
  "available_quantity": 150
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "price": 3.49,
  "available_quantity": 150,
  "updated_at": "2026-04-27T11:00:00Z"
}
```

### 5. Delete Product (Seller Only)
**Endpoint**: `DELETE /rest/v1/products?id=eq.<product_id>`

**Headers**: Authorization required (seller role)

**Response** (204 No Content)

---

## Cart APIs

### 1. Get Cart Items
**Endpoint**: `GET /rest/v1/cart?buyer_id=eq.<user_id>&select=*,product:products(*)`

**Headers**: Authorization required (buyer role)

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "buyer_id": "uuid",
    "product_id": "uuid",
    "quantity": 2,
    "created_at": "2026-04-27T10:00:00Z",
    "updated_at": "2026-04-27T10:00:00Z",
    "product": {
      "id": "uuid",
      "name": "Fresh Tomatoes",
      "price": 2.99,
      "unit": "kg",
      "image_url": "https://...",
      "category": "vegetables"
    }
  }
]
```

### 2. Add to Cart
**Endpoint**: `POST /rest/v1/cart`

**Headers**: Authorization required (buyer role)

**Request Body**:
```json
{
  "buyer_id": "uuid",
  "product_id": "uuid",
  "quantity": 2
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "buyer_id": "uuid",
  "product_id": "uuid",
  "quantity": 2,
  "created_at": "2026-04-27T10:00:00Z",
  "updated_at": "2026-04-27T10:00:00Z"
}
```

### 3. Update Cart Item
**Endpoint**: `PATCH /rest/v1/cart?id=eq.<cart_item_id>`

**Headers**: Authorization required (buyer role)

**Request Body**:
```json
{
  "quantity": 5
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "quantity": 5,
  "updated_at": "2026-04-27T11:00:00Z"
}
```

### 4. Remove from Cart
**Endpoint**: `DELETE /rest/v1/cart?id=eq.<cart_item_id>`

**Headers**: Authorization required (buyer role)

**Response** (204 No Content)

---

## Order APIs

### 1. Create Order
**Endpoint**: `POST /rest/v1/orders`

**Headers**: Authorization required (buyer role)

**Request Body**:
```json
{
  "buyer_id": "uuid",
  "delivery_address": "123 Main St, City, State",
  "payment_type": "cash_on_delivery",
  "payment_status": "pending",
  "order_status": "placed",
  "subtotal": 10.48,
  "tax": 0.52,
  "total_amount": 11.00,
  "due_date": null
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "order_number": "ORD-20260427-000001",
  "buyer_id": "uuid",
  "delivery_address": "123 Main St, City, State",
  "payment_type": "cash_on_delivery",
  "payment_status": "pending",
  "order_status": "placed",
  "subtotal": 10.48,
  "tax": 0.52,
  "total_amount": 11.00,
  "due_date": null,
  "created_at": "2026-04-27T10:00:00Z",
  "updated_at": "2026-04-27T10:00:00Z"
}
```

### 2. Get Buyer Orders
**Endpoint**: `GET /rest/v1/orders?buyer_id=eq.<user_id>&select=*,order_items(*)`

**Headers**: Authorization required (buyer role)

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "order_number": "ORD-20260427-000001",
    "buyer_id": "uuid",
    "delivery_address": "123 Main St, City, State",
    "payment_type": "cash_on_delivery",
    "payment_status": "pending",
    "order_status": "placed",
    "subtotal": 10.48,
    "tax": 0.52,
    "total_amount": 11.00,
    "created_at": "2026-04-27T10:00:00Z",
    "order_items": [
      {
        "id": "uuid",
        "order_id": "uuid",
        "product_id": "uuid",
        "seller_id": "uuid",
        "product_name": "Fresh Tomatoes",
        "product_category": "vegetables",
        "price": 2.99,
        "unit": "kg",
        "quantity": 2,
        "item_total": 5.98
      }
    ]
  }
]
```

### 3. Get Seller Orders
**Endpoint**: `GET /rest/v1/order_items?seller_id=eq.<user_id>&select=*,order:orders!inner(*)`

**Headers**: Authorization required (seller role)

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "order_id": "uuid",
    "product_id": "uuid",
    "seller_id": "uuid",
    "product_name": "Fresh Tomatoes",
    "product_category": "vegetables",
    "price": 2.99,
    "unit": "kg",
    "quantity": 2,
    "item_total": 5.98,
    "order": {
      "id": "uuid",
      "order_number": "ORD-20260427-000001",
      "buyer_id": "uuid",
      "delivery_address": "123 Main St, City, State",
      "payment_type": "cash_on_delivery",
      "payment_status": "pending",
      "order_status": "placed",
      "total_amount": 11.00,
      "created_at": "2026-04-27T10:00:00Z"
    }
  }
]
```

### 4. Update Order Status (Seller Only)
**Endpoint**: `PATCH /rest/v1/orders?id=eq.<order_id>`

**Headers**: Authorization required (seller role)

**Request Body**:
```json
{
  "order_status": "confirmed"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "order_status": "confirmed",
  "updated_at": "2026-04-27T11:00:00Z"
}
```

---

## Payment APIs (Edge Functions)

### 1. Create Stripe Checkout
**Endpoint**: `POST /functions/v1/create_stripe_checkout`

**Headers**: Authorization required

**Request Body**:
```json
{
  "items": [
    {
      "name": "Fresh Tomatoes",
      "price": 2.99,
      "quantity": 2,
      "image_url": "https://..."
    }
  ],
  "currency": "usd",
  "payment_method_types": ["card"]
}
```

**Response** (200 OK):
```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": {
    "url": "https://checkout.stripe.com/...",
    "sessionId": "cs_test_...",
    "orderId": "uuid"
  }
}
```

**Error Response** (400/500):
```json
{
  "code": "FAIL",
  "message": "Error message"
}
```

### 2. Verify Stripe Payment
**Endpoint**: `POST /functions/v1/verify_stripe_payment`

**Headers**: Authorization required

**Request Body**:
```json
{
  "sessionId": "cs_test_..."
}
```

**Response** (200 OK):
```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": {
    "verified": true,
    "status": "paid",
    "sessionId": "cs_test_...",
    "paymentIntentId": "pi_...",
    "amount": 1100,
    "currency": "usd",
    "customerEmail": "user@example.com",
    "customerName": "John Doe",
    "orderUpdated": true
  }
}
```

**Payment Not Completed**:
```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": {
    "verified": false,
    "status": "unpaid",
    "sessionId": "cs_test_..."
  }
}
```

---

## Config APIs

### 1. Get Tax Rate
**Endpoint**: `GET /rest/v1/config?key=eq.tax_rate`

**Response** (200 OK):
```json
{
  "key": "tax_rate",
  "value": "0.05",
  "description": "Tax rate as decimal (e.g., 0.05 = 5%)",
  "updated_at": "2026-04-27T10:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "code": "400",
  "message": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "code": "401",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "code": "403",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "code": "404",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "code": "500",
  "message": "Internal server error"
}
```

---

## Rate Limiting
- Anonymous requests: 100 requests per hour
- Authenticated requests: 1000 requests per hour

## Pagination
Use `limit` and `offset` query parameters:
```
GET /rest/v1/products?limit=20&offset=0
```

## Filtering
Use PostgREST operators:
- `eq` - equals
- `gt` - greater than
- `lt` - less than
- `gte` - greater than or equal
- `lte` - less than or equal
- `like` - pattern matching
- `ilike` - case-insensitive pattern matching

Example:
```
GET /rest/v1/products?price=gte.2&price=lte.10&category=eq.vegetables
```

## Ordering
Use `order` parameter:
```
GET /rest/v1/products?order=price.asc,created_at.desc
```

---

## Webhooks (Future Enhancement)

### Order Status Update
**Event**: `order.status_updated`
**Payload**:
```json
{
  "event": "order.status_updated",
  "order_id": "uuid",
  "order_number": "ORD-20260427-000001",
  "old_status": "placed",
  "new_status": "confirmed",
  "timestamp": "2026-04-27T11:00:00Z"
}
```

### Payment Completed
**Event**: `payment.completed`
**Payload**:
```json
{
  "event": "payment.completed",
  "order_id": "uuid",
  "payment_intent_id": "pi_...",
  "amount": 1100,
  "currency": "usd",
  "timestamp": "2026-04-27T11:00:00Z"
}
```
