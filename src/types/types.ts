export type UserRole = 'buyer' | 'seller' | 'admin';

export type ProductCategory = string; // Dynamic — values sourced from categories table

export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'on_the_way' | 'packed' | 'delivered' | 'cancelled';

export type PaymentType = 'cash_on_delivery' | 'online_payment' | 'weekly_plan' | 'monthly_plan' | 'pay_later';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export type IssueType = 'account' | 'payment' | 'order' | 'product' | 'other';

export type ImageSource = 'upload' | 'google' | 'default';

export type WarningSeverity = 'low' | 'medium' | 'high';

export type WarningStatus = 'active' | 'resolved' | 'dismissed';

export type TicketCategory = 'account' | 'payment' | 'order' | 'product' | 'technical' | 'other';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface DeliveryAddress {
  label?: string;
  address: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  address: string;
  country: string | null;
  currency_preference: string | null;
  profile_photo_url: string | null;
  delivery_addresses?: DeliveryAddress[];
  role: UserRole;
  buyer_code?: string | null;
  seller_code?: string | null;
  verification_status?: VerificationStatus;
  business_name?: string;
  business_type?: string;
  business_address?: string;
  verification_document_url?: string;
  verification_submitted_at?: string;
  verification_reviewed_at?: string;
  verification_reviewed_by?: string;
  verification_rejection_reason?: string;
  payment_plan?: 'weekly' | 'monthly';
  is_email_verified?: boolean;
  email_otp?: string | null;
  otp_expiry_time?: string | null;
  otp_attempts?: number;
  store_name?: string;
  store_address?: string;
  store_contact?: string;
  pay_later_enabled?: boolean;
  weekly_plan_enabled?: boolean;
  monthly_plan_enabled?: boolean;
  allow_buyer_contact?: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuyerStore {
  id: string;
  buyer_id: string;
  store_name: string;
  delivery_address: string;
  contact_number?: string;
  pay_later_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FavoriteStore {
  id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  category: ProductCategory;
  brand_name?: string | null;
  price: number;
  unit: string;
  available_quantity: number;
  description: string | null;
  image_url: string | null;
  image_source: ImageSource;
  product_code: string | null;
  barcode: string | null;
  base_currency: string;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductFavourite {
  id: string;
  buyer_id: string;
  product_id: string;
  created_at: string;
  product?: Product & { seller?: Pick<Profile, 'id' | 'store_name' | 'business_name' | 'full_name'> };
}

export interface CartItem {
  id: string;
  buyer_id: string;
  buyer_store_id?: string; // Deprecated - use seller_id instead
  seller_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  buyer_store_id?: string | null; // Deprecated - use seller_id instead
  seller_id?: string;
  delivery_address: string;
  payment_type: PaymentType;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  order_type?: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  due_date: string | null;
  cancellation_reason?: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  seller_id: string;
  product_name: string;
  product_category: ProductCategory;
  price: number;
  unit: string;
  quantity: number;
  item_total: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  buyer_profile?: Profile;
  seller_profile?: {
    store_name?: string;
    business_name?: string;
    full_name?: string;
  };
}

export interface Config {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface SignupData {
  email: string;
  password: string;
  full_name: string;
  mobile_number: string;
  address: string;
  country: string;
  role: UserRole;
  store_name?: string;
  store_address?: string;
  store_contact?: string;
  pay_later_enabled?: boolean;
  weekly_plan_enabled?: boolean;
  monthly_plan_enabled?: boolean;
}

export interface CartItemWithProduct extends CartItem {
  product: Product;
}

export interface SalesSummary {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  buyer?: Profile;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  seller_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  seller?: Profile;
}

export interface ReviewWithResponse extends Review {
  review_response?: ReviewResponse;
}

// Verification and Financial Types
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PayLaterAccountStatus = 'pending' | 'approved' | 'rejected';
export type InvoiceType = 'online_order' | 'direct_sale';
export type AuditActionType = 
  | 'seller_verification_submitted'
  | 'seller_verification_approved'
  | 'seller_verification_rejected'
  | 'seller_verification_suspended'
  | 'pay_later_application_submitted'
  | 'pay_later_application_approved'
  | 'pay_later_application_rejected'
  | 'invoice_generated'
  | 'store_pay_later_enabled'
  | 'store_pay_later_disabled'
  | 'payment_processed'
  | 'account_deletion_requested'
  | 'account_deletion_approved';

export interface PayLaterAccount {
  id: string;
  buyer_id: string;
  account_holder_name: string;
  account_type: 'individual' | 'company';
  aadhaar_number?: string;
  company_id?: string;
  document_url: string;
  requested_credit_limit: number;
  assigned_credit_limit?: number;
  used_credit: number;
  available_credit: number;
  status: PayLaterAccountStatus;
  terms_accepted: boolean;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  order_id?: string;
  seller_id: string;
  buyer_id?: string;
  customer_name?: string;
  customer_contact?: string;
  store_name: string;
  store_address: string;
  store_contact?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total_amount: number;
  payment_type?: string;
  payment_status?: string;
  invoice_date: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_role?: string;
  action_type: AuditActionType;
  entity_type?: string;
  entity_id?: string;
  action_status: string;
  ip_address?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface SellerVerification {
  verification_status: VerificationStatus;
  business_name?: string;
  business_type?: string;
  business_address?: string;
  verification_document_url?: string;
  verification_submitted_at?: string;
  verification_reviewed_at?: string;
  verification_reviewed_by?: string;
  verification_rejection_reason?: string;
  payment_plan?: 'weekly' | 'monthly';
}

export interface StoreWarning {
  id: string;
  store_id: string;
  issued_by: string;
  reason: string;
  description: string | null;
  severity: WarningSeverity;
  status: WarningStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  store_profile?: Profile;
  issued_by_profile?: Profile;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  user_profile?: Profile;
  assigned_to_profile?: Profile;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  user_profile?: Profile;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_profile?: Profile;
}

export interface AdminStats {
  total_sellers: number;
  total_buyers: number;
  total_stores: number;
  pending_approvals: number;
  open_tickets: number;
  total_orders: number;
  total_revenue: number;
  active_warnings: number;
}

