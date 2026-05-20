import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, TrendingUp, ShoppingCart, Receipt, DollarSign, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, DEFAULT_CURRENCY } from '@/lib/currency';

interface OnlineSale {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_type: string;
  order_status: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

interface DirectSale {
  id: string;
  customer_name: string | null;
  customer_mobile: string | null;
  total: number;
  payment_method: string;
  sale_date: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

interface SalesSummary {
  onlineCount: number;
  onlineRevenue: number;
  directCount: number;
  directRevenue: number;
  totalCount: number;
  totalRevenue: number;
}

interface DailySales {
  date: string;
  onlineCount: number;
  onlineRevenue: number;
  directCount: number;
  directRevenue: number;
  totalCount: number;
  totalRevenue: number;
  transactions: Array<(OnlineSale & { type: 'online' }) | (DirectSale & { type: 'direct' })>;
}

export default function SalesReport() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [onlineSales, setOnlineSales] = useState<OnlineSale[]>([]);
  const [directSales, setDirectSales] = useState<DirectSale[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'daily'>('summary');
  const [summary, setSummary] = useState<SalesSummary>({
    onlineCount: 0,
    onlineRevenue: 0,
    directCount: 0,
    directRevenue: 0,
    totalCount: 0,
    totalRevenue: 0,
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    if (user && profile?.role === 'seller') {
      fetchSalesData();
    }
  }, [user, profile, dateFrom, dateTo, paymentFilter]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOnlineSales(), fetchDirectSales()]);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineSales = async () => {
    try {
      // Get all order items for this seller
      let query = supabase
        .from('order_items')
        .select(`
          order_id,
          quantity,
          price,
          orders!inner (
            id,
            order_number,
            customer_name,
            total_amount,
            payment_type,
            order_status,
            created_at
          ),
          products!inner (
            seller_id,
            name
          )
        `)
        .eq('products.seller_id', user!.id);

      // Apply date filters
      if (dateFrom) {
        query = query.gte('orders.created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('orders.created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by order and calculate totals
      const orderMap = new Map<string, OnlineSale>();
      
      data?.forEach((item: any) => {
        const order = item.orders;
        if (!orderMap.has(order.id)) {
          orderMap.set(order.id, {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name || 'Guest',
            total_amount: item.quantity * item.price,
            payment_type: order.payment_type,
            order_status: order.order_status,
            created_at: order.created_at,
            items: [{
              product_name: item.products.name,
              quantity: item.quantity,
              price: item.price,
            }],
          });
        } else {
          const existing = orderMap.get(order.id)!;
          existing.total_amount += item.quantity * item.price;
          existing.items!.push({
            product_name: item.products.name,
            quantity: item.quantity,
            price: item.price,
          });
        }
      });

      let salesArray = Array.from(orderMap.values());

      // Apply payment filter
      if (paymentFilter !== 'all') {
        salesArray = salesArray.filter(sale => sale.payment_type === paymentFilter);
      }

      // Sort by date descending
      salesArray.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOnlineSales(salesArray);
      return salesArray;
    } catch (error) {
      console.error('Error fetching online sales:', error);
      return [];
    }
  };

  const fetchDirectSales = async () => {
    try {
      let query = supabase
        .from('direct_sales')
        .select('*')
        .eq('seller_id', user!.id);

      // Apply date filters
      if (dateFrom) {
        query = query.gte('sale_date', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('sale_date', endDate.toISOString());
      }

      // Apply payment filter
      if (paymentFilter !== 'all') {
        query = query.eq('payment_method', paymentFilter);
      }

      query = query.order('sale_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setDirectSales(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching direct sales:', error);
      return [];
    }
  };

  const calculateDailySales = () => {
    const dailyMap = new Map<string, DailySales>();

    // Process online sales
    onlineSales.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleDateString();
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          onlineCount: 0,
          onlineRevenue: 0,
          directCount: 0,
          directRevenue: 0,
          totalCount: 0,
          totalRevenue: 0,
          transactions: [],
        });
      }
      const daily = dailyMap.get(date)!;
      daily.onlineCount++;
      daily.onlineRevenue += Number(sale.total_amount);
      daily.transactions.push({ ...sale, type: 'online' });
    });

    // Process direct sales
    directSales.forEach(sale => {
      const date = new Date(sale.sale_date).toLocaleDateString();
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          onlineCount: 0,
          onlineRevenue: 0,
          directCount: 0,
          directRevenue: 0,
          totalCount: 0,
          totalRevenue: 0,
          transactions: [],
        });
      }
      const daily = dailyMap.get(date)!;
      daily.directCount++;
      daily.directRevenue += Number(sale.total);
      daily.transactions.push({ ...sale, type: 'direct' });
    });

    // Calculate totals for each day
    dailyMap.forEach(daily => {
      daily.totalCount = daily.onlineCount + daily.directCount;
      daily.totalRevenue = daily.onlineRevenue + daily.directRevenue;
      // Sort transactions by time
      daily.transactions.sort((a, b) => {
        const dateA = 'created_at' in a ? new Date(a.created_at) : new Date(a.sale_date);
        const dateB = 'created_at' in b ? new Date(b.created_at) : new Date(b.sale_date);
        return dateB.getTime() - dateA.getTime();
      });
    });

    // Convert to array and sort by date descending
    const dailyArray = Array.from(dailyMap.values()).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    setDailySales(dailyArray);
  };

  useEffect(() => {
    // Calculate summary whenever sales data changes
    const onlineRevenue = onlineSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const directRevenue = directSales.reduce((sum, sale) => sum + Number(sale.total), 0);

    setSummary({
      onlineCount: onlineSales.length,
      onlineRevenue,
      directCount: directSales.length,
      directRevenue,
      totalCount: onlineSales.length + directSales.length,
      totalRevenue: onlineRevenue + directRevenue,
    });

    // Calculate daily sales
    calculateDailySales();
  }, [onlineSales, directSales]);

  if (profile?.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">This feature is only available for sellers.</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Sales Report</h1>
            <p className="text-muted-foreground mt-1">Track online and direct store sales</p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'summary' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('summary')}
              >
                Summary
              </Button>
              <Button
                variant={viewMode === 'daily' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('daily')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Daily
              </Button>
            </div>
            <Button variant="ghost" onClick={() => navigate('/seller/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentFilter">Payment Method</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger id="paymentFilter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="pay_later">Pay Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Online Sales</p>
                  <p className="text-2xl font-semibold">{summary.onlineCount}</p>
                  <p className="text-sm text-muted-foreground truncate">{formatPrice(summary.onlineRevenue, DEFAULT_CURRENCY)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Direct Sales</p>
                  <p className="text-2xl font-semibold">{summary.directCount}</p>
                  <p className="text-sm text-muted-foreground truncate">{formatPrice(summary.directRevenue, DEFAULT_CURRENCY)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-semibold">{summary.totalCount}</p>
                  <p className="text-sm text-muted-foreground">Combined</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-semibold truncate">{formatPrice(summary.totalRevenue, DEFAULT_CURRENCY)}</p>
                  <p className="text-sm text-muted-foreground">Cumulative</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Data - Conditional Rendering based on View Mode */}
        {viewMode === 'summary' ? (
          /* Summary View - Existing Tabs */
          <Card>
            <CardHeader>
              <CardTitle>Sales Details</CardTitle>
              <CardDescription>View detailed sales transactions by category</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">All Sales</TabsTrigger>
                <TabsTrigger value="online">Online Sales</TabsTrigger>
                <TabsTrigger value="direct">Direct Sales</TabsTrigger>
              </TabsList>

              {/* All Sales Tab */}
              <TabsContent value="all" className="space-y-4">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : summary.totalCount === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sales data available</p>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            ...onlineSales.map(sale => ({ ...sale, type: 'online' as const })),
                            ...directSales.map(sale => ({ ...sale, type: 'direct' as const }))
                          ]
                            .sort((a, b) => {
                              const dateA = 'created_at' in a ? new Date(a.created_at) : new Date(a.sale_date);
                              const dateB = 'created_at' in b ? new Date(b.created_at) : new Date(b.sale_date);
                              return dateB.getTime() - dateA.getTime();
                            })
                            .map((sale, index) => (
                              <TableRow key={`${sale.type}-${sale.id}`}>
                                <TableCell>
                                  <Badge variant={sale.type === 'online' ? 'default' : 'secondary'}>
                                    {sale.type === 'online' ? 'Online' : 'Direct'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date('created_at' in sale ? sale.created_at : sale.sale_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {sale.type === 'online' 
                                    ? (sale as OnlineSale & { type: 'online' }).customer_name 
                                    : ((sale as DirectSale & { type: 'direct' }).customer_name || 'Walk-in')}
                                </TableCell>
                                <TableCell className="capitalize">
                                  {sale.type === 'online'
                                    ? (sale as OnlineSale & { type: 'online' }).payment_type
                                    : (sale as DirectSale & { type: 'direct' }).payment_method.replace('_', ' ')}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPrice(sale.type === 'online' 
                                    ? (sale as OnlineSale & { type: 'online' }).total_amount 
                                    : (sale as DirectSale & { type: 'direct' }).total, DEFAULT_CURRENCY)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Online Sales Tab */}
              <TabsContent value="online" className="space-y-4">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : onlineSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No online sales data</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {onlineSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.order_number}</TableCell>
                            <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{sale.customer_name}</TableCell>
                            <TableCell className="capitalize">{sale.payment_type}</TableCell>
                            <TableCell>
                              <Badge variant={sale.order_status === 'delivered' ? 'default' : 'secondary'}>
                                {sale.order_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPrice(sale.total_amount, DEFAULT_CURRENCY)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Direct Sales Tab */}
              <TabsContent value="direct" className="space-y-4">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : directSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No direct sales data</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {directSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                            <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                            <TableCell>{sale.customer_mobile || '-'}</TableCell>
                            <TableCell className="capitalize">{sale.payment_method.replace('_', ' ')}</TableCell>
                            <TableCell>{sale.items?.length || 0} items</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPrice(sale.total, DEFAULT_CURRENCY)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        ) : (
          /* Daily View - Date-wise Breakdown */
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-8">
                  <p className="text-center text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            ) : dailySales.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <p className="text-center text-muted-foreground">No sales data available</p>
                </CardContent>
              </Card>
            ) : (
              dailySales.map((daily) => (
                <Card key={daily.date}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{daily.date}</CardTitle>
                        <CardDescription>
                          {daily.totalCount} transactions • {formatPrice(daily.totalRevenue, DEFAULT_CURRENCY)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-muted-foreground">Online</p>
                          <p className="font-medium">{daily.onlineCount} • {formatPrice(daily.onlineRevenue, DEFAULT_CURRENCY)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Direct</p>
                          <p className="font-medium">{daily.directCount} • {formatPrice(daily.directRevenue, DEFAULT_CURRENCY)}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {daily.transactions.map((transaction) => (
                            <Collapsible key={transaction.id} asChild>
                              <>
                                <TableRow>
                                  <TableCell>
                                    <Badge variant={transaction.type === 'online' ? 'default' : 'secondary'}>
                                      {transaction.type === 'online' ? 'Online' : 'Direct'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {transaction.type === 'online'
                                      ? (transaction as OnlineSale & { type: 'online' }).customer_name
                                      : ((transaction as DirectSale & { type: 'direct' }).customer_name || 'Walk-in')}
                                  </TableCell>
                                  <TableCell className="capitalize">
                                    {transaction.type === 'online'
                                      ? (transaction as OnlineSale & { type: 'online' }).payment_type
                                      : (transaction as DirectSale & { type: 'direct' }).payment_method.replace('_', ' ')}
                                  </TableCell>
                                  <TableCell>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="gap-1">
                                        {transaction.type === 'online'
                                          ? (transaction as OnlineSale & { type: 'online' }).items?.length || 0
                                          : (transaction as DirectSale & { type: 'direct' }).items?.length || 0} items
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatPrice(
                                      transaction.type === 'online'
                                        ? (transaction as OnlineSale & { type: 'online' }).total_amount
                                        : (transaction as DirectSale & { type: 'direct' }).total,
                                      DEFAULT_CURRENCY
                                    )}
                                  </TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow>
                                    <TableCell colSpan={5} className="bg-muted/50">
                                      <div className="py-2 space-y-2">
                                        <p className="text-sm font-medium">Order Items:</p>
                                        <div className="space-y-1">
                                          {(transaction.type === 'online'
                                            ? (transaction as OnlineSale & { type: 'online' }).items
                                            : (transaction as DirectSale & { type: 'direct' }).items
                                          )?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                              <span>
                                                {item.product_name} × {item.quantity}
                                              </span>
                                              <span className="font-medium">
                                                {formatPrice(item.price * item.quantity, DEFAULT_CURRENCY)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </>
                            </Collapsible>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
