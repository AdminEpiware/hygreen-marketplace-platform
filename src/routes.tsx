import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import BuyerHome from './pages/BuyerHome';
import ProductListing from './pages/ProductListing';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import ProductManagement from './pages/ProductManagement';
import BulkUpload from './pages/BulkUpload';
import FileConverter from './pages/FileConverter';
import DirectBilling from './pages/DirectBilling';
import SalesReport from './pages/SalesReport';
import BuyerPayLaterRequest from './pages/BuyerPayLaterRequest';
import SellerPayLaterApproval from './pages/SellerPayLaterApproval';
import PaymentSuccess from './pages/PaymentSuccess';
import ReviewForm from './pages/ReviewForm';
import HelpCenter from './pages/HelpCenter';
import ProfileManagement from './pages/ProfileManagement';
import StoreManagement from './pages/StoreManagement';
import StoresListing from './pages/StoresListing';
import StoreDetail from './pages/StoreDetail';
import SellerVerificationApplication from './pages/SellerVerificationApplication';
import PayLaterApplication from './pages/PayLaterApplication';
import AdminPayLaterApproval from './pages/AdminPayLaterApproval';
import AdminDashboard from './pages/AdminDashboard';
import AdminSellers from './pages/AdminSellers';
import AdminBuyers from './pages/AdminBuyers';
import AdminCategoryManagement from './pages/AdminCategoryManagement';
import FavouritesPage from './pages/FavouritesPage';
import PRDViewer from './pages/PRDViewer';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <BuyerHome />,
    public: true,
  },
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    public: true,
  },
  {
    name: 'Signup',
    path: '/signup',
    element: <Signup />,
    public: true,
  },
  {
    name: 'Forgot Password',
    path: '/forgot-password',
    element: <ForgotPassword />,
    public: true,
  },
  {
    name: 'Reset Password',
    path: '/reset-password',
    element: <ResetPassword />,
    public: true,
  },
  {
    name: 'Settings',
    path: '/settings',
    element: <Settings />,
  },
  {
    name: 'Stores',
    path: '/stores',
    element: <StoresListing />,
    public: true,
  },
  {
    name: 'Store Detail',
    path: '/store/:storeId',
    element: <StoreDetail />,
    public: true,
  },
  {
    name: 'Products',
    path: '/products',
    element: <ProductListing />,
    public: true,
  },
  {
    name: 'Product Details',
    path: '/product/:id',
    element: <ProductDetails />,
    public: true,
  },
  {
    name: 'Cart',
    path: '/cart',
    element: <Cart />,
  },
  {
    name: 'Checkout',
    path: '/checkout',
    element: <Checkout />,
  },
  {
    name: 'Buyer Dashboard',
    path: '/buyer/dashboard',
    element: <BuyerDashboard />,
  },
  {
    name: 'Store Management',
    path: '/buyer/stores',
    element: <StoreManagement />,
  },
  {
    name: 'Pay Later Application',
    path: '/buyer/pay-later',
    element: <PayLaterApplication />,
  },
  {
    name: 'Seller Dashboard',
    path: '/seller/dashboard',
    element: <SellerDashboard />,
  },
  {
    name: 'Seller Verification',
    path: '/seller/verification',
    element: <SellerVerificationApplication />,
  },
  {
    name: 'Product Management',
    path: '/seller/products',
    element: <ProductManagement />,
  },
  {
    name: 'Bulk Upload',
    path: '/seller/bulk-upload',
    element: <BulkUpload />,
  },
  {
    name: 'File Converter',
    path: '/seller/file-converter',
    element: <FileConverter />,
  },
  {
    name: 'Direct Billing',
    path: '/seller/direct-billing',
    element: <DirectBilling />,
  },
  {
    name: 'Sales Report',
    path: '/seller/sales-report',
    element: <SalesReport />,
  },
  {
    name: 'Seller Pay Later Approval',
    path: '/seller/pay-later-approval',
    element: <SellerPayLaterApproval />,
  },
  {
    name: 'Buyer Pay Later Request',
    path: '/buyer/pay-later-request/:storeId',
    element: <BuyerPayLaterRequest />,
  },
  {
    name: 'Admin Pay Later Approval',
    path: '/admin/pay-later-approval',
    element: <AdminPayLaterApproval />,
  },
  {
    name: 'Admin Dashboard',
    path: '/admin/dashboard',
    element: <AdminDashboard />,
  },
  {
    name: 'Admin Sellers',
    path: '/admin/sellers',
    element: <AdminSellers />,
  },
  {
    name: 'Admin Buyers',
    path: '/admin/buyers',
    element: <AdminBuyers />,
  },
  {
    name: 'Admin Categories',
    path: '/admin/categories',
    element: <AdminCategoryManagement />,
  },
  {
    name: 'Favourites',
    path: '/buyer/favourites',
    element: <FavouritesPage />,
  },
  {
    name: 'Payment Success',
    path: '/payment-success',
    element: <PaymentSuccess />,
  },
  {
    name: 'Review Form',
    path: '/review',
    element: <ReviewForm />,
  },
  {
    name: 'Help Center',
    path: '/help',
    element: <HelpCenter />,
    public: true,
  },
  {
    name: 'Profile Management',
    path: '/profile',
    element: <ProfileManagement />,
  },
  {
    name: 'PRD Viewer',
    path: '/prd',
    element: <PRDViewer />,
    public: true,
  },
];
