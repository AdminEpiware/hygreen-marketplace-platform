import { useState } from 'react';
import { Header } from '@/components/layouts/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { HelpCircle, MessageSquare, Search } from 'lucide-react';
import type { IssueType } from '@/types/types';

const FAQ_ITEMS = [
  {
    category: 'Account',
    questions: [
      {
        question: 'How do I create an account?',
        answer: 'Click on the "Sign Up" button in the header, choose your role (Buyer or Seller), fill in your details including email, password, full name, mobile number, address, and country. Agree to the terms and click "Create Account".',
      },
      {
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page, enter your registered email, and follow the OTP verification process to set a new password.',
      },
      {
        question: 'Can I change my profile information?',
        answer: 'Yes, go to Settings from your dashboard to update your profile details, including name, mobile number, address, country, and profile photo.',
      },
    ],
  },
  {
    category: 'Orders & Cart',
    questions: [
      {
        question: 'How do I place an order?',
        answer: 'Browse products, add items to your cart, go to Cart, review items, proceed to Checkout, enter delivery address, select payment method, and confirm your order.',
      },
      {
        question: 'Can I manage multiple stores as a buyer?',
        answer: 'Yes! Buyers can create and manage multiple stores with separate delivery addresses, carts, and order histories. Switch between stores using the dropdown in the header.',
      },
      {
        question: 'How do I track my order?',
        answer: 'Go to your Buyer Dashboard to view all orders for your active store. You can see order status, items, and payment details.',
      },
    ],
  },
  {
    category: 'Payments',
    questions: [
      {
        question: 'What payment methods are supported?',
        answer: 'We support Cash on Delivery, Pay Later (for approved stores), and Online Payment via Stripe.',
      },
      {
        question: 'How does Pay Later work?',
        answer: 'Pay Later is available for approved buyer stores. Each store has a separate Pay Later account with credit limits and due dates.',
      },
      {
        question: 'Can I get a refund?',
        answer: 'Refund policies depend on the seller and product. Contact support through the Help Center to raise a refund request.',
      },
    ],
  },
  {
    category: 'Sellers',
    questions: [
      {
        question: 'How do I become a seller?',
        answer: 'Sign up with the Seller role, complete your profile, and wait for admin verification. You may need to upload Aadhaar (individual) or Company ID (business).',
      },
      {
        question: 'How do I add products?',
        answer: 'After verification, go to your Seller Dashboard, click "Add Product", fill in product details, upload images, set pricing, and save.',
      },
      {
        question: 'Can I manage multiple stores as a seller?',
        answer: 'Yes, sellers can manage products, stock, orders, and finances for their assigned stores.',
      },
    ],
  },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketForm, setTicketForm] = useState({
    issue_type: '' as IssueType | '',
    subject: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { user, profile, activeStore } = useAuth();

  const filteredFAQs = FAQ_ITEMS.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error('Please sign in to submit a support ticket');
      return;
    }

    if (!ticketForm.issue_type) {
      toast.error('Please select an issue type');
      return;
    }

    setSubmitting(true);

    try {
      const ticketData: any = {
        user_id: user.id,
        user_role: profile.role,
        issue_type: ticketForm.issue_type,
        subject: ticketForm.subject,
        description: ticketForm.description,
        status: 'open',
      };

      // Add store context for buyers
      if (profile.role === 'buyer' && activeStore) {
        ticketData.buyer_store_id = activeStore.id;
      }

      const { error } = await supabase.from('support_tickets').insert(ticketData);

      if (error) throw error;

      toast.success('Support ticket submitted successfully!');
      setTicketForm({ issue_type: '', subject: '', description: '' });
    } catch (error) {
      console.error('Ticket submission error:', error);
      toast.error('Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-semibold">Help Center</h1>
          <p className="text-muted-foreground">Find answers to common questions or submit a support ticket</p>
        </div>

        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="support">
              <MessageSquare className="h-4 w-4 mr-2" />
              Submit Ticket
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Search for answers to common questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredFAQs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No FAQs found matching your search</p>
                ) : (
                  <div className="space-y-6">
                    {filteredFAQs.map((category, idx) => (
                      <div key={idx} className="space-y-2">
                        <h3 className="font-semibold text-lg">{category.category}</h3>
                        <Accordion type="single" collapsible className="w-full">
                          {category.questions.map((item, qIdx) => (
                            <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                              <AccordionContent className="text-muted-foreground">
                                {item.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Support Ticket</CardTitle>
                <CardDescription>
                  {user ? 'Describe your issue and our team will get back to you' : 'Please sign in to submit a support ticket'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">You need to be signed in to submit a support ticket</p>
                    <Button onClick={() => window.location.href = '/login'}>Sign In</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue_type">Issue Type</Label>
                      <Select
                        value={ticketForm.issue_type}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, issue_type: value as IssueType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account">Account Issue</SelectItem>
                          <SelectItem value="payment">Payment Issue</SelectItem>
                          <SelectItem value="order">Order Issue</SelectItem>
                          <SelectItem value="product">Product Issue</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {profile?.role === 'buyer' && activeStore && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                          Ticket will be associated with: <span className="font-medium text-foreground">{activeStore.store_name}</span>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Provide detailed information about your issue"
                        rows={6}
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
