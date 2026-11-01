import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/utils/cn';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Do my customers need to install anything?',
    answer:
      "No. They message your existing WhatsApp Business number the way they always have. OrderFlow answers on your behalf, shows the menu and takes the order — there's no app to download and nothing for them to sign up for.",
  },
  {
    question: 'Do I need a Meta WhatsApp Business API account?',
    answer:
      'Yes — OrderFlow connects to your WhatsApp number through the official Meta WhatsApp Cloud API, so your account stays in good standing with Meta. Once your account is set up, connecting it to OrderFlow takes a few minutes from Settings.',
  },
  {
    question: "What happens if I go over my plan's order limit?",
    answer:
      "We'll let you know from the dashboard as you approach your limit. Orders already placed are never blocked — you can upgrade at any time from Settings and the new limit applies immediately.",
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes, at any time from Settings. Downgrading to Free applies immediately; moving to a paid plan takes you to a secure Paystack checkout, and the new plan applies as soon as payment goes through.',
  },
  {
    question: 'Is my business data shared with other merchants?',
    answer:
      'No. Every business on OrderFlow is fully isolated — your products, orders and customers are only ever visible to your own team.',
  },
  {
    question: 'What currency am I billed in?',
    answer:
      "We detect your market automatically when you sign up and price your plan accordingly (see Pricing) — no flat USD rate converted on the fly. That same currency is also what you sell to your own customers in. If we ever get your market wrong, contact support and we'll fix it.",
  },
  {
    question: 'Which countries is OrderFlow available in?',
    answer:
      "OrderFlow is built for shops across Ghana and West Africa, and works anywhere Meta's WhatsApp Cloud API is available.",
  },
];

export function FaqPage() {
  usePageTitle('FAQ');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Frequently asked questions</h1>

      <div className="mt-8 divide-y divide-line border-y border-line">
        {FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span className="text-sm font-semibold text-ink">{faq.question}</span>
                <span aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-45')}>
                  +
                </span>
              </button>
              {open && <p className="pb-4 text-sm text-muted">{faq.answer}</p>}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-muted">
        Still have a question?{' '}
        <Link to="/help" className="font-semibold text-brand">
          Visit the Help Center
        </Link>
        .
      </p>
    </div>
  );
}
