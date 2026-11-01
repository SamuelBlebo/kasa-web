import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';

const STEPS = [
  {
    title: 'Upload your products',
    body: 'Add your catalog once — photos, prices, stock — from the same dashboard you use every day.',
  },
  {
    title: 'Customers order on WhatsApp',
    body: 'They message your business number like they always have. OrderFlow answers, shows the menu, and takes the order.',
  },
  {
    title: 'You fulfill and get paid',
    body: 'Every order lands in your dashboard with the customer, address and total ready to go — no re-typing anything.',
  },
];

const FEATURES = [
  { title: 'Inventory management', body: 'Track stock, categories and low-stock alerts across every product.' },
  { title: 'Delivery tracking', body: 'Move orders through Preparing, Out for delivery and Delivered — customers get a WhatsApp update at every step.' },
  { title: 'Customer management', body: 'See order history, repeat customers and notes for every buyer, all tenant-isolated to your business.' },
  { title: 'Sales analytics', body: 'Daily, weekly and monthly charts for revenue, orders, average order value and your best sellers.' },
  { title: 'Broadcast promotions', body: 'Message your customer list about a sale or restock, straight from the dashboard.' },
  { title: 'Built for growth', body: 'Start free, upgrade as your order volume grows — no rebuilding required.' },
];

export function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            Your customers already message you. Let them order there too.
          </h1>
          <p className="mt-5 text-lg text-muted">
            OrderFlow turns your WhatsApp number into a full ordering system. Upload your products
            once — OrderFlow answers the chat, takes the order and keeps your stock in step. No
            website, no app, no sign-up for the customer.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <Button size="md">Get started free</Button>
            </Link>
            <Link to="/pricing">
              <Button variant="secondary" size="md">
                See pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Free plan included — 20 orders and 10 products a month, no card required.
          </p>
        </div>

        <Card className="mt-14 max-w-sm p-4 sm:p-5">
          <p className="text-xs font-semibold text-muted">A customer's chat</p>
          <div className="mt-3 space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2 text-sm text-white">
              Hi
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-raised px-3.5 py-2 text-sm text-ink">
              Welcome to Mama's Kitchen! Reply: 1 Shop · 2 Track Order · 3 Contact Seller
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2 text-sm text-white">
              1
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-raised px-3.5 py-2 text-sm text-ink">
              Here's today's menu — reply with a number to add it to your order.
            </div>
          </div>
        </Card>
      </section>

      <section className="border-y border-line bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Everything you need to sell on WhatsApp</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-5">
              <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-brand">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Set up your shop in minutes.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/80">
            Create your account, add your first products and connect WhatsApp — free to start.
          </p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button variant="secondary" size="md">
              Get started free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
