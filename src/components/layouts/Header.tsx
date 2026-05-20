import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShoppingBag, ShoppingCart, User, LogOut, Settings, Store, HelpCircle, Home, Heart, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { HYGREEN_LOGO_URL } from '@/components/common/HyGreenLogo';

export function Header() {
  const { user, profile, signOut, currency, cartItemCount, buyerStores, activeStore, setActiveStore } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/*
        Fixed heights keep sticky offsets in sync with the actual header height.
        Mobile:  h-[192px]  →  search bar top-[192px]
        Desktop: h-[248px]  →  search bar top-[248px]
        Logo doubled from h-[84px]/h-[112px] → h-[168px]/h-[224px].
        12px breathing room top/bottom at both sizes.
      */}
      <div className="container h-[192px] md:h-[248px] flex items-center justify-between gap-4 px-4 md:px-6">

        {/* ── Logo — doubled from previous size, w-auto prevents any cropping ── */}
        <Link to="/" className="flex items-center shrink-0">
          <img
            src={HYGREEN_LOGO_URL}
            alt="HyGreen — More Than Grocery, It's Family."
            className="h-[168px] md:h-[224px] w-auto object-contain"
            loading="eager"
            decoding="async"
          />
        </Link>

        <nav className="flex items-center gap-2 md:gap-4">
          {user && profile ? (
            <>
              {profile.role === 'buyer' && (
                <>
                  <Link to="/" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Home
                  </Link>
                  <Link to="/stores" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Stores
                  </Link>
                  <Link to="/cart" className="relative text-sm font-medium hover:text-primary transition-colors">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {cartItemCount}
                      </Badge>
                    )}
                  </Link>
                  {buyerStores.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 px-2 md:px-3">
                          <Store className="h-4 w-4" />
                          <span className="hidden md:inline max-w-[120px] truncate">{activeStore?.store_name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-[320px]">
                        <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {buyerStores.map((store) => (
                          <DropdownMenuItem
                            key={store.id}
                            onClick={() => setActiveStore(store)}
                            className={activeStore?.id === store.id ? 'bg-accent' : ''}
                          >
                            <div className="flex flex-col gap-1 w-full min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{store.store_name}</span>
                                {activeStore?.id === store.id && (
                                  <Badge variant="secondary" className="text-xs shrink-0">Active</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate">
                                {store.delivery_address}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Link to="/buyer/dashboard" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </>
              )}

              {profile.role === 'seller' && (
                <>
                  <Link to="/seller/products" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Products
                  </Link>
                  <Link to="/seller/dashboard" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </>
              )}

              {profile.role === 'admin' && (
                <>
                  <Link to="/admin/dashboard" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/admin/sellers" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Sellers
                  </Link>
                  <Link to="/admin/buyers" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Buyers
                  </Link>
                  <Link to="/admin/categories" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
                    Categories
                  </Link>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-[280px]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                      {profile.country && (
                        <p className="text-xs text-muted-foreground">
                          {profile.country} • {currency}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profile.role === 'buyer' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/')} className="md:hidden">
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/stores')} className="md:hidden">
                        <Store className="mr-2 h-4 w-4" />
                        Stores
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/buyer/dashboard')} className="md:hidden">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/buyer/favourites')}>
                        <Heart className="mr-2 h-4 w-4" />
                        Favourites
                      </DropdownMenuItem>
                    </>
                  )}
                  {profile.role === 'seller' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/seller/products')} className="md:hidden">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Products
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/seller/dashboard')} className="md:hidden">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  {profile.role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="md:hidden">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/sellers')} className="md:hidden">
                        <User className="mr-2 h-4 w-4" />
                        Sellers
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/buyers')} className="md:hidden">
                        <User className="mr-2 h-4 w-4" />
                        Buyers
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/categories')} className="md:hidden">
                        <Layers className="mr-2 h-4 w-4" />
                        Categories
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="h-9">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="h-9">Sign Up</Button>
              </Link>
            </>
          )}
          
          <Link to="/help" className="text-sm font-medium hover:text-primary transition-colors shrink-0">
            <HelpCircle className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
