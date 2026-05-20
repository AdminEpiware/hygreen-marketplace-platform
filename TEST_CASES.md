# Smart Grocery Purchase App - Test Cases Documentation

## 1. Authentication Test Cases

### TC-AUTH-001: User Registration as Buyer
**Preconditions**: User is on the signup page
**Steps**:
1. Enter full name: "John Doe"
2. Enter email: "john@example.com"
3. Enter password: "SecurePass123"
4. Enter mobile number: "+1234567890"
5. Enter address: "123 Main St, City, State"
6. Select role: "Buyer"
7. Check "I agree to terms" checkbox
8. Click "Create Account" button
**Expected Result**: Account created successfully, redirected to login page with success message

### TC-AUTH-002: User Registration as Seller
**Preconditions**: User is on the signup page
**Steps**:
1. Enter full name: "Jane Smith"
2. Enter email: "jane@example.com"
3. Enter password: "SecurePass456"
4. Enter mobile number: "+0987654321"
5. Enter address: "456 Market St, City, State"
6. Select role: "Seller"
7. Check "I agree to terms" checkbox
8. Click "Create Account" button
**Expected Result**: Account created successfully, redirected to login page with success message

### TC-AUTH-003: Login with Valid Credentials
**Preconditions**: User has registered account
**Steps**:
1. Navigate to login page
2. Enter email: "john@example.com"
3. Enter password: "SecurePass123"
4. Click "Sign In" button
**Expected Result**: User logged in successfully, redirected to products page

### TC-AUTH-004: Login with Invalid Credentials
**Preconditions**: User is on login page
**Steps**:
1. Enter email: "invalid@example.com"
2. Enter password: "WrongPassword"
3. Click "Sign In" button
**Expected Result**: Error message displayed: "Invalid login credentials"

### TC-AUTH-005: Registration Without Terms Agreement
**Preconditions**: User is on signup page
**Steps**:
1. Fill all required fields
2. Do NOT check "I agree to terms" checkbox
3. Click "Create Account" button
**Expected Result**: Error message: "Please agree to the User Agreement and Privacy Policy"

### TC-AUTH-006: Logout Functionality
**Preconditions**: User is logged in
**Steps**:
1. Click on user profile icon in header
2. Click "Sign Out" from dropdown menu
**Expected Result**: User logged out, redirected to login page, session cleared

---

## 2. Buyer Feature Test Cases

### TC-BUYER-001: Browse Products by Category
**Preconditions**: User is logged in as buyer
**Steps**:
1. Navigate to products page
2. Click on category dropdown
3. Select "Vegetables"
**Expected Result**: Only vegetable products are displayed

### TC-BUYER-002: Search Products by Name
**Preconditions**: User is on products page
**Steps**:
1. Enter "tomato" in search bar
2. Press Enter or wait for auto-search
**Expected Result**: Only products with "tomato" in name are displayed

### TC-BUYER-003: View Product Details
**Preconditions**: User is on products page
**Steps**:
1. Click on any product card
**Expected Result**: Product details page opens showing name, price, category, description, available quantity, and image

### TC-BUYER-004: Add Product to Cart
**Preconditions**: User is logged in as buyer, on product details page
**Steps**:
1. Enter quantity: 2
2. Click "Add to Cart" button
**Expected Result**: Success message "Added to cart!", product added to cart

### TC-BUYER-005: Update Cart Item Quantity
**Preconditions**: User has items in cart
**Steps**:
1. Navigate to cart page
2. Click "+" button to increase quantity
3. Click "-" button to decrease quantity
**Expected Result**: Quantity updated, item total recalculated, cart total updated

### TC-BUYER-006: Remove Item from Cart
**Preconditions**: User has items in cart
**Steps**:
1. Navigate to cart page
2. Click trash icon on cart item
**Expected Result**: Item removed from cart, success message displayed

### TC-BUYER-007: Proceed to Checkout
**Preconditions**: User has items in cart
**Steps**:
1. Navigate to cart page
2. Click "Proceed to Checkout" button
**Expected Result**: Redirected to checkout page with order summary

### TC-BUYER-008: Place Order with Cash on Delivery
**Preconditions**: User is on checkout page with items
**Steps**:
1. Verify/update delivery address
2. Select "Cash on Delivery" payment option
3. Click "Place Order" button
**Expected Result**: Order placed successfully, redirected to buyer dashboard, order visible in order history

### TC-BUYER-009: Place Order with Weekly Payment Plan
**Preconditions**: User is on checkout page with items
**Steps**:
1. Verify/update delivery address
2. Select "Weekly Payment Plan" payment option
3. Click "Place Order" button
**Expected Result**: Order placed, due date set to 7 days from now, order visible in pending payments

### TC-BUYER-010: Place Order with Monthly Payment Plan
**Preconditions**: User is on checkout page with items
**Steps**:
1. Verify/update delivery address
2. Select "Monthly Payment Plan" payment option
3. Click "Place Order" button
**Expected Result**: Order placed, due date set to 30 days from now, order visible in pending payments

### TC-BUYER-011: View Order History
**Preconditions**: User is logged in as buyer with past orders
**Steps**:
1. Navigate to buyer dashboard
2. Click "Order History" tab
**Expected Result**: All past orders displayed with order number, date, status, and total amount

### TC-BUYER-012: View Pending Payments
**Preconditions**: User has orders with pending payment status
**Steps**:
1. Navigate to buyer dashboard
2. Click "Pending Payments" tab
**Expected Result**: All orders with pending payments displayed with due dates and amounts

---

## 3. Seller Feature Test Cases

### TC-SELLER-001: Add New Product
**Preconditions**: User is logged in as seller
**Steps**:
1. Navigate to Product Management page
2. Click "Add Product" button
3. Enter product name: "Fresh Tomatoes"
4. Select category: "Vegetables"
5. Enter price: 2.99
6. Enter unit: "kg"
7. Enter available quantity: 100
8. Enter description: "Fresh organic tomatoes"
9. Click "Add Product" button
**Expected Result**: Product added successfully, appears in product list

### TC-SELLER-002: Add Product Without Image
**Preconditions**: User is on add product form
**Steps**:
1. Fill all required fields
2. Leave "Image URL" field empty
3. Click "Add Product" button
**Expected Result**: Product added with default category image

### TC-SELLER-003: Edit Existing Product
**Preconditions**: Seller has existing products
**Steps**:
1. Navigate to Product Management page
2. Click edit icon on a product
3. Update price to 3.49
4. Click "Update Product" button
**Expected Result**: Product updated successfully, new price reflected in list

### TC-SELLER-004: Delete Product
**Preconditions**: Seller has existing products
**Steps**:
1. Navigate to Product Management page
2. Click delete icon on a product
3. Confirm deletion in dialog
**Expected Result**: Product deleted successfully, removed from list

### TC-SELLER-005: View All Orders
**Preconditions**: Seller has received orders
**Steps**:
1. Navigate to Seller Dashboard
2. View "All Orders" tab
**Expected Result**: All orders containing seller's products displayed with order details

### TC-SELLER-006: Update Order Status to Confirmed
**Preconditions**: Seller has orders in "Placed" status
**Steps**:
1. Navigate to Seller Dashboard
2. Find order with "Placed" status
3. Change status dropdown to "Confirmed"
**Expected Result**: Order status updated, success message displayed

### TC-SELLER-007: Update Order Status to Packed
**Preconditions**: Seller has orders in "Confirmed" status
**Steps**:
1. Navigate to Seller Dashboard
2. Find order with "Confirmed" status
3. Change status dropdown to "Packed"
**Expected Result**: Order status updated to "Packed"

### TC-SELLER-008: Update Order Status to Delivered
**Preconditions**: Seller has orders in "Packed" status
**Steps**:
1. Navigate to Seller Dashboard
2. Find order with "Packed" status
3. Change status dropdown to "Delivered"
**Expected Result**: Order status updated to "Delivered"

### TC-SELLER-009: View Buyer Contact Details
**Preconditions**: Seller has received orders
**Steps**:
1. Navigate to Seller Dashboard
2. View order details
**Expected Result**: Buyer's delivery address and contact information visible

### TC-SELLER-010: View Daily Sales Summary
**Preconditions**: Seller has completed orders
**Steps**:
1. Navigate to Seller Dashboard
2. View "Daily Sales" card
**Expected Result**: Correct total of today's sales displayed

### TC-SELLER-011: View Weekly Sales Summary
**Preconditions**: Seller has completed orders
**Steps**:
1. Navigate to Seller Dashboard
2. View "Weekly Sales" card
**Expected Result**: Correct total of last 7 days' sales displayed

### TC-SELLER-012: View Monthly Sales Summary
**Preconditions**: Seller has completed orders
**Steps**:
1. Navigate to Seller Dashboard
2. View "Monthly Sales" card
**Expected Result**: Correct total of last 30 days' sales displayed

---

## 4. Cart & Price Calculation Test Cases

### TC-CART-001: Calculate Item Total
**Preconditions**: User adds product to cart
**Steps**:
1. Add product with price $2.99 and quantity 3
**Expected Result**: Item total = $8.97 (2.99 × 3)

### TC-CART-002: Calculate Cart Subtotal
**Preconditions**: User has multiple items in cart
**Steps**:
1. Add item 1: $2.99 × 2 = $5.98
2. Add item 2: $4.50 × 1 = $4.50
**Expected Result**: Subtotal = $10.48

### TC-CART-003: Calculate Tax
**Preconditions**: Cart has items, tax rate is 5%
**Steps**:
1. View cart with subtotal $10.48
**Expected Result**: Tax = $0.52 (10.48 × 0.05)

### TC-CART-004: Calculate Grand Total
**Preconditions**: Cart has items
**Steps**:
1. View cart with subtotal $10.48 and tax $0.52
**Expected Result**: Grand Total = $11.00

### TC-CART-005: Recalculate on Quantity Update
**Preconditions**: User has items in cart
**Steps**:
1. Update item quantity from 2 to 5
**Expected Result**: Item total, subtotal, tax, and grand total all recalculated correctly

---

## 5. Order & Payment Test Cases

### TC-ORDER-001: Generate Unique Order Number
**Preconditions**: User places order
**Steps**:
1. Complete checkout and place order
**Expected Result**: Order number generated in format "ORD-YYYYMMDD-XXXXXX" (e.g., ORD-20260427-000001)

### TC-ORDER-002: Order Status Progression
**Preconditions**: Order is placed
**Steps**:
1. Verify initial status: "Placed"
2. Seller updates to "Confirmed"
3. Seller updates to "Packed"
4. Seller updates to "Delivered"
**Expected Result**: Status progresses correctly through all stages

### TC-ORDER-003: Payment Status - Cash on Delivery
**Preconditions**: Order placed with COD
**Steps**:
1. Place order with COD payment
**Expected Result**: Payment status = "Pending" until seller marks as completed

### TC-ORDER-004: Payment Status - Online Payment
**Preconditions**: Order placed with online payment
**Steps**:
1. Place order with online payment
2. Complete Stripe payment
**Expected Result**: Payment status = "Completed" immediately after successful payment

### TC-ORDER-005: Weekly Payment Plan Due Date
**Preconditions**: Order placed with weekly plan
**Steps**:
1. Place order on 2026-04-27
**Expected Result**: Due date = 2026-05-04 (7 days later)

### TC-ORDER-006: Monthly Payment Plan Due Date
**Preconditions**: Order placed with monthly plan
**Steps**:
1. Place order on 2026-04-27
**Expected Result**: Due date = 2026-05-27 (30 days later)

### TC-ORDER-007: Online Payment - Stripe Checkout
**Preconditions**: User selects online payment
**Steps**:
1. Select "Online Payment" option
2. Click "Place Order"
**Expected Result**: Stripe checkout page opens in new tab

### TC-ORDER-008: Online Payment - Verification
**Preconditions**: User completes Stripe payment
**Steps**:
1. Complete payment on Stripe
2. Redirected to payment success page
**Expected Result**: Payment verified, order status updated to "Completed"

---

## 6. Contact Visibility Test Cases

### TC-CONTACT-001: Buyer Cannot See Seller Contact Before Order
**Preconditions**: Buyer is browsing products
**Steps**:
1. View product details
**Expected Result**: Seller contact information NOT visible

### TC-CONTACT-002: Buyer Can See Seller Contact After Order
**Preconditions**: Buyer has placed order
**Steps**:
1. Navigate to buyer dashboard
2. View order details
**Expected Result**: Seller contact information visible in order details

### TC-CONTACT-003: Seller Can See Buyer Contact for Orders
**Preconditions**: Seller has received orders
**Steps**:
1. Navigate to seller dashboard
2. View order details
**Expected Result**: Buyer's delivery address and mobile number visible

---

## 7. Negative Test Cases

### TC-NEG-001: Add to Cart Exceeding Stock
**Preconditions**: Product has 10 units available
**Steps**:
1. Enter quantity: 15
2. Click "Add to Cart"
**Expected Result**: Error message: "Requested quantity exceeds available stock"

### TC-NEG-002: Checkout with Empty Cart
**Preconditions**: User has empty cart
**Steps**:
1. Navigate to /checkout directly
**Expected Result**: Message displayed: "Your cart is empty" with button to browse products

### TC-NEG-003: Access Seller Pages as Buyer
**Preconditions**: User logged in as buyer
**Steps**:
1. Navigate to /seller/products
**Expected Result**: Access denied or redirected

### TC-NEG-004: Access Buyer Cart as Seller
**Preconditions**: User logged in as seller
**Steps**:
1. Navigate to /cart
**Expected Result**: Message: "Please sign in as a buyer to view cart"

### TC-NEG-005: Place Order Without Delivery Address
**Preconditions**: User is on checkout page
**Steps**:
1. Clear delivery address field
2. Click "Place Order"
**Expected Result**: Error message: "Please enter delivery address"

### TC-NEG-006: Add Product with Negative Price
**Preconditions**: Seller is adding product
**Steps**:
1. Enter price: -5.00
2. Click "Add Product"
**Expected Result**: Validation error, product not added

### TC-NEG-007: Add Product with Zero Quantity
**Preconditions**: Seller is adding product
**Steps**:
1. Enter available quantity: 0
2. Click "Add Product"
**Expected Result**: Validation error or product added but not visible to buyers

### TC-NEG-008: Update Cart Quantity to Zero
**Preconditions**: User has item in cart
**Steps**:
1. Update quantity to 0
**Expected Result**: Item removed from cart or quantity reverts to 1

---

## 8. Security & Role-Based Access Test Cases

### TC-SEC-001: Unauthenticated Access to Protected Routes
**Preconditions**: User is not logged in
**Steps**:
1. Navigate to /cart
**Expected Result**: Redirected to /login

### TC-SEC-002: Buyer Cannot Access Seller Routes
**Preconditions**: User logged in as buyer
**Steps**:
1. Navigate to /seller/dashboard
**Expected Result**: Access denied or redirected

### TC-SEC-003: Seller Cannot Access Buyer Cart
**Preconditions**: User logged in as seller
**Steps**:
1. Navigate to /cart
**Expected Result**: Message: "Please sign in as a buyer"

### TC-SEC-004: Seller Cannot Modify Other Seller's Products
**Preconditions**: Two sellers exist with products
**Steps**:
1. Seller A logs in
2. Attempts to edit Seller B's product
**Expected Result**: Product not visible in Seller A's product list

### TC-SEC-005: Buyer Cannot View Other Buyer's Orders
**Preconditions**: Two buyers with orders exist
**Steps**:
1. Buyer A logs in
2. Views dashboard
**Expected Result**: Only Buyer A's orders visible

### TC-SEC-006: SQL Injection Prevention
**Preconditions**: User is on search field
**Steps**:
1. Enter: "'; DROP TABLE products; --"
2. Submit search
**Expected Result**: Search returns no results, no database damage

### TC-SEC-007: XSS Prevention in Product Name
**Preconditions**: Seller is adding product
**Steps**:
1. Enter product name: "<script>alert('XSS')</script>"
2. Save product
3. View product on buyer side
**Expected Result**: Script not executed, displayed as plain text

---

## 9. API Test Cases

### TC-API-001: GET Products - Success
**Endpoint**: GET /rest/v1/products
**Expected Response**: 200 OK, array of products

### TC-API-002: POST Cart Item - Success
**Endpoint**: POST /rest/v1/cart
**Body**: { buyer_id, product_id, quantity }
**Expected Response**: 201 Created

### TC-API-003: POST Order - Success
**Endpoint**: POST /rest/v1/orders
**Body**: { buyer_id, delivery_address, payment_type, ... }
**Expected Response**: 201 Created, order object with order_number

### TC-API-004: PATCH Order Status - Success
**Endpoint**: PATCH /rest/v1/orders/{id}
**Body**: { order_status: "confirmed" }
**Expected Response**: 200 OK

### TC-API-005: POST Stripe Checkout - Success
**Endpoint**: POST /functions/v1/create_stripe_checkout
**Body**: { items: [...] }
**Expected Response**: 200 OK, { url, sessionId, orderId }

### TC-API-006: POST Verify Payment - Success
**Endpoint**: POST /functions/v1/verify_stripe_payment
**Body**: { sessionId }
**Expected Response**: 200 OK, { verified: true, ... }

---

## 10. Automation Structure

### Postman Collection Structure
```
Smart Grocery API Tests
├── Authentication
│   ├── Signup Buyer
│   ├── Signup Seller
│   ├── Login
│   └── Logout
├── Products
│   ├── Get All Products
│   ├── Get Product by ID
│   ├── Create Product (Seller)
│   ├── Update Product (Seller)
│   └── Delete Product (Seller)
├── Cart
│   ├── Add to Cart
│   ├── Get Cart Items
│   ├── Update Cart Item
│   └── Remove from Cart
├── Orders
│   ├── Create Order
│   ├── Get Buyer Orders
│   ├── Get Seller Orders
│   └── Update Order Status
└── Payment
    ├── Create Stripe Checkout
    └── Verify Payment
```

### Cypress E2E Test Structure
```
cypress/e2e/
├── auth/
│   ├── signup.cy.ts
│   └── login.cy.ts
├── buyer/
│   ├── browse-products.cy.ts
│   ├── cart.cy.ts
│   ├── checkout.cy.ts
│   └── dashboard.cy.ts
├── seller/
│   ├── product-management.cy.ts
│   └── dashboard.cy.ts
└── payment/
    └── stripe-payment.cy.ts
```

### Jest Unit Test Structure
```
src/__tests__/
├── components/
│   ├── ProductCard.test.tsx
│   ├── CartItem.test.tsx
│   └── OrderStatusBadge.test.tsx
├── utils/
│   ├── priceCalculation.test.ts
│   └── dateUtils.test.ts
└── hooks/
    └── useAuth.test.ts
```

---

## Test Execution Summary

**Total Test Cases**: 70+
- Authentication: 6
- Buyer Features: 12
- Seller Features: 12
- Cart & Pricing: 5
- Orders & Payments: 8
- Contact Visibility: 3
- Negative Tests: 8
- Security & Access Control: 7
- API Tests: 6
- Additional edge cases: 3+

**Priority Levels**:
- P0 (Critical): Authentication, Order Placement, Payment Processing
- P1 (High): Product Management, Cart Operations, Dashboard Views
- P2 (Medium): Search, Filters, Sales Summary
- P3 (Low): UI/UX enhancements, Optional features

**Test Environment Requirements**:
- Supabase test database
- Stripe test API keys
- Test user accounts (buyer and seller)
- Sample product data
- Mock payment scenarios
