# Requirements Document

## 1. Application Overview

### 1.1 Application Name
Smart Grocery (Expanding to General E-commerce Platform)

### 1.2 Application Description
A comprehensive e-commerce marketplace platform connecting Buyers and Sellers across all major product categories with the tagline 「One family: farmers, manufacturers, and consumers」. The platform supports multi-store management for buyers, comprehensive seller verification with state management, flexible payment plans, product listing with dynamic category organization, cart management, order processing, advanced billing module for online and offline sales, UPI payment integration with real-time transaction handling, Pay Later accounts with Aadhaar/Company ID verification and credit limit management, store-level Pay Later eligibility with visual indicators, product review and rating system, password recovery with show/hide password feature, bulk product upload via Excel with brand name support, dynamic currency support with INR as default, Help Center with ticket tracking, comprehensive profile management with photo upload and address management, account deletion with admin approval, store-level financial isolation, complete audit logging for compliance, sticky search bar with smart auto-suggestions and voice search for buyers, seller dashboard search with barcode scan and inventory alerts, enhanced cart icon with real-time product count, seller name as fallback store name when store_name is null, inline Pay Later availability display on every store card, per-store Pay Later request buttons with automatic seller name fallback and credit limit display, store contact details visibility with seller permission control, brand name display on product cards and details, bookmark/favourite products feature, dynamic category system supporting all major product categories with admin-managed category expansion, and verification document upload with Aadhaar Card and Company ID/Other Document ID options.

## 2. Users and Usage Scenarios

### 2.1 Target Users
- **Buyer**: Users who manage multiple stores/accounts, browse and purchase products across all categories using sticky search bar with smart suggestions and filters, use flexible payment options including Pay Later with credit limits, provide reviews after delivery, track orders per store, manage personal profiles with delivery addresses, view real-time cart product count, see Pay Later availability directly on store cards, request Pay Later per store with credit limit visibility, view store contact details if seller allows, bookmark/favourite products for quick access, and browse products by dynamic categories
- **Seller**: Verified users who manage products within assigned stores using dashboard search with barcode scan and inventory alerts, process orders, generate invoices for online and offline sales, respond to reviews, upload products in bulk with brand name, choose payment plans, setup Pay Later eligibility for stores, maintain profile information, control buyer contact access visibility, perform quick actions on product cards, and list products across all major categories
- **Admin**: Users who approve seller verification with state management, manage Pay Later account approvals with credit limit assignment, approve account deletion requests, oversee platform operations with audit logs, and manage dynamic category system by adding new categories and subcategories

### 2.2 Core Usage Scenarios
- Buyers use sticky search bar at top of home screen to search products, stores, and categories with smart auto-suggestions and voice search
- Buyers apply filter chips to refine search results
- Buyers view grouped search results and access recent searches and trending searches
- Buyers browse home page in specific order: Sticky search bar → Stores List → Store-wise product listings → Most People Bought section → Recently Bought by You section
- Buyers view real-time cart product count on cart icon, updated instantly on add/remove actions
- Buyers see Pay Later availability badge/icon directly on each store card without needing to open store details
- Buyers use Pay Later Only filter toggle to show only stores with Pay Later enabled
- Buyers request Pay Later per store using Request Pay Later button on store cards, with automatic seller name fallback if store name unavailable, and view credit limit in request form
- Buyers view store contact details on product pages and store pages if seller allows buyer contact access
- Buyers bookmark/favourite products and access saved products from dedicated Favourite Products section
- Buyers browse products by dynamic categories covering all major product types
- Sellers use dashboard search bar to find products by name, code, SKU, category, barcode, or brand name
- Sellers apply filters to manage inventory
- Sellers use barcode scan search for quick product lookup
- Sellers receive inventory alerts and low stock warnings via dashboard search
- Sellers perform quick actions on product cards
- Sellers undergo mandatory verification workflow with document submission (Aadhaar Card or Company ID/Other Document ID) and admin approval before accessing platform features
- Approved sellers select payment settlement plans and manage store-level billing operations
- Sellers generate invoices for both online orders and direct store sales with complete itemization
- Sellers enable Pay Later for eligible stores with visual crown icon indicator
- Sellers control buyer contact access visibility per store
- Sellers add brand name to products during listing or bulk upload
- Buyers manage multiple stores with complete financial isolation and separate payment tracking
- Buyers use Pay Later accounts with credit limits tracked per store
- Buyers make UPI payments with real-time transaction handling and callback processing
- System maintains store-level financial records with complete transaction traceability
- Admin manages seller verification states and Pay Later approvals with audit logging
- Admin manages dynamic category system by adding new categories and subcategories
- All financial transactions are logged for compliance and reconciliation
- System automatically uses seller full_name or business_name as store name when store_name is null or missing

## 3. Page Structure and Functionality

### 3.1 Page Structure
```
├── Authentication Pages
│   ├── Login Page
│   ├── Signup Page
│   ├── Forgot Password Page
│   └── Reset Password Page
├── Buyer Pages
│   ├── Buyer Home Page (with Sticky Search Bar)
│   ├── Search Results Page
│   ├── Store Selection/Switch Page
│   ├── Product Listing Page
│   ├── Product Details Page
│   ├── Cart Page
│   ├── Checkout Page
│   ├── Review Submission Page
│   ├── Profile Management Page
│   ├── Pay Later Account Application Page
│   ├── Favourite Products Page
│   ├── Help Center Page
│   └── Buyer Dashboard
│       ├── Active Store Indicator
│       ├── Store Management
│       ├── Order History (Store-specific)
│       ├── Order Tracking (Store-specific)
│       ├── Invoices (Store-specific)
│       ├── Pending Payments (Store-specific)
│       ├── Pay Later Account Status
│       ├── Credit Usage Tracking
│       ├── My Reviews
│       ├── Favourite Products
│       └── Support Tickets
├── Seller Pages
│   ├── Seller Verification Application Page
│   ├── Payment Plan Selection Page
│   ├── Product Management Page (with Dashboard Search Bar)
│   ├── Bulk Upload Page
│   ├── Store Pay Later Setup Page
│   ├── Store Contact Settings Page
│   ├── Billing Module
│   │   ├── Invoice Generation Page
│   │   ├── Invoice History Page
│   │   └── Direct Sales Invoice Page
│   ├── Profile Management Page
│   ├── Help Center Page
│   └── Seller Dashboard (with Search Bar)
│       ├── Store Information
│       ├── Verification Status
│       ├── Stock List
│       ├── Listed Products (Category-wise View)
│       ├── Order Management
│       ├── Billing Module Access
│       ├── Financial Records (Store-level)
│       ├── Settlement Summary
│       ├── Sales Summary
│       ├── Product Reviews
│       └── Support Tickets
└── Admin Pages
    ├── Seller Verification Management Page
    ├── Pay Later Account Approval Page
    ├── Account Deletion Approval Page
    ├── Category Management Page
    ├── Audit Log Viewer Page
    └── Admin Dashboard
```

### 3.2 Authentication Pages

#### 3.2.1 Login Page
- Email input field
- Password input field with show/hide password toggle icon
- Login button
- Forgot Password link
- Link to Signup page
- Role-based routing after successful login

#### 3.2.2 Signup Page
- Full Name input field
- Email input field
- Password input field with show/hide password toggle icon and strength indicator
- Mobile Number input field
- Address input field
- Country selection dropdown (default: India)
- Role selection (Buyer / Seller)
- Signup button
- Link to Login page
- Password validation display

#### 3.2.3 Forgot Password Page
- Email or Mobile Number input field
- Send OTP button
- Back to Login link
- Success message display after sending OTP
- Error message display for invalid email or mobile number

#### 3.2.4 Reset Password Page
- OTP input field
- New Password input field with show/hide password toggle icon
- Confirm Password input field with show/hide password toggle icon
- Password strength indicator
- Reset Password button
- Resend OTP link (enabled after 60 seconds)
- OTP expiry timer display (10 minutes countdown)
- Remaining attempts display (maximum 3)
- Success message after password reset
- Redirect to Login page after successful reset

### 3.3 Buyer Pages

#### 3.3.1 Buyer Home Page
- **Sticky Search Bar** (fixed at top, always visible on scroll)
- **Header Section** (below sticky search bar)
- **Page Section Order**:
  1. **Stores List Section**
  2. **Store-wise Product Listing Sections** (vertically stacked)
  3. **Most People Bought Section**
  4. **Recently Bought by You Section** (logged-in users only)
- **Amazon-Style ProductCard Component** with Store/Seller Name and Brand Name displayed on top of product image
- **UI/UX Features**
- **Performance Optimizations**
- **Cart Badge Update**
- **Navigation**

#### 3.3.2 Search Results Page
- Sticky search bar at top
- Active filter chips display (removable)
- Search query display
- Grouped results display: Products, Stores, Categories
- Pagination controls for products
- No results message if search returns empty
- Back to Home button

#### 3.3.3 Store Selection/Switch Page
- List of buyer stores/accounts with store name (uses seller full_name or business_name if store_name is null), delivery address, Pay Later availability badge/icon, Select button
- Add New Store button
- Active store indicator (highlighted)
- Store creation form

#### 3.3.4 Product Listing Page
- Active store indicator at top
- Pay Later enabled indicator
- Store switch button
- Category filter (dynamic categories)
- Search bar for product search
- Cart icon with product count badge
- Product cards display with Store/Seller Name and Brand Name on top of product image
- Click product card to view details

#### 3.3.5 Product Details Page
- Active store indicator
- Pay Later enabled indicator
- Store contact details display (if seller allows buyer contact access)
- Product image
- Product name
- Brand name display
- Category
- Price in INR with symbol
- Unit
- Available quantity
- Average rating
- Total number of reviews
- Description
- Quantity input field
- Add to Cart button
- Bookmark/Favourite button
- Back to listing button
- Reviews section

#### 3.3.6 Cart Page
- Active store indicator
- Pay Later enabled indicator
- Cart item count display at top
- List of cart items with product details
- Subtotal display in INR
- Tax display in INR
- Grand Total display in INR
- Proceed to Checkout button
- Continue Shopping button

#### 3.3.7 Checkout Page
- Active store indicator
- Pay Later enabled indicator
- Order summary with all cart items
- Delivery address selection dropdown
- Add New Address button
- Payment option selection: Cash on Delivery, UPI Payment, Weekly Payment Plan, Monthly Payment Plan, Pay Later Account
- For Pay Later: Display available credit, used credit, and terms
- Pay Later credit limit validation display
- Total amount display in INR
- Place Order button

#### 3.3.8 Review Submission Page
- Accessible only for delivered orders
- Product information display
- Rating selection (1 to 5 stars)
- Review text input
- Submit Review button
- Cancel button

#### 3.3.9 Profile Management Page
- Profile photo section
- Personal Information section
- Delivery Addresses section
- Edit Mode toggle button
- Save Changes button
- Cancel button
- Success message display after successful update
- Error message display for validation failures
- Loading indicator during save operation

#### 3.3.10 Pay Later Account Application Page
- Application form with account holder name, account type selection, Aadhaar Number or Company ID input, document upload area (Aadhaar Card or Company ID/Other Document ID), requested credit limit input, terms and conditions checkbox, Submit Application button
- Application status display
- If Approved: Assigned credit limit display, available credit display, used credit display, credit usage history
- Resubmit button (if rejected)

#### 3.3.11 Favourite Products Page
- List of bookmarked/favourite products
- Product cards display with Store/Seller Name and Brand Name on top of product image
- Remove from Favourites button on each product card
- Add to Cart button on each product card
- Empty state message if no favourite products
- Back to Home button

#### 3.3.12 Help Center Page
- FAQ section with expandable questions
- Issue reporting form
- My Tickets section

#### 3.3.13 Buyer Dashboard
- Active Store Indicator
- Store Management section
- Order History section (store-specific)
- Order Tracking section (store-specific)
- Invoices section (store-specific)
- Pending Payments section (store-specific)
- Pay Later Account Status
- Credit Usage Tracking
- My Reviews section
- Favourite Products section with link to Favourite Products Page
- Support Tickets section
- Account Settings

### 3.4 Seller Pages

#### 3.4.1 Seller Verification Application Page
- Verification status display with state indicator
- Application form with Business Name, Business Type selection, Business Address, Contact Number, Aadhaar Number or Company ID input, Document upload area (Aadhaar Card or Company ID/Other Document ID), Submit Application button
- Resubmit button (if rejected with rejection reason display)
- Approval pending message (if submitted)
- Access restriction notice (if not approved)

#### 3.4.2 Payment Plan Selection Page
- Available only after seller verification approval
- Payment plan options: Weekly Settlement Plan, Monthly Settlement Plan
- Plan details display
- Select Plan button for each option
- Confirmation message after selection
- Plan change restriction notice

#### 3.4.3 Product Management Page
- Store information display at top
- Verification status indicator
- Add Product form with product name, category selection dropdown (dynamic categories), brand name input, price value input, unit selection dropdown, available quantity input, description textarea, product image upload, Submit button
- Bulk Upload button
- Category filter dropdown (dynamic categories)
- Search within category input field
- Category tabs or sections (dynamic categories)
- Listed Products displayed under each category
- Expand/collapse functionality for each category section

#### 3.4.4 Bulk Upload Page
- Download Excel Template button (includes Category column and Brand Name column)
- File upload area
- File size limit display (5MB)
- Upload button
- Data preview table with Product Name, Brand Name, Price Value, Unit, Quantity, Product Code, Description, Barcode, Category, Validation status indicator
- Confirm Upload button
- Cancel button
- Upload summary display
- Back to Product Management button

#### 3.4.5 Store Pay Later Setup Page
- Available only for approved sellers
- Store information display
- Pay Later eligibility toggle
- Eligibility requirements display
- Setup confirmation message
- Crown icon preview when enabled
- Terms and conditions for Pay Later service
- Save Settings button

#### 3.4.6 Store Contact Settings Page
- Store information display
- Buyer Contact Access toggle: Enable buyer contact access, Disable buyer contact access
- Contact details display (phone number, email)
- Save Settings button
- Confirmation message after save

#### 3.4.7 Billing Module

##### 3.4.7.1 Invoice Generation Page
- Invoice type selection: Online Order Invoice, Direct Store Sale Invoice
- For Online Orders: Order selection dropdown, auto-populated fields, Generate Invoice button
- For Direct Sales: Manual entry form, Generate Invoice button
- Invoice preview section
- Print Invoice button
- Save Invoice button
- Auto invoice number generation display

##### 3.4.7.2 Invoice History Page
- Filter options
- Invoice list display
- Search by invoice number
- Pagination controls

##### 3.4.7.3 Direct Sales Invoice Page
- Dedicated page for walk-in/direct store sales
- Quick invoice generation form
- Product quick-add from inventory
- Real-time total calculation
- Print receipt option
- Save to invoice history

#### 3.4.8 Profile Management Page
- Profile photo section
- Personal Information section
- Business Information section
- Edit Mode toggle button
- Save Changes button
- Cancel button
- Success message display after successful update
- Error message display for validation failures
- Loading indicator during save operation

#### 3.4.9 Help Center Page
- FAQ section with expandable questions
- Issue reporting form
- My Tickets section

#### 3.4.10 Seller Dashboard
- Dashboard Search Bar (sticky at top, fixed on scroll, fully visible and responsive)
- Verification Status Banner
- Store Information section
- Stock List section
- Listed Products section with category tabs (dynamic categories)
- Order Management section
- Billing Module Access
- Financial Records section
- Settlement Summary section
- Pending Payments section
- Sales Summary section
- Product Reviews section
- Support Tickets section
- Account Settings

### 3.5 Admin Pages

#### 3.5.1 Seller Verification Management Page
- Filter options
- List of seller verification applications
- Application details view with uploaded documents (Aadhaar Card or Company ID/Other Document ID) preview, verification history log, action buttons
- Bulk action options
- Search by seller name or business name

#### 3.5.2 Pay Later Account Approval Page
- Filter options
- List of Pay Later account applications
- Application details view with uploaded documents (Aadhaar Card or Company ID/Other Document ID) preview, credit assessment section, assign credit limit input field, action buttons
- Credit limit recommendation engine display
- Search by applicant name

#### 3.5.3 Account Deletion Approval Page
- List of account deletion requests
- Request details view
- Automated pending payment validation
- Search by user name or email

#### 3.5.4 Category Management Page
- List of all categories and subcategories
- Add New Category button
- Add New Subcategory button
- Category form with category name input, parent category selection (for subcategories), Save button, Cancel button
- Edit button for each category
- Delete button for each category (with confirmation)
- Category hierarchy display (tree structure)
- Search by category name

#### 3.5.5 Audit Log Viewer Page
- Filter options
- Audit log table display
- Log details view
- Export audit logs to CSV
- Search by user ID or action type
- Real-time log updates

#### 3.5.6 Admin Dashboard
- Platform Statistics
- Verification Queue
- Pay Later Queue
- Financial Overview
- System Health
- Quick Access Links
- Recent Activity Feed

## 4. Business Rules and Logic

### 4.1 Store Name Fallback Rule
- Automatic Fallback: When store_name is null or missing in database, system automatically uses seller full_name or business_name as store name
- Application Scope: Fallback applies to all pages and components displaying store name
- Fallback Priority: If store_name exists and not null, use store_name; if store_name is null or missing, use seller business_name; if business_name also null or missing, use seller full_name
- No \"Store not found\" errors: With fallback in place, no store should ever display \"Store not found\" error due to missing store_name
- Database Query: All queries fetching store data must include seller full_name and business_name for fallback
- Frontend Display: Frontend components must implement fallback logic: display_name = store_name || business_name || full_name

### 4.2 Pay Later Availability Display on Store Cards
- Inline Display Requirement: Every store card must display Pay Later availability directly on the card itself
- Visual Indicator: Store cards with pay_later_enabled = true must show crown icon and \"Pay Later Available\" label or badge
- Application Scope: Inline Pay Later display applies to Buyer Home Page Stores List section, Buyer Dashboard Shop by Store section, Search Results Page Stores section, Store Selection/Switch Page
- Per-Store Request Pay Later Button: Each store card with pay_later_enabled = true must also display Request Pay Later button (if buyer has not yet requested Pay Later for this store) or status badge (if buyer has already requested Pay Later for this store)
- Button Behavior: Click Request Pay Later button opens Pay Later application form pre-filled with store information; if store name unavailable, automatically use seller name instead; display credit limit field in request form
- Separate Pay Later Filter: Existing \"Pay Later Only\" filter toggle in StoresListing page must remain functional

### 4.3 Store Contact Details Visibility
- Seller Control: Sellers can enable or disable buyer contact access per store via Store Contact Settings Page
- Buyer Contact Access Toggle: Enable buyer contact access (buyers can view store contact details), Disable buyer contact access (buyers cannot view store contact details)
- Contact Details Display: If seller allows buyer contact access, display store contact details (phone number, email) on Product Details Page and Store Listing Page
- Default Setting: Buyer contact access disabled by default for new stores
- Contact Details Location: Display contact details in dedicated section on Product Details Page and Store Listing Page, clearly labeled as \"Store Contact\"

### 4.4 Brand Name Support
- Brand Name Field: Add brand_name field to product schema
- Brand Name Input: Sellers can enter brand name during product creation or editing
- Brand Name in Bulk Upload: Bulk Upload Excel template includes Brand Name column
- Brand Name Display: Display brand name on Product Details Page, Product Cards (on top of product image), and Search Results
- Brand Name Search: Seller dashboard search bar supports search by brand name
- Brand Name Optional: Brand name is optional field, not mandatory

### 4.5 Seller Dashboard Search Bar Fix
- Search Bar Visibility: Search bar must be fully visible at top of Seller Dashboard, sticky on scroll
- Search Bar UI: Search bar styled with clear input field, search icon, barcode scan icon, filter chips row below
- Search Bar Alignment: Search bar horizontally centered with proper padding and margins
- Search Bar Responsiveness: Search bar adapts to different screen sizes (mobile, tablet, desktop)
- Search Bar Functionality: Instant search results displayed while typing, barcode scan opens camera interface, filter chips toggleable

### 4.6 Pay Later Request with Seller Name Fallback and Credit Limit Display
- Automatic Seller Name Fallback: When creating Pay Later request, if store name is unavailable (null or missing), automatically use seller name (full_name or business_name) instead
- Credit Limit Display in Request Form: Pay Later request form displays credit limit field; buyers can view requested credit limit during application; after approval, buyers can view assigned credit limit
- Credit Limit Field Location: Display credit limit field in Pay Later Account Application Page, clearly labeled as \"Requested Credit Limit\" (during application) or \"Assigned Credit Limit\" (after approval)

### 4.7 Verification Document Upload Fix
- Document Upload Options: Show exactly two document upload options: Aadhaar Card, Company ID / Other Document ID
- Document Upload UI: Display two separate upload areas with clear labels
- Document Upload Validation: Validate file format (PDF, JPG, PNG), file size (maximum 5MB), and required fields
- Document Upload Error Handling: Display clear error messages for invalid file format, file size exceeded, or upload failure
- Document Upload Success: Display success message and document preview after successful upload

### 4.8 Product Card Improvements
- Store/Seller Name Display: Display store name (uses fallback if store_name null) on top of product image on product cards
- Brand Name Display: Display brand name on top of product image on product cards (below store/seller name)
- UI Visibility and Readability: Ensure store/seller name and brand name are clearly visible with contrasting background or overlay
- Text Positioning: Position store/seller name and brand name at top-left or top-center of product image
- Text Styling: Use bold font, white or dark text color with semi-transparent background for readability

### 4.9 Bookmark / Favourite Feature
- Bookmark Button: Add bookmark/favourite button on Product Details Page and Product Cards
- Bookmark Action: Click bookmark button adds product to buyer favourites list
- Unbookmark Action: Click bookmark button again removes product from favourites list
- Bookmark Icon: Use heart icon or bookmark icon to indicate favourite status (filled icon for bookmarked, outline icon for not bookmarked)
- Favourite Products Page: Dedicated page displaying all bookmarked/favourite products
- Favourite Products Section in Buyer Dashboard: Link to Favourite Products Page from Buyer Dashboard
- Favourite Products Display: Display favourite products as product cards with Store/Seller Name and Brand Name on top of product image
- Remove from Favourites: Each product card in Favourite Products Page has Remove from Favourites button
- Empty State: Display message \"No favourite products yet\" if buyer has not bookmarked any products

### 4.10 Dynamic Category System
- Predefined Categories: Platform supports all major product categories including Grocery & Essentials, Fruits & Vegetables, Dairy Products, Snacks & Beverages, Bakery Items, Frozen Foods, Meat & Seafood, Organic Products, Household Items, Cleaning Supplies, Kitchen Accessories, Fashion & Clothing, Men's Wear, Women's Wear, Kids' Wear, Footwear, Bags & Accessories, Cosmetics & Beauty Products, Personal Care Products, Health & Wellness, Medicines & Pharmacy, Baby Care Products, Sports & Fitness Items, Gym Equipment, Electronics, Mobile Phones & Accessories, Computers & Laptops, Home Appliances, Furniture, Home Decor, Stationery & Office Supplies, Books & Educational Products, Toys & Games, Pet Food & Pet Accessories, Automobile Accessories, Gardening Products, Jewelry & Watches, Gift Items, Religious & Festival Products, Hardware & Tools, Industrial Products, Agricultural Products, Farmer Products & Fresh Produce
- Subcategories: Each category can have multiple subcategories
- Admin Category Management: Admin can add new categories and subcategories via Category Management Page
- Category Hierarchy: Categories organized in tree structure with parent-child relationships
- Category Selection: Sellers select category and subcategory (if applicable) during product creation
- Category Filter: Buyers can filter products by category and subcategory on Product Listing Page and Search Results Page
- Category Search: Search functionality supports category-based search
- Category Display: Categories displayed as tabs or sections on Seller Dashboard and Product Listing Page
- Category Validation: System validates category selection during product creation and bulk upload

### 4.11 Authentication Rules
- Email must be unique across all users
- Password must be securely stored using hashing
- Password must meet strength requirements
- Show/hide password toggle available on all password input fields
- After login, route user based on role and verification status
- Users can only access features corresponding to their role and verification status
- Country selection is mandatory during signup for currency detection
- Deleted accounts can re-register using same email or mobile number

### 4.12 Password Reset Rules
- User can initiate password reset using registered email or mobile number
- System sends OTP to verified email or mobile number
- OTP is valid for 10 minutes
- User has maximum 3 attempts to enter correct OTP
- After 3 failed attempts, user must request new OTP
- User can resend OTP after 60 seconds
- New password must meet strength requirements
- New password must be different from current password
- After successful password reset, user session is cleared and redirected to login page
- Password reset works for Buyer, Seller, and Admin roles

### 4.13 Buyer Home Page Rules
- Section Display Order: Sticky Search Bar → Stores List → Store-wise Product Listing → Most People Bought → Recently Bought by You
- Sticky Search Bar Rules: Search bar remains fixed at top of page on scroll, search input debounced, smart auto-suggestions appear while typing, voice search icon opens voice input interface, filter chips row displays below search bar, recent searches and trending searches displayed when search bar focused
- Stores List Section Rules: Horizontal scrollable list of store cards, each store card displays store logo/banner, store name (uses fallback if store_name null), Pay Later availability badge/icon inline on card, Request Pay Later button (or status badge), View Store button
- Store-wise Product Listing Sections Rules: Each store rendered as separate vertically stacked section, store banner/logo displayed at top, section title is store name (uses fallback if store_name null), Pay Later indicator, View All button, inline pagination with infinite scroll, horizontal product carousel with Amazon-style ProductCard components
- Most People Bought Section Rules: Products sorted by global purchase count, horizontal scrollable carousel, Quick Add to Cart button on each product card
- Recently Bought by You Section Rules: Visible only for logged-in users, products from user purchase history, Reorder button on each product card, Quick Add to Cart button, last purchased date displayed, fallback behavior if user has no purchase history
- Amazon-Style ProductCard Component Rules: Card width ~180-200px, product image lazy loaded, product name clickable, star rating display, price section, delivery info, stock info, Quick Add to Cart button, Store/Seller Name and Brand Name displayed on top of product image
- UI/UX Features: White/light background, minimal shadows, section titles bold and left-aligned, smooth horizontal scrolling, arrow navigation, skeleton loading per section, minimal clean UI, mobile-first responsive design, sticky search bar fixed on scroll
- Performance Optimizations: Lazy loading for product images, progressive section loading, inline pagination for store sections, debounce search input, cache recent searches and trending searches
- Cart Badge Update: Cart badge updates in real-time when Add to Cart or Quick Add to Cart clicked, cart badge displays total product count across all stores, visual feedback on cart icon
- Navigation Rules: View All button navigates to store-specific Product Listing Page, ProductCard click navigates to Product Details Page, Add to Cart button adds product to cart without navigation, Cart icon click navigates to Cart Page, Search suggestion click navigates to product details, store listing, or category listing, Filter chip click applies filter and navigates to Search Results Page

### 4.14 Buyer Search Functionality Rules
- Search Query Processing: Minimum 2 characters required to trigger auto-suggestions, search input debounced with 300ms delay, search queries match against product_name, store_name (with fallback), category_name, brand_name, tags, search is case-insensitive, partial matches supported
- Auto-Suggestions Display: Maximum 10 suggestions displayed, suggestions grouped into Products, Stores, Categories, click suggestion navigates to corresponding page
- Voice Search: Voice search icon opens voice input interface, system converts speech to text, converted text populates search input field, search executed automatically after speech conversion
- Filter Chips: Filter chips toggleable, multiple chips can be active simultaneously, click filter chip applies filter and navigates to Search Results Page
- Recent Searches: System stores last 5 search queries per user, recent searches displayed when search bar focused with no input, Clear All button removes all recent searches
- Trending Searches: System tracks globally trending searches (top 5), trending searches displayed when search bar focused with no input
- Search Results Page: Displays grouped results (Products, Stores, Categories), products section supports sorting and pagination, stores section displays store cards with inline Pay Later badge/icon and Request Pay Later button, active filters displayed with remove option

### 4.15 Cart Icon and Product Count Rules
- Cart Icon Display: Cart icon visible in header on all buyer pages, cart icon displays product count badge
- Real-Time Cart Count Update: Cart count updates instantly when Add to Cart, Quick Add to Cart, or Reorder button clicked, visual feedback on cart icon
- Cart Count Calculation: Cart count = Sum of quantities of all products across all stores, if cart count exceeds 99, display \"99+\"
- Cart Count Persistence: Cart count persists across page navigation, cart count synced with backend on page load

### 4.16 Seller Dashboard Search Functionality Rules
- Search Bar Display: Search bar sticky at top of Seller Dashboard, fixed on scroll, fully visible and responsive
- Search Query Processing: Instant search results displayed while typing, search queries match against product_name, product_code, SKU, barcode, category, brand_name, search is case-insensitive, partial matches supported
- Search Results Display: Instant search results dropdown appears below search bar, each result shows product name, product code, SKU, category, stock status, click result navigates to product edit page
- Barcode Scan Search: Barcode scan icon opens camera interface, system scans barcode using device camera, barcode value extracted and used for search, search executed automatically after barcode scan
- Filter Chips: Filter chips (Low Stock, Out of Stock, Recently Added, Best Selling) toggleable, click filter chip filters product list in dashboard
- Inventory Alerts: Inventory alerts section displayed when search bar focused, low stock warnings and out of stock alerts, click alert navigates to product edit page

### 4.17 Seller Product Card Action Buttons Rules
- Action Buttons Display: Each product card in Seller Dashboard displays action buttons row (Edit, Update Stock, Change Price, Delete, View Orders)
- Edit Button: Click Edit button navigates to product edit form
- Update Stock Button: Click Update Stock button opens quantity input modal
- Change Price Button: Click Change Price button opens price input modal
- Delete Button: Click Delete button opens confirmation dialog
- View Orders Button: Click View Orders button navigates to Order Management section filtered by product

### 4.18 Seller Verification Workflow
- Mandatory Verification: All sellers must complete verification before accessing core platform features
- Verification States: Pending, Approved, Rejected, Suspended
- Application Requirements: Business Name, Business Type, Business Address, Contact Number, Aadhaar Number or Company ID, Document upload (Aadhaar Card or Company ID/Other Document ID)
- Admin Review Process: Admin reviews submitted documents and information, admin can approve, reject, or request more information
- Access Control Based on Status: Pending/Rejected sellers have restricted access, Approved sellers can access all platform features, Suspended sellers cannot perform any transactions
- Resubmission Rules: Rejected applications can be resubmitted unlimited times
- State Transition Logging: Every state change recorded with timestamp

### 4.19 Seller Payment Plan Configuration
- Availability: Payment plan selection available only after seller verification approval
- Plan Options: Weekly Settlement Plan, Monthly Settlement Plan
- Plan Selection Rules: Seller must select one plan to activate full account, plan selection is mandatory before listing products
- Billing Cycle Management: Billing cycle starts from plan selection date, weekly plan resets every 7 days, monthly plan resets every 30 days
- Plan Change Restrictions: Sellers cannot change plan mid-cycle
- Settlement Calculation: Total sales in cycle calculated, platform fees deducted, net settlement amount calculated
- Settlement Process: Automatic settlement summary generation at cycle end

### 4.20 Advanced Billing Module Rules
- Access Control: Only Approved sellers can access billing module
- Invoice Types: Online Order Invoice, Direct Store Sale Invoice
- Invoice Number Generation: Auto-generated unique invoice number for each invoice
- Online Order Invoice Rules: Auto-populated from order data
- Direct Store Sale Invoice Rules: Manual entry for walk-in or offline sales
- Invoice Content Requirements: Store name (uses fallback if store_name null) and address, store contact number, invoice number, invoice date, customer details, itemized product list, subtotal, tax, grand total, payment type, payment status
- Invoice Generation Process: Seller selects invoice type, system validates all required fields, invoice preview displayed before final generation
- Invoice History Management: All invoices stored in chronological order, filter by date range, invoice type, payment status, search by invoice number
- PDF Generation: Professional invoice template, printable format, downloadable for customer records
- Financial Integration: All invoices linked to store-level financial records
- Audit Trail: Invoice creation logged with timestamp and seller ID

### 4.21 Store-Level Financial Isolation
- Independent Financial Units: Each store operates as completely independent financial entity
- Isolated Data Per Store: Revenue, orders, transactions, pending dues, Pay Later balances, invoices, settlement summary tracked separately per store
- No Cross-Store Data Leakage: Buyer cart items isolated per store, buyer order history separated by store, buyer pending payments tracked per store
- Store-Specific Reporting: Sales reports generated per store, financial reports show store-level breakdown
- Store-Level Analytics: Daily/Weekly/Monthly sales per store, revenue trends per store
- Data Integrity: Database schema enforces store-level isolation

### 4.22 Pay Later Account System (Credit Model)
- Eligibility Requirements: Buyer must apply for Pay Later account, must upload Aadhaar Card or Company ID/Other Document ID, admin approval required, credit limit assigned by admin
- Application Process: Buyer submits application with account holder name, account type, Aadhaar Number or Company ID, document upload, requested credit limit, terms and conditions acceptance
- Credit Limit Management: Admin assigns initial credit limit, credit limit is total available credit across all stores, used credit tracked in real-time, available credit = Total credit limit - Used credit
- Credit Usage Rules: Buyer can use Pay Later only if account approved, buyer can use Pay Later only on stores with Pay Later enabled, each purchase reduces available credit, purchase blocked if available credit insufficient
- Credit Allocation Per Store: Total credit limit shared across all buyer stores, each store tracks its own credit usage
- Payment and Credit Restoration: Buyer makes payment for Pay Later purchases, payment restores available credit
- Due Date Management: Pay Later purchases have due dates, due date displayed at checkout and in dashboard
- Credit Blocking Rules: If available credit = 0, Pay Later option disabled at checkout, if payment overdue beyond grace period, account temporarily blocked
- Transaction Tracking: All Pay Later transactions logged with transaction ID, store ID, order ID, amount, transaction date, due date, payment status
- Audit and Compliance: All Pay Later applications logged, credit limit changes logged with admin ID, all transactions logged for financial audit

### 4.23 Store-Level Pay Later Eligibility
- Seller Control: Only verified and approved sellers can enable Pay Later for their stores
- Store-Level Toggle: Each store has independent Pay Later enabled/disabled setting
- Eligibility Criteria for Enabling Pay Later: Seller must be in Approved verification status, store must meet minimum operational criteria
- Visual Indicator (Crown Icon): Stores with Pay Later enabled display crown icon on Buyer Home Page, Store Selection Page, Product Listing Page, Product Details Page, Cart Page, Checkout Page
- Inline Pay Later Display on Store Cards: Every store card with pay_later_enabled = true must display Pay Later availability directly on card with crown icon and \"Pay Later Available\" label, per-store Request Pay Later button displayed on card
- Separate Pay Later Filter: Existing \"Pay Later Only\" filter toggle in StoresListing page must remain functional
- Checkout Behavior: Pay Later payment option visible only if current store has Pay Later enabled, buyer has approved Pay Later account, buyer has sufficient available credit
- Buyer Experience: Buyers can easily identify Pay Later-enabled stores via inline badge/icon on store cards, buyers can filter or prioritize stores with Pay Later using separate filter toggle
- Seller Dashboard Display: Pay Later enabled status shown in Store Information section, crown icon displayed next to store name if enabled, toggle switch to enable/disable Pay Later
- Financial Implications: Pay Later transactions tracked separately per store, store-level Pay Later balances maintained

### 4.24 UPI Payment Integration (Real-Time)
- Payment Flow: Buyer selects UPI payment option at checkout, system generates payment intent, system redirects buyer to UPI portal/app, buyer completes payment in UPI app, UPI portal sends callback to platform
- Callback Handling: System receives callback with transaction status (Success / Failed / Pending), system updates order payment status based on callback, system logs transaction details
- Transaction Logging: All UPI transactions logged with transaction ID, order ID, store ID, buyer ID, amount, transaction timestamp, status, UPI reference number, payment gateway response
- Payment Status Updates: Success sets order payment status to Paid, Failed keeps order payment status as Pending with retry option, Pending sets order payment status to Pending and system polls for final status
- Reconciliation: Daily reconciliation of UPI transactions, match platform records with UPI gateway settlement reports
- Error Handling: Network errors with retry mechanism, timeout errors mark transaction as Pending, gateway errors display error message with retry option, duplicate transaction prevention
- Security: Secure API communication with UPI gateway, transaction data encrypted in transit, sensitive payment details not stored on platform
- Store-Level Integration: UPI transactions linked to specific store, store financial records updated in real-time
- Buyer Experience: Seamless redirect to UPI app, real-time payment confirmation, clear error messages on failure, easy retry option
- Seller Visibility: Sellers see UPI payment status in order management, UPI transaction details in financial records

### 4.25 Audit Logging and Compliance
- Audit Log Scope: All critical actions logged for compliance and traceability
- Logged Actions: Seller Verification, Billing Actions, Payment Transactions, Pay Later Account, Account Management, Store Management
- Log Entry Structure: Timestamp, user ID, user role, action type, entity ID, entity type, action status, IP address, before state, after state, additional details
- Log Storage: Logs stored in secure, append-only database, logs retained for minimum 7 years, logs backed up regularly, logs encrypted at rest
- Log Access: Admin can view audit logs via Audit Log Viewer Page, logs filterable by date range, action type, user role, logs searchable by user ID or entity ID, logs exportable to CSV
- Data Traceability: Every financial transaction traceable to source, every state change traceable to admin action
- Security and Privacy: Sensitive data stored securely, document uploads encrypted, access to sensitive data restricted by role
- Compliance Standards: Logs meet financial audit requirements, logs support regulatory reporting

### 4.26 Buyer Multi-Store Management Rules
- Each buyer can create and manage multiple stores/accounts under one login
- Each store must have unique store name or identifier, separate delivery address, separate cart, separate order history, separate payment tracking, separate pending payments, separate Pay Later credit usage tracking
- Store switching: Buyer can switch between stores via Store Selection Page or dashboard, active store is clearly indicated throughout the application with Pay Later indicator
- Data isolation: Cart items belong to specific store only, orders are tracked per store, payments are managed per store, Pay Later credit usage allocated per store
- Store creation: Buyer can add new store anytime from dashboard, store name and delivery address are mandatory
- Store deletion: Buyer can delete store only if no pending payments for that store, deletion requires confirmation

### 4.27 Currency Detection and Conversion Rules
- Default currency: INR
- System detects user currency based on priority: User profile country, device locale, IP-based location
- Country to currency mapping: India → INR, USA → USD, UK → GBP, EU countries → EUR, other countries mapped to appropriate currency
- All product prices stored as structured data: price_value, unit, base_currency
- Prices converted dynamically using exchange rates
- Exchange rates updated regularly via reliable API
- Price display format based on region
- Display format: currency_symbol + converted_price + / + unit
- Users can manually change currency preference from Profile Management Page
- Currency change applies to all price displays across application
- All calculations use converted prices
- Invoices generated in user selected currency
- Currency preference automatically updated when user changes country in profile

### 4.28 Product Management Rules
- Only verified and Approved Sellers can add, edit, or delete products
- Category field is mandatory for all products
- Category must be selected from dynamic category list
- Brand name field is optional
- Product image handling: If seller uploads image, use uploaded image; if no image uploaded, system auto-fetches image from internet based on product name; if auto-fetch fails, assign default placeholder image
- Available quantity must be greater than 0 for product to be purchasable
- Price value must be a positive number in INR
- Unit must be selected from predefined list
- Product Code and Barcode must be unique across all products
- Products automatically organized by category in seller dashboard
- Stock status automatically calculated: In Stock (quantity > 10), Low Stock (quantity between 1 and 10), Out of Stock (quantity = 0)
- Sellers can view stock list with category-wise organization

### 4.29 Category Management Rules
- Dynamic categories: Platform supports all major product categories with subcategories
- Admin can add new categories and subcategories via Category Management Page
- Every product must have valid category
- Category field cannot be null or undefined
- Products grouped by category in seller dashboard
- Category filter available on product listing and seller dashboard
- Search functionality works within selected category
- Category tabs allow expand/collapse for better organization
- Category hierarchy organized in tree structure with parent-child relationships

### 4.30 Bulk Upload Rules
- Only verified and Approved Sellers can access bulk upload functionality
- Accepted file formats: .xlsx and .csv
- Maximum file size: 5MB
- Required fields in Excel: Product Name, Price Value, Unit, Quantity, Product Code, Category
- Optional fields: Description, Barcode, Brand Name
- System validates each row before processing
- Duplicate Product Code or Barcode prevents product addition
- Products are automatically categorized based on Category field
- Category in Excel must match dynamic categories
- System provides downloadable Excel template with correct column headers including Category and Brand Name
- After upload, system displays preview of data before final submission
- Processing summary shows total records, successful additions, and failed records with specific error messages
- Price stored as structured data (price_value + unit) not as text
- Price value must be numeric in INR

### 4.31 Cart and Pricing Rules
- Cart is store-specific for buyers
- Cart icon displays Pay Later indicator if store has Pay Later enabled
- Cart item count displayed on cart icon (total items across all stores)
- Item Total = Quantity × Price per unit (in user currency)
- Subtotal = Sum of all Item Totals in cart (in user currency)
- Tax is configurable (admin setting)
- Grand Total = Subtotal + Tax (in user currency)
- Cart items can be updated or removed before checkout
- Quantity cannot exceed available stock
- All cart calculations use real-time converted prices
- Switching stores shows different cart contents
- Cart quantity editable with +/- buttons

### 4.32 Order Processing Rules
- Generate unique Order ID upon order placement
- Orders are store-specific for buyers
- Order initial status is Placed
- Order status progression: Placed → Confirmed → Packed → Delivered
- Only Seller can update order status
- Buyer can view seller contact number only after order is placed (if seller allows buyer contact access)
- Order includes: Buyer details, Seller details, Delivery address, Payment type, Order total in user currency
- Order amounts stored in user selected currency at time of order
- Order history and tracking are store-specific in buyer dashboard
- Delivery address selected from buyer saved addresses during checkout
- Invoice automatically generated for each order

### 4.33 Payment Rules
- Cash on Delivery: Payment status is Pending until marked Completed by seller
- UPI Payment: Real-time payment processing with callbacks and transaction logs
- Weekly Payment Plan: Due date is 7 days from order date, payment status is Pending
- Monthly Payment Plan: Due date is 30 days from order date, payment status is Pending
- Pay Later Account: Available only if buyer has approved Pay Later account, current store has Pay Later enabled, buyer has sufficient available credit
- System displays payment reminders in dashboard for pending payments approaching due date
- All payment amounts displayed in INR by default (or user selected currency)
- Payment processing uses converted amounts
- Pending payments are store-specific for buyers
- Sellers track payments at store level in Financial Records section
- All payment transactions logged for audit

### 4.34 Contact Visibility Rules
- Buyer can view seller contact number only after placing an order (if seller allows buyer contact access)
- Seller can view buyer contact details for all orders
- Contact information displayed in order tracking and order management sections
- Store contact details displayed on Product Details Page and Store Listing Page if seller allows buyer contact access

### 4.35 Review and Rating Rules
- Only buyers can submit reviews for products they have purchased
- Reviews can only be submitted after order status is Delivered
- Each buyer can submit one review per product per order
- Rating must be between 1 and 5 stars
- Review text is optional but rating is mandatory
- Buyers can edit or delete their own reviews
- Average rating calculation: Sum of all ratings / Total number of reviews
- Average rating is displayed with one decimal place
- Only sellers can respond to reviews for their own products
- Each review can have only one seller response
- Seller responses can be edited but not deleted
- Reviews are displayed in chronological order by default
- Reviews are visible across all buyer stores (not store-specific)

### 4.36 Help Center and Support Rules
- Help Center accessible to all users (Buyers, Sellers, Admin)
- FAQ section provides answers to common questions
- Users can raise support tickets for: Account issues, Payment issues, Order issues, Product issues, Other issues
- Ticket submission requires: Issue type selection, Store selection (if applicable), Subject, Description
- Ticket tracking system shows: Ticket ID, Issue type, Status, Submission date
- Users can view ticket details and track resolution progress
- Support tickets are store-specific for buyers and sellers

### 4.37 Profile Management Rules
- Profile Viewing: Users can view all profile information including Full Name, Email, Mobile Number, Profile Photo, Country, and Delivery Addresses
- Profile Editing: Users can update Full Name, Mobile Number, Country; Email is non-editable
- Profile Photo Management: Users can upload, replace, or remove profile photo; supported formats JPG, PNG; maximum file size 2MB
- Delivery Address Management: Users can add multiple delivery addresses, edit existing addresses, delete addresses; at least one address required for buyers
- Validation and Error Handling: All required fields validated before save, success message displayed after successful update, error messages displayed for validation failures
- Security: Only authenticated users can access and update their profile
- Backend Changes: User schema includes profile_image_url, country, delivery_addresses
- UI/UX: Edit Mode toggle button, Save and Cancel buttons, profile photo preview, loading indicators, clear success and error messages, responsive design

### 4.38 Account Deletion Rules
- Users can request account deletion from dashboard
- Account deletion requires admin approval
- Account can be deleted only if: No pending payments across all stores, all dues are cleared, no active Pay Later balances
- Admin reviews deletion request and checks for pending payments
- Admin approves or rejects deletion request
- After deletion approval: User account is permanently deleted, user data is removed from system, user can re-register using same email or mobile number
- Deletion request can be rejected if pending payments exist
- All deletion actions logged in audit trail

### 4.39 Admin Approval Rules
- Admin approves seller verification applications with state management
- Admin can approve, reject, or suspend seller accounts
- Admin approves Pay Later account applications and assigns credit limits
- Admin approves account deletion requests after financial clearance check
- Admin checks for pending payments before approving deletion
- Admin manages platform operations and user access
- Admin manages dynamic category system by adding new categories and subcategories
- All admin actions logged in audit trail

### 4.40 Error Handling and Validation Rules
- Store Name Fallback: Prevent \"Store not found\" errors by implementing automatic fallback to seller full_name or business_name when store_name is null
- Pay Later Display: Ensure inline Pay Later badge/icon displays correctly on all store cards with pay_later_enabled = true
- Seller Verification: Prevent unverified sellers from accessing restricted features, display clear error messages for missing documents, validate document formats and sizes
- Billing: Prevent invalid invoice entries, validate invoice amounts and calculations, prevent duplicate invoice numbers
- Payment Transactions: Handle UPI payment failures gracefully with retry option, prevent duplicate transactions, validate payment amounts before processing
- Pay Later: Prevent Pay Later usage if account not approved, prevent Pay Later usage if store not enabled, prevent purchases exceeding available credit, display clear error messages for credit limit exceeded
- Transaction Rollback: Rollback order creation if payment fails, rollback credit usage if order placement fails, ensure data consistency across all operations
- Clear Error Messages: User-friendly error messages for all validation failures, technical error details logged for debugging, actionable guidance provided in error messages
- Search Functionality: Handle empty search results gracefully, display \"No results found\" message, provide suggestions or alternative searches, handle voice search errors, handle barcode scan errors
- Cart Operations: Validate quantity before adding to cart, display error if quantity exceeds available stock, handle cart count update failures with retry
- Seller Dashboard Search: Handle empty search results, display \"No products found\" message, handle barcode scan failures with error message and retry option
- Store Contact Details: Display contact details only if seller allows buyer contact access, hide contact details if seller disables buyer contact access
- Brand Name: Brand name is optional field, display brand name only if available
- Bookmark/Favourite: Handle bookmark action failures with error message and retry, display empty state message if no favourite products
- Category Management: Validate category selection during product creation and bulk upload, prevent invalid category values, display error for missing category
- Verification Document Upload: Validate file format (PDF, JPG, PNG), validate file size (maximum 5MB), display clear error messages for invalid file format or file size exceeded, display success message and document preview after successful upload

## 5. Exception and Boundary Conditions

| Scenario | Handling |
|----------|----------|
| Store name is null or missing in database | Automatically use seller full_name or business_name as fallback, no \"Store not found\" error displayed |
| Both store_name and business_name are null | Use seller full_name as final fallback |
| All store name fields are null | Display \"Store\" as generic placeholder, log error for admin review |
| Pay Later badge/icon fails to display on store card | Verify pay_later_enabled flag in database, refresh component, log error if persists |
| Request Pay Later button not visible on Pay Later-enabled store card | Verify pay_later_enabled = true and buyer has not already requested, refresh component |
| Pay Later filter toggle fails to filter stores | Verify filter state, re-query database with pay_later_enabled = true filter, display error if query fails |
| Buyer clicks Request Pay Later button | Open Pay Later application form pre-filled with store information; if store name unavailable, automatically use seller name instead; display credit limit field in request form |
| Buyer has already requested Pay Later for store | Display status badge (Pending / Approved / Rejected) instead of Request button |
| Store card displays incorrect Pay Later status | Refresh store data from database, verify pay_later_enabled flag, update UI |
| Seller disables buyer contact access | Hide store contact details on Product Details Page and Store Listing Page |
| Seller enables buyer contact access | Display store contact details on Product Details Page and Store Listing Page |
| Buyer views product details before placing order | Hide seller contact details if seller disables buyer contact access |
| Buyer views product details after placing order | Display seller contact details if seller allows buyer contact access |
| Brand name is missing for product | Display product card and details without brand name, no error displayed |
| Seller enters brand name during product creation | Display brand name on product card and details page |
| Seller uploads product without brand name in bulk upload | Product created without brand name, no error displayed |
| Seller dashboard search bar not visible | Fix search bar UI, ensure search bar is sticky at top, fully visible, and responsive |
| Seller dashboard search bar misaligned | Fix search bar alignment, ensure horizontal centering with proper padding and margins |
| Seller dashboard search bar not responsive | Fix search bar responsiveness, ensure search bar adapts to different screen sizes |
| Buyer clicks bookmark button on product card | Add product to favourites list, change bookmark icon to filled state |
| Buyer clicks bookmark button again | Remove product from favourites list, change bookmark icon to outline state |
| Buyer navigates to Favourite Products Page with no bookmarked products | Display empty state message: \"No favourite products yet\" |
| Buyer removes product from favourites | Product removed from favourites list, bookmark icon changes to outline state |
| Admin adds new category | New category available for product creation and filtering |
| Admin adds new subcategory | New subcategory available under parent category |
| Seller selects invalid category during product creation | Display error: \"Invalid category, please select from available categories\" |
| Seller uploads bulk file with invalid category | Mark row as failed, display error: \"Invalid category, must match available categories\" |
| Admin deletes category with existing products | Display warning: \"Category has existing products, cannot be deleted\" or reassign products to default category |
| Verification document upload fails | Display error message, allow retry, do not submit application |
| Seller uploads document with invalid format | Display error: \"Invalid file format, please upload PDF, JPG, or PNG\" |
| Seller uploads document exceeding size limit | Display error: \"File size exceeds 5MB limit, please upload smaller file\" |
| Seller uploads Aadhaar Card document | Document uploaded successfully, display preview |
| Seller uploads Company ID/Other Document ID | Document uploaded successfully, display preview |
| Product card displays store/seller name on top of image | Store/seller name clearly visible with contrasting background or overlay |
| Product card displays brand name on top of image | Brand name clearly visible below store/seller name |
| Store/seller name or brand name not readable on product image | Ensure text has semi-transparent background or contrasting color for readability |
| Buyer Home Page sticky search bar fails to load | Display error message, provide retry button, search bar remains visible but disabled |
| Search input debounce fails | Fall back to immediate search execution, log error |
| Auto-suggestions API call fails | Display cached suggestions if available, otherwise show \"Suggestions unavailable\" message |
| Auto-suggestions return empty results | Display \"No suggestions found\" message |
| Voice search microphone access denied | Display error: \"Microphone access required for voice search\", provide manual search option |
| Voice search speech recognition fails | Display error: \"Could not recognize speech, please try again\", allow retry |
| Filter chip click fails to apply filter | Display error message, allow retry, log error |
| Recent searches cache fails to load | Hide recent searches section, log error |
| Trending searches API call fails | Hide trending searches section, log error |
| Search Results Page fails to load | Display error message, provide Back to Home button |
| Search Results Page returns no results | Display \"No results found for [query]\" message, suggest alternative searches |
| Stores List section fails to load | Display error message, provide retry button |
| Store-wise Product Listing section fails to load | Display error message for specific store, other stores remain visible |
| Most People Bought section has no data | Hide section or display message: \"No products available\" |
| Recently Bought by You section empty for logged-in user | Hide section entirely |
| Cart icon badge fails to update | Retry badge update, display temporary success message, log error |
| Cart count calculation error | Recalculate cart count from backend, display correct count |
| Cart count exceeds 99 | Display \"99+\" in badge |
| Add to Cart button clicked multiple times rapidly | Debounce button clicks, prevent duplicate cart additions |
| Quick Add to Cart button fails | Display error message, allow retry, log error |
| Reorder button clicked for out-of-stock product | Display error: \"Product currently out of stock\", disable Reorder button |
| Last purchased date missing for product | Hide last purchased date display |
| Seller Dashboard search bar fails to load | Display error message, search bar remains visible but disabled |
| Seller Dashboard search input fails | Display error message, allow retry, log error |
| Barcode scan icon clicked but camera access denied | Display error: \"Camera access required for barcode scanning\", provide manual search option |
| Barcode scan fails to recognize barcode | Display error: \"Barcode not recognized, please try again\", allow retry or manual search |
| Barcode scan returns no matching product | Display error: \"No product found with this barcode\" |
| Inventory alerts fail to load | Hide inventory alerts section, log error |
| Low stock threshold not configured | Use default threshold (10 units) |
| Filter chips fail to apply filter | Display error message, allow retry, log error |
| Product card action buttons fail to load | Display error message, disable action buttons |
| Edit button click fails to navigate | Display error message, allow retry |
| Update Stock modal fails to open | Display error message, allow retry |
| Update Stock save fails | Display error message, allow retry, do not update quantity |
| Change Price modal fails to open | Display error message, allow retry |
| Change Price save fails | Display error message, allow retry, do not update price |
| Delete button confirmation dialog fails to open | Display error message, allow retry |
| Delete action fails | Display error message, allow retry, do not delete product |
| View Orders button fails to navigate | Display error message, allow retry |
| Product is part of active orders and seller attempts to delete | Display error: \"Product is part of active orders, cannot be deleted\" |
| Unverified seller attempts to add products | Redirect to Verification Application Page with message: \"Please complete verification first\" |
| Unverified seller attempts to access billing module | Display error: \"Billing module available only for verified sellers\" |
| Unverified seller attempts to enable Pay Later for store | Display error: \"Pay Later setup requires seller verification approval\" |
| Seller attempts to change payment plan mid-cycle | Display error: \"Payment plan can only be changed at end of billing cycle\" |
| Seller attempts to generate invoice without required fields | Display error: \"All required fields must be filled\" |
| Seller attempts to create duplicate invoice number | System auto-generates unique invoice number, no duplicates possible |
| Buyer attempts to use Pay Later on store without Pay Later enabled | Pay Later option hidden at checkout, display message: \"Pay Later not available for this store\" |
| Buyer attempts to use Pay Later without approved account | Display error: \"Pay Later account not approved, apply from dashboard\" |
| Buyer attempts to purchase exceeding available Pay Later credit | Display error: \"Insufficient credit, available credit: X INR\" |
| Buyer Pay Later account application rejected | Display rejection reason, allow resubmission |
| Admin attempts to approve account deletion with pending payments | Display error: \"Cannot approve deletion, user has pending payments totaling X INR\" |
| Admin attempts to approve Pay Later without assigning credit limit | Display error: \"Credit limit must be assigned before approval\" |
| UPI payment callback not received | System polls UPI gateway for transaction status, mark as Pending if no response |
| UPI payment fails during transaction | Display error message, order payment status remains Pending, allow retry |
| UPI payment gateway timeout | Display error: \"Payment gateway timeout, please retry\" |
| Duplicate UPI transaction attempt | System checks order ID, prevents duplicate payment initiation |
| Network error during invoice generation | Display error message, allow retry, do not create partial invoice |
| Invoice PDF generation fails | Display error: \"PDF generation failed, please try again\" |
| Seller attempts to delete product in active orders | Display warning: \"Product is part of active orders, cannot be deleted\" |
| Buyer attempts to add quantity exceeding available stock | Display error message: \"Requested quantity exceeds available stock\" |
| Buyer attempts to checkout with empty cart | Disable checkout button, display message: \"Cart is empty\" |
| User enters invalid email format during signup | Display error: \"Invalid email format\" |
| User enters duplicate email during signup | Display error: \"Email already registered\" |
| User does not select country during signup | Display error: \"Country selection is required\" |
| User does not select role during signup | Display error: \"Role selection is required\" |
| Password does not meet strength requirements | Display error: \"Password must be at least 8 characters with uppercase, lowercase, number, and special character\" |
| Confirm password does not match new password | Display error: \"Passwords do not match\" |
| User attempts to access pages without login | Redirect to login page |
| Buyer attempts to access seller features | Display error: \"Access denied\" |
| Seller attempts to access buyer features | Display error: \"Access denied\" |
| Product image auto-fetch fails | Display default placeholder image |
| Network error during order placement | Display error message, allow retry, do not create duplicate orders |
| Buyer attempts to review product before delivery | Display message: \"Reviews can only be submitted after delivery\" |
| Buyer attempts to submit duplicate review for same product in same order | Display error: \"You have already reviewed this product\" |
| Buyer submits review without rating | Display error: \"Rating is required\" |
| Seller attempts to respond to review for product not owned by them | Display error: \"Access denied\" |
| Buyer attempts to edit review after seller has responded | Allow edit, seller response remains unchanged |
| Product has no reviews | Display message: \"No reviews yet, be the first to review\" |
| User enters unregistered email or mobile number for password reset | Display error: \"Email or mobile number not found\" |
| User enters incorrect OTP | Display error: \"Invalid OTP, X attempts remaining\" |
| User exceeds maximum OTP attempts | Display error: \"Maximum attempts exceeded, please request new OTP\" |
| OTP expires before user enters it | Display error: \"OTP has expired, please request new OTP\" |
| User enters weak password during reset | Display error: \"Password does not meet strength requirements\" |
| New password matches current password | Display error: \"New password must be different from current password\" |
| Seller uploads file with incorrect format | Display error: \"Invalid file format, please upload .xlsx or .csv file\" |
| Seller uploads file exceeding size limit | Display error: \"File size exceeds 5MB limit\" |
| Excel file missing required columns | Display error: \"Missing required columns, please use provided template\" |
| Excel row missing required fields | Mark row as failed, display error: \"Missing required field\" |
| Excel row missing Category field | Mark row as failed, display error: \"Category is required\" |
| Excel contains invalid Category value | Mark row as failed, display error: \"Invalid category, must match available categories\" |
| Excel contains duplicate Product Code or Barcode | Mark row as failed, display error: \"Duplicate Product Code or Barcode\" |
| Excel contains invalid data format | Mark row as failed, display error: \"Invalid data format for specific field\" |
| Excel price stored as text instead of numeric | Mark row as failed, display error: \"Price must be numeric value in INR\" |
| All rows in Excel fail validation | Display error: \"No valid records found, please check file and retry\" |
| Network error during bulk upload | Display error message, allow retry, do not create duplicate products |
| Currency conversion API fails | Use cached exchange rates, display warning: \"Using cached rates\" |
| User country not mapped to currency | Default to INR, allow manual currency selection |
| Exchange rate not available for selected currency | Display error: \"Currency not supported, please select different currency\" |
| Seller adds product without selecting category | Display error: \"Category is required\" |
| User changes currency after adding items to cart | Recalculate all cart amounts with new currency, display notification |
| Order placed with one currency, user views with different currency | Display order in original currency at time of order |
| Buyer attempts to switch store during checkout | Display warning: \"Switching store will clear current cart, confirm action\" |
| Buyer attempts to delete store with pending payments | Display error: \"Cannot delete store with pending payments\" |
| Buyer attempts to delete store with active orders | Display warning: \"Store has active orders, confirm deletion\" |
| Buyer creates store without delivery address | Display error: \"Delivery address is required\" |
| Cart item count not displaying | Ensure cart icon badge shows total items across all stores, refresh on add/remove |
| User uploads profile photo exceeding size limit | Display error: \"Photo size exceeds 2MB limit, please upload smaller file\" |
| User uploads profile photo with invalid format | Display error: \"Invalid photo format, please upload JPG or PNG\" |
| User attempts to save profile without Full Name | Display error: \"Full Name is required\" |
| User attempts to save profile with invalid Mobile Number format | Display error: \"Invalid mobile number format\" |
| User attempts to add delivery address without address text | Display error: \"Delivery address is required\" |
| User attempts to delete last remaining delivery address | Display error: \"At least one delivery address is required\" |
| Profile photo upload fails due to network error | Display error: \"Upload failed, please try again\" |
| User attempts to save profile changes without making any changes | Display message: \"No changes to save\" |
| User cancels profile edit with unsaved changes | Discard changes and revert to original values |
| Country change triggers currency update | Automatically update currency preference and display notification |
| User selects delivery address during checkout that was deleted | Display error: \"Selected address no longer available, please choose another\" |
| Seller applies for verification without uploading documents | Display error: \"Document upload is required\" |
| User requests account deletion with pending payments | Display error: \"Cannot delete account with pending payments, clear all dues first\" |
| User raises support ticket without selecting issue type | Display error: \"Issue type is required\" |
| User raises support ticket without description | Display error: \"Description is required\" |
| Seller attempts to access Payment Plan Selection before verification | Redirect to Verification Application Page |
| Seller verification suspended by admin | Display suspension reason, restrict all seller operations, allow support contact |
| Audit log export fails | Display error: \"Export failed, please try again\" |
| Audit log viewer page load timeout | Display error: \"Loading timeout, please refresh\" |
| Admin assigns negative credit limit | Display error: \"Credit limit must be positive value\" |
| Admin assigns credit limit exceeding system maximum | Display error: \"Credit limit exceeds maximum allowed value\" |
| Pay Later credit usage calculation error | Rollback transaction, display error: \"Credit calculation error, please retry\" |
| Store Pay Later toggle fails to save | Display error: \"Failed to update Pay Later setting, please try again\" |
| Crown icon not displaying for Pay Later-enabled store | Refresh page, verify store Pay Later status in database |
| Invoice history filter returns no results | Display message: \"No invoices found for selected filters\" |
| Invoice PDF download fails | Display error: \"Download failed, please try again\" |
| Direct sales invoice missing customer details | Allow invoice generation with optional customer details |
| Settlement summary calculation error | Display error: \"Calculation error, contact support\" |
| Billing cycle end date calculation error | Use default cycle length, log error for admin review |
| Multiple stores with same delivery address | Allow, no restriction on duplicate addresses |
| Buyer switches store while viewing product details | Maintain product view, update active store indicator, cart operations apply to new active store |
| Stock status not updating after quantity change | Recalculate stock status automatically: In Stock (>10), Low Stock (1-10), Out of Stock (0) |

## 6. Acceptance Criteria

1. Store name fallback implemented: When store_name is null or missing, system automatically uses seller full_name or business_name as store name across all pages
2. No \"Store not found\" errors: With fallback in place, no store displays \"Store not found\" error due to missing store_name
3. Fallback priority correct: If store_name exists, use it; if null, use business_name; if business_name also null, use full_name
4. Database queries include fallback fields: All queries fetching store data include seller full_name and business_name
5. Frontend components implement fallback logic: display_name = store_name || business_name || full_name
6. Inline Pay Later display on store cards: Every store card with pay_later_enabled = true displays Pay Later availability badge/icon directly on card
7. Pay Later badge/icon visible: Crown icon + \"Pay Later Available\" label displayed prominently on store cards
8. Inline display applies to all store card locations: Buyer Home Page Stores List, Buyer Dashboard Shop by Store, Search Results Page Stores section, Store Selection/Switch Page
9. Per-store Request Pay Later button visible: Each store card with pay_later_enabled = true displays Request Pay Later button (if not yet requested) or status badge (if already requested)
10. Request Pay Later button behavior correct: Click opens Pay Later application form pre-filled with store information; if store name unavailable, automatically use seller name instead; display credit limit field in request form
11. Status badge displays correct status: Shows Pending / Approved / Rejected based on buyer request status for this store
12. Separate Pay Later filter toggle remains functional: Existing \"Pay Later Only\" filter in StoresListing page works correctly
13. Filter toggle shows only Pay Later-enabled stores: When active, only stores with pay_later_enabled = true displayed
14. Filter toggle is additional convenience: Filter does not replace inline display, both features coexist
15. When filter inactive, all stores displayed with inline indicators: All stores shown, Pay Later-enabled stores have inline badge/icon
16. Store contact details visibility implemented: Sellers can enable or disable buyer contact access per store via Store Contact Settings Page
17. Buyer Contact Access toggle functional: Enable buyer contact access (buyers can view store contact details), Disable buyer contact access (buyers cannot view store contact details)
18. Contact details display correct: If seller allows buyer contact access, display store contact details (phone number, email) on Product Details Page and Store Listing Page
19. Default setting correct: Buyer contact access disabled by default for new stores
20. Contact details location correct: Display contact details in dedicated section on Product Details Page and Store Listing Page, clearly labeled as \"Store Contact\"
21. Brand name field added to product schema: brand_name field exists in product database
22. Brand name input available: Sellers can enter brand name during product creation or editing
23. Brand name in bulk upload: Bulk Upload Excel template includes Brand Name column
24. Brand name display correct: Display brand name on Product Details Page, Product Cards (on top of product image), and Search Results
25. Brand name search functional: Seller dashboard search bar supports search by brand name
26. Brand name optional: Brand name is optional field, not mandatory
27. Seller dashboard search bar fixed: Search bar fully visible at top of Seller Dashboard, sticky on scroll
28. Search bar UI correct: Search bar styled with clear input field, search icon, barcode scan icon, filter chips row below
29. Search bar alignment correct: Search bar horizontally centered with proper padding and margins
30. Search bar responsiveness correct: Search bar adapts to different screen sizes (mobile, tablet, desktop)
31. Search bar functionality correct: Instant search results displayed while typing, barcode scan opens camera interface, filter chips toggleable
32. Pay Later request with seller name fallback: When creating Pay Later request, if store name is unavailable (null or missing), automatically use seller name (full_name or business_name) instead
33. Credit limit display in request form: Pay Later request form displays credit limit field; buyers can view requested credit limit during application; after approval, buyers can view assigned credit limit
34. Credit limit field location correct: Display credit limit field in Pay Later Account Application Page, clearly labeled as \"Requested Credit Limit\" (during application) or \"Assigned Credit Limit\" (after approval)
35. Verification document upload fixed: Document upload options show exactly two options: Aadhaar Card, Company ID / Other Document ID
36. Document upload UI correct: Display two separate upload areas with clear labels
37. Document upload validation correct: Validate file format (PDF, JPG, PNG), file size (maximum 5MB), and required fields
38. Document upload error handling correct: Display clear error messages for invalid file format, file size exceeded, or upload failure
39. Document upload success correct: Display success message and document preview after successful upload
40. Store/Seller name display on product card: Display store name (uses fallback if store_name null) on top of product image on product cards
41. Brand name display on product card: Display brand name on top of product image on product cards (below store/seller name)
42. UI visibility and readability correct: Ensure store/seller name and brand name are clearly visible with contrasting background or overlay
43. Text positioning correct: Position store/seller name and brand name at top-left or top-center of product image
44. Text styling correct: Use bold font, white or dark text color with semi-transparent background for readability
45. Bookmark button added: Add bookmark/favourite button on Product Details Page and Product Cards
46. Bookmark action correct: Click bookmark button adds product to buyer favourites list
47. Unbookmark action correct: Click bookmark button again removes product from favourites list
48. Bookmark icon correct: Use heart icon or bookmark icon to indicate favourite status (filled icon for bookmarked, outline icon for not bookmarked)
49. Favourite Products Page exists: Dedicated page displaying all bookmarked/favourite products
50. Favourite Products section in Buyer Dashboard: Link to Favourite Products Page from Buyer Dashboard
51. Favourite Products display correct: Display favourite products as product cards with Store/Seller Name and Brand Name on top of product image
52. Remove from Favourites button functional: Each product card in Favourite Products Page has Remove from Favourites button
53. Empty state correct: Display message \"No favourite products yet\" if buyer has not bookmarked any products
54. Dynamic category system implemented: Platform supports all major product categories including Grocery & Essentials, Fruits & Vegetables, Dairy Products, Snacks & Beverages, Bakery Items, Frozen Foods, Meat & Seafood, Organic Products, Household Items, Cleaning Supplies, Kitchen Accessories, Fashion & Clothing, Men's Wear, Women's Wear, Kids' Wear, Footwear, Bags & Accessories, Cosmetics & Beauty Products, Personal Care Products, Health & Wellness, Medicines & Pharmacy, Baby Care Products, Sports & Fitness Items, Gym Equipment, Electronics, Mobile Phones & Accessories, Computers & Laptops, Home Appliances, Furniture, Home Decor, Stationery & Office Supplies, Books & Educational Products, Toys & Games, Pet Food & Pet Accessories, Automobile Accessories, Gardening Products, Jewelry & Watches, Gift Items, Religious & Festival Products, Hardware & Tools, Industrial Products, Agricultural Products, Farmer Products & Fresh Produce
55. Subcategories supported: Each category can have multiple subcategories
56. Admin category management functional: Admin can add new categories and subcategories via Category Management Page
57. Category hierarchy correct: Categories organized in tree structure with parent-child relationships
58. Category selection correct: Sellers select category and subcategory (if applicable) during product creation
59. Category filter correct: Buyers can filter products by category and subcategory on Product Listing Page and Search Results Page
60. Category search correct: Search functionality supports category-based search
61. Category display correct: Categories displayed as tabs or sections on Seller Dashboard and Product Listing Page
62. Category validation correct: System validates category selection during product creation and bulk upload
63. Users can successfully register with role selection, country selection, and login with email and password
64. Show/hide password toggle works on all password input fields
65. Password strength indicator displays real-time feedback during signup and password reset
66. System correctly routes users to role-specific pages after login based on verification status
67. Buyer Home Page displays sticky search bar at top, fixed on scroll
68. Sticky search bar displays placeholder: \"Search products, stores, categories...\"
69. Search input debounced with 300ms delay to reduce API calls
70. Smart auto-suggestions appear while typing (minimum 2 characters)
71. Auto-suggestions grouped into Products, Stores, Categories sections
72. Maximum 10 suggestions displayed (3-4 per group)
73. Products section in suggestions shows: Product name, price, store name (uses fallback if store_name null), product image thumbnail
74. Stores section in suggestions shows: Store name (uses fallback if store_name null), store logo, Pay Later indicator (crown icon if enabled)
75. Categories section in suggestions shows: Category name, product count
76. Click suggestion navigates to product details, store listing, or category listing
77. Voice search icon opens voice input interface
78. Voice search converts speech to text and executes search
79. Filter chips row displays below search bar with horizontal scroll
80. Filter chips: Nearby Stores, Lowest Price, Fast Delivery, Top Rated, In Stock
81. Each filter chip toggleable (active state highlighted)
82. Click filter chip applies filter and navigates to Search Results Page
83. Recent searches section displays when search bar focused with no input
84. Recent searches shows last 5 searches with Clear All button
85. Click recent search re-executes search
86. Trending searches section displays when search bar focused with no input
87. Trending searches shows top 5 globally trending searches
88. Click trending search executes search
89. Buyer Home Page displays sections in exact order: Sticky Search Bar → Stores List → Store-wise Product Listing → Most People Bought → Recently Bought by You
90. Stores List section displays horizontal scrollable list of store cards
91. Each store card displays: Store logo/banner (optional), Store name (bold, uses fallback if store_name null), Pay Later availability badge/icon (crown icon + \"Pay Later Available\" label) inline on card if pay_later_enabled = true, Request Pay Later button (or status badge if already requested) if pay_later_enabled = true, View Store button
92. Click View Store button navigates to store-specific Product Listing Page
93. Store-wise Product Listing sections display vertically stacked with: store banner/logo (optional, full-width), store name header (bold, 18-20px font, uses fallback if store_name null), Pay Later indicator (crown icon if enabled), View All button (right-aligned, blue link text), horizontal product carousel
94. Store sorting works correctly: For logged-in users (highest user interaction → recently accessed → remaining), For new/guest users (Popular Stores first → remaining)
95. Each store carousel initially loads first page (16 products)
96. Each store carousel supports inline pagination with independent state tracking (page offset, hasMore, loadingMore)
97. Infinite scroll trigger works: When user scrolls within ~200px of carousel right edge, next page (16 products) loads automatically
98. Next page products append to existing carousel without navigation
99. Scroll position maintained after new products loaded
100. View All button navigates to store-specific Product Listing Page
101. Skeleton product cards display at carousel end while loadingMore is true (4 skeleton cards matching ProductCard dimensions)
102. Skeleton cards hide immediately after products appended
103. Error handling works: If page load fails, error message displayed at carousel end with Retry button
104. Retry button allows user to attempt loading again without blocking existing products
105. Debounce mechanism prevents multiple simultaneous page load requests per store
106. Per-store pagination state resets correctly on store switch or page reload
107. Most People Bought section displays horizontal scrollable carousel with products sorted by global purchase count
108. Quick Add to Cart button on each product card in Most People Bought section (yellow/amber primary color)
109. Click Quick Add to Cart adds product to cart with default quantity (1 unit)
110. Recently Bought by You section displays horizontal scrollable carousel with user purchase history (last 30 days)
111. Reorder button on each product card in Recently Bought by You section
112. Click Reorder button adds product to cart with last purchased quantity
113. Quick Add to Cart button on each product card in Recently Bought by You section
114. Last purchased date displayed below product name (small gray text, format: \"Last bought on [date]\")
115. Recently Bought by You section hides if user has no purchase history
116. Amazon-style ProductCard displays: square image (lazy loaded), name (2-3 lines max, truncated, blue link text), star rating with numeric value and review count (if reviews exist), current price (bold, INR), original price with strikethrough and discount badge (if discount available), delivery info, stock info, Quick Add to Cart button (full-width, yellow/amber), Store/Seller Name and Brand Name on top of product image
117. ProductCard hover effects work correctly: slight scale or shadow elevation
118. Horizontal scrolling works smoothly with touch swipe and mouse drag
119. Left/right arrow navigation buttons functional on desktop (visible on hover)
120. Arrow navigation works independently of infinite scroll
121. Touch swipe and mouse drag do not conflict with infinite scroll trigger
122. Skeleton loading displays per section (not full page block)
123. White/light background throughout page with minimal shadows and 1px dividers between sections
124. Section titles are bold, left-aligned, 18-20px font
125. Minimal clean UI inspired by Amazon homepage achieved
126. Buyer Home Page is mobile-first responsive and desktop optimized
127. Lazy loading works for product images (loads when card enters viewport)
128. Progressive section loading works (visible sections load first)
129. Cart icon displays product count badge in header
130. Cart badge displays total product count across all stores
131. Cart badge updates in real-time when Add to Cart, Quick Add to Cart, or Reorder button clicked
132. Visual feedback displayed on successful add to cart (brief animation on cart icon)
133. Cart count calculation correct: Sum of quantities of all products across all stores
134. If cart count exceeds 99, display \"99+\"
135. Cart count persists across page navigation
136. Cart count synced with backend on page load
137. Add to Cart button adds product to cart without navigation
138. Cart icon click navigates to Cart Page
139. ProductCard click navigates to Product Details Page
140. Search Results Page displays grouped results: Products, Stores, Categories
141. Products section supports sorting: Relevance / Price Low to High / Price High to Low / Rating / Newest
142. Products section supports pagination
143. Stores section displays store cards with inline Pay Later badge/icon and Request Pay Later button (or status badge)
144. Active filters displayed on Search Results Page with remove option
145. No results message if search returns empty
146. Back to Home button on Search Results Page
147. Seller Dashboard displays sticky search bar at top, fixed on scroll
148. Seller search bar displays placeholder: \"Search product name, code, category...\"
149. Instant search results displayed while typing (no debounce)
150. Search queries match against: product_name, product_code, SKU, barcode, category, brand_name
151. Maximum 10 results displayed in dropdown
152. Each result shows: Product name, product code, SKU, category, stock status
153. Click result navigates to product edit page or product details
154. Barcode scan icon opens camera interface
155. System scans barcode using device camera
156. Barcode value extracted and used for search
157. Search executed automatically after barcode scan
158. If barcode match found, navigate to product edit page
159. If no barcode match found, display error message
160. Filter chips in seller dashboard: Low Stock, Out of Stock, Recently Added, Best Selling
161. Each filter chip toggleable (active state highlighted)
162. Click filter chip filters product list in dashboard
163. Inventory alerts section displayed when search bar focused
164. Low stock warnings: Products with quantity below threshold (e.g., < 10)
165. Out of stock alerts: Products with quantity = 0
166. Each alert shows: Product name, current quantity, stock status
167. Click alert navigates to product edit page
168. Each product card in Seller Dashboard displays action buttons row
169. Action buttons: Edit, Update Stock, Change Price, Delete, View Orders
170. Edit button navigates to product edit form
171. Update Stock button opens quantity input modal
172. Change Price button opens price input modal
173. Delete button opens confirmation dialog
174. View Orders button navigates to Order Management section filtered by product
175. Update Stock modal displays current quantity, seller enters new quantity, Save button updates quantity
176. Change Price modal displays current price, seller enters new price, Save button updates price
177. Delete confirmation dialog displays warning, Confirm button deletes product
178. If product is part of active orders, display error: \"Product is part of active orders, cannot be deleted\"
179. Seller verification workflow implemented with Pending, Approved, Rejected, and Suspended states
180. Unverified sellers redirected to Verification Application Page upon login
181. Sellers can submit verification application with required documents (Aadhaar Card or Company ID/Other Document ID)
182. Admin can view, approve, reject, or suspend seller verification applications
183. Verification state transitions logged in audit trail
184. Approved sellers can access Payment Plan Selection Page
185. Sellers can choose Weekly or Monthly settlement plan
186. Payment plan selection is mandatory before listing products
187. Billing cycle management tracks weekly and monthly cycles correctly
188. Sellers cannot change payment plan mid-cycle
189. Settlement summary generated at end of each billing cycle
190. Billing module accessible only to Approved sellers
191. Sellers can generate invoices for online orders with auto-populated data
192. Sellers can generate invoices for direct store sales with manual entry
193. Invoice number auto-generated uniquely per store per day
194. Invoice content includes all required fields (store details using fallback if store_name null, customer details, items, tax, total)
195. Invoice preview displayed before final generation
196. Invoices saved to history with unique ID
197. Invoice history filterable by date range, type, and payment status
198. Invoice history searchable by invoice number
199. Invoices downloadable as PDF
200. Invoices printable with professional template
201. Direct sales invoices support multiple items with quantity and price
202. Tax calculation configurable for invoices
203. All invoices linked to store-level financial records
204. Each buyer store operates as independent financial unit
205. Store-specific revenue, orders, transactions, and pending dues tracked separately
206. No cross-store data leakage in cart, orders, or payments
207. Store-specific reporting and analytics available
208. Buyer can create multiple stores with separate delivery addresses
209. Each buyer store has separate cart with complete data isolation
210. Active store clearly indicated with Pay Later indicator (crown icon if enabled, store name uses fallback if store_name null)
211. Buyers can switch between stores seamlessly
212. Store switching updates all store-specific data correctly
213. Cart items completely isolated per store with no data mixing
214. Cart icon displays correct item count for active store
215. Buyer can apply for Pay Later account with Aadhaar Card or Company ID/Other Document ID
216. Pay Later application requires document upload
217. Admin can view and approve/reject Pay Later applications
218. Admin assigns credit limit upon Pay Later approval
219. Pay Later account status displayed in buyer dashboard (Pending / Approved / Rejected)
220. Approved Pay Later account shows assigned credit limit, available credit, and used credit
221. Pay Later credit usage tracked in real-time
222. Available credit calculated correctly (Total limit - Used credit)
223. Pay Later purchases reduce available credit immediately
224. Purchase blocked if available credit insufficient
225. Store-wise Pay Later credit usage displayed in buyer dashboard
226. Pay Later payment restores available credit upon payment
227. Pay Later transactions have due dates displayed at checkout and dashboard
228. Overdue Pay Later payments flagged in dashboard
229. Pay Later account blocked if payment overdue beyond grace period
230. All Pay Later transactions logged with complete details
231. Sellers can enable or disable Pay Later for each store independently
232. Store Pay Later eligibility requires seller to be Approved
233. Pay Later-enabled stores display crown icon on Buyer Home Page Stores List section
234. Crown icon displayed on Store-wise Product Listing section headers for Pay Later-enabled stores
235. Crown icon displayed on Store Selection Page for Pay Later-enabled stores
236. Crown icon displayed on Product Listing Page for Pay Later-enabled stores
237. Crown icon displayed on Product Details Page for Pay Later-enabled stores
238. Crown icon displayed on Cart Page for Pay Later-enabled stores
239. Crown icon displayed on Checkout Page for Pay Later-enabled stores
240. Inline Pay Later badge/icon (crown icon + \"Pay Later Available\" label) displayed on every store card with pay_later_enabled = true
241. Per-store Request Pay Later button displayed on store cards with pay_later_enabled = true (if not yet requested)
242. Status badge displayed on store cards if buyer has already requested Pay Later for this store (Pending / Approved / Rejected)
243. Separate \"Pay Later Only\" filter toggle in StoresListing page remains functional
244. Filter toggle shows only stores with pay_later_enabled = true when active
245. When filter inactive, all stores displayed with inline Pay Later indicators
246. Pay Later payment option visible at checkout only if store has Pay Later enabled and buyer account approved
247. Pay Later option hidden if store does not have Pay Later enabled
248. Pay Later option hidden if buyer does not have approved account
249. Pay Later option hidden if buyer has insufficient available credit
250. Seller dashboard displays Pay Later enabled status with crown icon
251. Store Pay Later toggle switch functional in seller dashboard
252. UPI payment integration redirects to UPI portal with payment intent
253. UPI payment callbacks handled correctly (Success / Failed / Pending)
254. UPI transaction status updated based on callback
255. UPI transactions logged with complete details (Transaction ID, Order ID, Amount, Status, Timestamp)
256. UPI payment success sets order payment status to Paid
257. UPI payment failure keeps order payment status as Pending with retry option
258. UPI payment pending status triggers polling for final status
259. Daily reconciliation of UPI transactions with gateway settlement reports
260. UPI transaction errors handled gracefully with retry mechanism
261. Duplicate UPI transactions prevented by order ID check
262. Store-level UPI transaction history maintained
263. Sellers see UPI payment status in order management
264. UPI transaction details visible in seller financial records
265. Audit logs capture all seller verification actions
266. Audit logs capture all billing actions (invoice generation, modifications)
267. Audit logs capture all payment transactions (UPI, Pay Later)
268. Audit logs capture all Pay Later account actions (application, approval, credit usage)
269. Audit logs capture all account deletion actions
270. Audit log entries include timestamp, user ID, action type, entity ID, status, IP address
271. Audit logs stored securely in append-only database
272. Audit logs retained for minimum 7 years
273. Admin can view audit logs via Audit Log Viewer Page
274. Audit logs filterable by date range, action type, user role
275. Audit logs searchable by user ID or entity ID
276. Audit logs exportable to CSV
277. Sensitive data (Aadhaar, Company ID) stored securely and encrypted
278. Document uploads encrypted at rest
279. Access to sensitive data restricted by role
280. System detects user country from profile during signup
281. System maps user country to appropriate currency with INR as default
282. All product prices displayed with correct currency symbol (default INR)
283. Price format matches regional standards
284. Currency conversion uses real-time exchange rates
285. Users can manually change currency from Profile Management Page
286. Currency change applies to all price displays immediately
287. Cart calculations use converted prices accurately
288. Order totals displayed in user selected currency
289. Invoices generated in user selected currency
290. Forgot Password link is visible on login page
291. User can initiate password reset using email or mobile number
292. System sends OTP to registered email or mobile number
293. OTP expires after 10 minutes with countdown timer display
294. User can resend OTP after 60 seconds
295. System limits OTP attempts to 3 before requiring new OTP request
296. User can successfully reset password with valid OTP
297. New password meets strength requirements
298. System prevents reuse of current password
299. After password reset, user is redirected to login page
300. Password reset works for Buyer, Seller, and Admin roles
301. Verified sellers can add products with mandatory category selection
302. Category dropdown displays all dynamic categories
303. Product price stored as structured data with price_value (INR) and unit
304. System auto-fetches product image when seller does not upload one
305. System assigns default placeholder image if auto-fetch fails
306. Seller dashboard displays products grouped by category
307. Category sections can be expanded and collapsed
308. Category filter works correctly on seller dashboard
309. Search within category functions properly
310. Stock status automatically calculated and displayed (In Stock / Low Stock / Out of Stock)
311. Stock list displays category-wise stock with restock button
312. Product cards show all required information including stock status
313. Bulk Upload button is visible on Product Management Page
314. Sellers can download Excel template with Category column and Brand Name column
315. System accepts .xlsx and .csv file formats
316. System enforces 5MB file size limit
317. System displays data preview after file selection
318. System validates all required fields including Category in Excel
319. System validates Category values against dynamic category list
320. System prevents duplicate Product Code or Barcode entries
321. System validates price as numeric value (INR) not text
322. System displays upload summary with total records, successful additions, and failed records
323. Failed records show specific error messages with row numbers
324. Products uploaded via Excel are correctly categorized
325. Buyers can browse products by dynamic category and search by product name
326. Product cards display price in INR with correct symbol
327. Product cards display unit information
328. Product cards display average rating and total review count
329. Buyers can add products to cart with specified quantity
330. Cart correctly calculates item totals, subtotal, tax, and grand total in user currency
331. Buyers can update quantities with +/- buttons and remove items from cart
332. Buyers can select from 5 payment options during checkout: Cash on Delivery, UPI, Weekly Plan, Monthly Plan, Pay Later
333. System generates unique Order ID for each order
334. Orders display correct status progression from Placed to Delivered
335. Sellers can update order status through their dashboard
336. Buyer can view seller contact number after placing order (if seller allows buyer contact access)
337. Seller can view buyer contact details for all orders
338. Weekly and monthly payment plans correctly calculate and display due dates
339. Pending payments are displayed in both buyer and seller dashboards with amounts in INR
340. Payment reminders are shown for approaching due dates
341. Buyer dashboard displays store management, order history, tracking, invoices, pending payments, Pay Later status, credit usage, reviews, favourite products, and support tickets
342. Seller dashboard displays verification status, store information (store name uses fallback if store_name null), stock list, listed products by category, order management, billing module access, financial records, settlement summary, sales summary, reviews, and support tickets
343. Financial Records section displays store-level transaction history with UPI logs
344. Settlement summary correctly calculates billing cycle data and net settlement amount
345. Sales summary correctly calculates daily, weekly, and monthly totals in INR
346. System prevents unauthorized access based on user role and verification status
347. All input fields are validated with appropriate error messages
348. System handles boundary conditions as specified in exception handling table
349. Buyers can submit reviews only for delivered orders
350. Review submission requires rating selection from 1 to 5 stars
351. Each buyer can submit only one review per product per order
352. Average rating is calculated correctly and displayed on product cards and details page
353. Reviews are displayed on product details page with sorting options
354. Sellers can view all reviews for their products in dashboard
355. Sellers can respond to reviews for their own products
356. Buyers can edit or delete their own reviews
357. Seller responses are displayed below corresponding reviews
358. Leave Review button appears only for delivered orders without reviews
359. My Reviews section displays all reviews submitted by buyer with seller responses
360. Help Center accessible to all users with FAQ section
361. Users can raise support tickets with issue type and description
362. Support tickets tracked with status (Open / In Progress / Resolved / Closed)
363. Users can view ticket details and track resolution progress
364. Profile Management Page displays all user information including profile photo and delivery addresses
365. Users can view Full Name, Email, Mobile Number, Profile Photo, Country, and all saved Delivery Addresses
366. Edit Mode toggle button enables profile editing
367. Users can update Full Name, Mobile Number, and Country in edit mode
368. Email is non-editable and displays with verification badge
369. Users can upload new profile photo with preview
370. Users can replace existing profile photo
371. Users can remove profile photo
372. Profile photo upload validates format (JPG, PNG only)
373. Profile photo upload validates size (maximum 2MB)
374. Profile photo preview displays before and after upload
375. Users can add multiple delivery addresses
376. Address form includes optional Address Label and required Full Address fields
377. Users can edit existing delivery addresses
378. Users can delete delivery addresses
379. System prevents deletion of last remaining delivery address for buyers
380. Delivery addresses displayed in list with edit and delete buttons
381. Checkout page displays delivery address selection dropdown from saved addresses
382. Checkout page includes Add New Address button
383. Country change automatically updates currency preference
384. Currency preference display shows auto-updated value based on country
385. Save Changes button saves all profile updates
386. Cancel button discards unsaved changes and reverts to original values
387. Success message displays after successful profile update
388. Error messages display for validation failures
389. Loading indicator shows during profile photo upload
390. Loading indicator shows during profile save operation
391. Full Name validation prevents empty submission
392. Mobile Number validation checks format
393. Delivery Address validation prevents empty submission when adding new address
394. Profile photo validation prevents upload of files exceeding 2MB
395. Profile photo validation prevents upload of non-JPG/PNG formats
396. Profile Management Page is responsive on all screen sizes
397. Users can request account deletion from dashboard
398. Account deletion requires admin approval
399. System checks for pending payments before allowing deletion
400. Admin can approve or reject account deletion requests
401. Deleted accounts can re-register using same email or mobile number
402. Admin dashboard displays platform statistics and quick access links
403. Admin can manage seller verifications with state management
404. Admin can manage Pay Later account approvals with credit limit assignment
405. Admin can manage account deletions with financial clearance check
406. Admin can view audit logs with filtering and search
407. Admin can manage dynamic category system by adding new categories and subcategories
408. All payment processing uses converted amounts accurately
409. Store-level financial tracking provides clear transaction visibility
410. Profile Management accessible from both Buyer and Seller dashboards
411. System is secure, scalable, and suitable for multi-store architecture
412. System meets financial-grade security standards
413. System supports real-world marketplace operations at Amazon/Flipkart level
414. Voice search functionality works correctly with speech-to-text conversion
415. Barcode scan functionality works correctly with camera access and barcode recognition
416. Search debounce reduces API calls effectively
417. Recent searches and trending searches cached for performance
418. Cart count badge color is red or orange for visibility
419. Cart count badge position is top-right corner of cart icon
420. Seller dashboard search supports instant results without debounce
421. Inventory alerts update in real-time
422. Product card action buttons styled with minimal design
423. All new features follow minimal aesthetic: white background, ample whitespace, clear font hierarchy, no heavy shadows
424. All new features are mobile-first responsive
425. Smooth horizontal scrolling carousels work correctly
426. Rounded cards for store and product cards
427. Lazy loading for products works correctly
428. Store name fallback prevents \"Store not found\" errors across all pages
429. Inline Pay Later badge/icon displays correctly on all store cards with pay_later_enabled = true
430. Per-store Request Pay Later button functional on store cards
431. Separate Pay Later filter toggle remains functional and coexists with inline display
432. Store contact details visibility controlled by seller per store
433. Brand name field added to product schema and displayed correctly
434. Seller dashboard search bar fixed and fully functional
435. Pay Later request uses seller name fallback when store name unavailable
436. Credit limit displayed in Pay Later request form
437. Verification document upload shows exactly two options: Aadhaar Card and Company ID/Other Document ID
438. Store/Seller name and brand name displayed on top of product image on product cards
439. Bookmark/Favourite feature functional with dedicated Favourite Products Page
440. Dynamic category system supports all major product categories
441. Admin can add new categories and subcategories
442. Category system is scalable and supports category-wise filtering and search

## 7. Out of Scope for This Release

- Automated notification system for payment reminders via email or SMS
- Wishlist functionality (separate from bookmark/favourite feature)
- Multi-language support
- Advanced analytics and reporting dashboards beyond basic sales summary
- Promotional codes and discount coupons
- Seller performance metrics and ratings
- Buyer loyalty program and rewards
- Real-time chat between buyer and seller
- Mobile application version (iOS and Android)
- Integration with third-party logistics providers for shipping
- Automated inventory alerts for low stock via notifications
- Review moderation and reporting system for inappropriate content
- Verified purchase badge for reviews
- Helpful/Not Helpful voting on reviews
- Image upload in reviews
- Two-factor authentication for enhanced security
- Social media login integration (Google, Facebook)
- Automated email notifications for order status updates
- SMS-based OTP delivery (currently email-based only)
- Bulk product edit via Excel
- Product import from external sources or APIs
- Custom category creation by sellers (admin-only feature)
- Category editing or deletion functionality for sellers
- Multi-currency payment processing with automatic conversion
- Historical exchange rate tracking and analysis
- Currency conversion fee calculation
- Automatic currency detection based on GPS location
- Cryptocurrency payment support
- Subscription-based pricing for buyers
- Advanced search filters (price range, rating, availability) on Buyer Home Page beyond basic search and filter chips
- Product comparison feature
- Seller analytics dashboard with sales trends beyond basic summary
- Buyer purchase history analytics
- Automated tax calculation based on location
- Invoice customization options beyond standard template
- Bulk order processing for sellers
- Return and refund management system
- Product warranty and guarantee tracking
- Seller onboarding tutorial or guide
- Buyer onboarding tutorial or guide
- In-app messaging system
- Push notifications for mobile web
- Dark mode theme option
- Accessibility features for visually impaired users
- Export data functionality for buyers and sellers beyond invoice PDF
- API access for third-party integrations
- White-label solution for other businesses
- Franchise or multi-vendor marketplace expansion
- Automated fraud detection system beyond basic validation
- Advanced payment reconciliation tools beyond daily UPI reconciliation
- Seller commission management beyond settlement summary
- Platform fee configuration by admin (currently fixed)
- Dynamic pricing based on demand
- Flash sales and time-limited offers
- Product bundling and combo offers
- Gift card and voucher system
- Referral program for buyers and sellers
- Social sharing of products
- Product recommendations based on purchase history (beyond Most People Bought and Recently Bought by You)
- AI-powered chatbot for customer support
- Video product demonstrations
- Live streaming for product launches
- Augmented reality product preview
- Offline mode for mobile app
- Multi-warehouse inventory management
- Dropshipping integration
- B2B wholesale pricing tiers
- Auction-based selling
- Pre-order and backorder management
- Seasonal product catalog management
- Product expiry date tracking for perishables
- Cold chain logistics integration
- Quality certification badges for products
- Organic and eco-friendly product filters
- Nutritional information display
- Recipe suggestions based on purchased items
- Meal planning integration
- Smart shopping list with AI suggestions
- Price comparison with competitors
- Price drop alerts for buyers
- Seller reputation score beyond reviews
- Buyer credit score for Pay Later eligibility (currently admin-assigned)
- Installment payment plans beyond weekly/monthly
- Automatic payment reminders via multiple channels
- Late payment penalty calculation
- Credit limit adjustment based on payment history (currently manual by admin)
- Multi-store franchise management for sellers
- Centralized inventory across multiple seller stores
- Inter-store product transfer
- Consolidated financial reporting across stores beyond store-level reports
- Tax compliance automation
- GST invoice generation for India
- International shipping support
- Multi-country seller accounts
- Regional pricing variations
- Language-specific product descriptions
- Cultural customization for different markets
- Advanced carousel features beyond inline pagination (autoplay with pause on hover, custom transitions)
- Product quick view modal from carousel
- Store follow/unfollow functionality
- Store rating and review system
- Personalized store recommendations based on machine learning
- Dynamic store sorting based on real-time user behavior beyond specified logic
- Store badges (Verified, Top Rated, Fast Delivery)
- Store promotional banners on home page
- Featured products section per store
- Store-specific deals and offers display
- Product availability notifications
- Out of stock product waitlist
- Product variant selection from carousel
- Bulk add to cart from carousel
- Compare products from different stores
- Save for later functionality (separate from bookmark/favourite)
- Recently viewed products across all stores
- Trending products section
- Seasonal product recommendations
- Weather-based product suggestions
- Location-based store recommendations
- Store distance calculation and display
- Store operating hours display
- Store holiday schedule
- Store capacity and crowd indicators
- Virtual queue for popular stores
- Appointment booking for store visits
- Curbside pickup scheduling
- Delivery time slot selection from home page
- Express delivery badge on products
- Same-day delivery filter
- Eco-friendly delivery option
- Carbon footprint display per order
- Packaging preference selection
- Gift wrapping option from home page
- Gift message addition
- Multiple recipient delivery
- Split payment options
- Group buying functionality
- Social shopping features
- Share cart with friends
- Collaborative shopping lists
- Advanced voice search features (natural language processing, context-aware search)
- Voice commands for navigation and actions
- Barcode scan history and analytics
- Barcode-based inventory management for sellers
- QR code generation for products
- NFC-based product information access
- Augmented reality barcode scanning
- Multi-barcode support per product
- Barcode-based loyalty program
- Barcode-based checkout (scan and pay)
- Advanced search analytics (search trends, popular queries, conversion rates)
- Search personalization based on user behavior
- Autocomplete suggestions based on machine learning
- Search result ranking optimization
- Search A/B testing framework
- Search performance monitoring dashboard
- Advanced filter combinations (multiple filters simultaneously)
- Custom filter creation by users
- Filter presets (save and reuse filter combinations)
- Filter analytics (most used filters, filter effectiveness)
- Dynamic filter options based on search results
- Filter recommendations based on user behavior
- Advanced cart features (save cart, share cart, cart expiry)
- Cart synchronization across devices
- Cart recommendations (frequently bought together in cart)
- Cart abandonment recovery
- Cart analytics (average cart value, cart conversion rate)
- Multi-cart management (separate carts for different purposes)
- Cart merge functionality when switching stores
- Cart history and reorder from past carts
- Advanced product card features (360-degree product view, video preview)
- Product card customization options
- Product card A/B testing
- Product card performance analytics
- Dynamic product card layout based on screen size
- Product card accessibility enhancements
- Advanced seller dashboard features (predictive analytics, demand forecasting)
- Seller dashboard customization options
- Seller dashboard widgets (drag and drop)
- Seller dashboard mobile app
- Seller dashboard API access
- Seller dashboard integrations (accounting software, CRM)
- Advanced inventory management (automatic reordering, supplier management)
- Inventory forecasting based on sales trends
- Inventory optimization recommendations
- Inventory transfer between stores
- Inventory audit trail
- Inventory valuation reports
- Advanced category management features (category merging, category splitting, category analytics)
- Category-based promotions and discounts
- Category-specific seller onboarding
- Category performance analytics
- Category-based buyer segmentation