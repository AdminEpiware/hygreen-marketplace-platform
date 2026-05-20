import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layouts/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Store, ShoppingCart, AlertTriangle, Ticket, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminStats } from '@/types/types';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    total_sellers: 0,
    total_buyers: 0,
    total_stores: 0,
    pending_approvals: 0,
    open_tickets: 0,
    total_orders: 0,
    total_revenue: 0,
    active_warnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
    } else {
      fetchStats();
    }
  }, [profile, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      console.log('Fetching admin dashboard stats...');

      // Fetch total sellers
      const { count: sellersCount, error: sellersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'seller');

      if (sellersError) {
        console.error('Error fetching sellers count:', sellersError);
      }

      // Fetch total buyers
      const { count: buyersCount, error: buyersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'buyer');

      if (buyersError) {
        console.error('Error fetching buyers count:', buyersError);
      }

      // Fetch pending approvals
      const { count: pendingCount, error: pendingError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'seller')
        .eq('verification_status', 'pending');

      if (pendingError) {
        console.error('Error fetching pending approvals:', pendingError);
      }

      // Fetch open tickets
      const { count: ticketsCount, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      if (ticketsError) {
        console.error('Error fetching tickets count:', ticketsError);
      }

      // Fetch active warnings
      const { count: warningsCount, error: warningsError } = await supabase
        .from('store_warnings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (warningsError) {
        console.error('Error fetching warnings count:', warningsError);
      }

      // Fetch total orders
      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (ordersError) {
        console.error('Error fetching orders count:', ordersError);
      }

      // Fetch total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('payment_status', 'completed');

      if (revenueError) {
        console.error('Error fetching revenue:', revenueError);
      }

      const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      const statsData = {
        total_sellers: sellersCount || 0,
        total_buyers: buyersCount || 0,
        total_stores: sellersCount || 0,
        pending_approvals: pendingCount || 0,
        open_tickets: ticketsCount || 0,
        total_orders: ordersCount || 0,
        total_revenue: totalRevenue,
        active_warnings: warningsCount || 0,
      };

      console.log('Dashboard stats:', statsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard statistics. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || profile?.role !== 'admin') {
    return null;
  }

  const statCards = [
    {
      title: 'Total Sellers',
      value: stats.total_sellers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => navigate('/admin/sellers'),
    },
    {
      title: 'Total Buyers',
      value: stats.total_buyers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => navigate('/admin/buyers'),
    },
    {
      title: 'Total Stores',
      value: stats.total_stores,
      icon: Store,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => navigate('/admin/stores'),
    },
    {
      title: 'Pending Approvals',
      value: stats.pending_approvals,
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => navigate('/admin/sellers?filter=pending'),
      highlight: stats.pending_approvals > 0,
    },
    {
      title: 'Open Tickets',
      value: stats.open_tickets,
      icon: Ticket,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      action: () => navigate('/admin/tickets'),
      highlight: stats.open_tickets > 0,
    },
    {
      title: 'Active Warnings',
      value: stats.active_warnings,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      action: () => navigate('/admin/warnings'),
    },
    {
      title: 'Total Orders',
      value: stats.total_orders,
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.total_revenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Admin Dashboard</h1>
          <p className="text-muted-foreground text-pretty">
            Manage sellers, buyers, stores, and platform operations
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-6">
                  <div className="space-y-4 animate-pulse">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <Card
                key={index}
                className={`h-full cursor-pointer transition-all hover:shadow-md ${
                  stat.highlight ? 'ring-2 ring-primary' : ''
                }`}
                onClick={stat.action}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    {stat.highlight && (
                      <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <TrendingUp className="h-3 w-3" />
                        Action Required
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin/sellers')}
              >
                <Users className="h-6 w-6" />
                <span>Manage Sellers</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin/buyers')}
              >
                <Users className="h-6 w-6" />
                <span>Manage Buyers</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin/tickets')}
              >
                <Ticket className="h-6 w-6" />
                <span>Support Tickets</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin/warnings')}
              >
                <AlertTriangle className="h-6 w-6" />
                <span>Store Warnings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
