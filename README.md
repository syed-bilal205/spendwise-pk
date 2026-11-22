# SpendWise PK

A cloud-backed personal finance tracker for income, expenses, budgets, debts, and committee contributions. Built with React, Vite, Tailwind CSS, Context API + useReducer, Recharts, and jsPDF.

## Features
- Monthly salary and other income records with history.
- Expense tracking by date, merchant, category, and planned/unplanned status.
- Credit-card activity: purchases, refunds, repayments, and fees.
- Monthly budget and small-purchase threshold settings.
- Dashboard with income-vs-expense trends, category breakdown, cash flow, and budget progress.
- Debt tracking in both directions: money you owe and money owed to you, including partial payments and outstanding-balance charts.
- Committee contributions tracked separately.
- Export a monthly financial report as PDF.
- Restore an existing JSON backup from an earlier version.

## Supabase setup

The app uses the dedicated Supabase project `SpendWise` for authentication and cloud records. Configure these Vite environment variables locally and in Netlify (Site configuration → Environment variables):

- `VITE_SUPABASE_URL=https://umvlozdoztgzfjctrcim.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = the project's publishable key from Supabase → Project Settings → API Keys

Use the publishable key only; never put a `service_role` or secret key in frontend variables. Supabase Auth uses email/password. To allow sign-up without email verification, open Supabase Dashboard → Authentication → Sign In / Providers → Email and switch off **Confirm email**. This is a project-level Auth setting, not a frontend code setting.

On the first sign-in, existing `spendwise-pk-v1` browser data is imported to your account if its cloud tables are empty. The old browser copy is kept until the import succeeds. After migration, the app reads and writes financial records in Supabase; it no longer continuously stores the app state in LocalStorage. Export PDF and restore JSON backup remain available.

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to Netlify
- Build command: `npm run build`
- Publish directory: `dist`

The included `netlify.toml` configures these values.

## Financial rules
- Card purchases, interest, and fees count as expenses.
- Card repayments are not counted as new spending.
- Refunds reduce net spending.
- Salary and other income are recorded separately from expenses.
- Debt repayments reduce outstanding debt and are included in cash-flow reporting, not purchase spending.
- Committee contributions are tracked separately from consumption spending.
- Existing debt records without a direction are preserved as money you owe.
- Financial records are stored in Supabase Postgres with per-user Row Level Security. PDF is a readable report, not a restorable backup. JSON backup restore remains available.
- Never enter card numbers, CVV, PINs, passwords, or banking credentials.

## Main code areas
1. `src/state/AppContext.jsx` — app state, persistence, and reducer.
2. `src/utils/finance.js` — financial calculations.
3. `src/utils/pdfReport.js` — PDF report generation.
4. `src/components/Income.jsx` — salary and other income.
5. `src/components/Debt.jsx` — payable and receivable debt records.
6. `src/App.jsx` — dashboard, graphs, and navigation.


## AI Debt Coach setup
The AI Coach runs through a Netlify serverless function. The OpenAI API key stays on the server and is never placed in the browser bundle.

1. Create an API key in the OpenAI API platform.
2. In Netlify, open **Site configuration → Environment variables**.
3. Add `OPENAI_API_KEY` with your secret key and `DEBT_COACH_ACCESS_CODE` with a long, private access code. Optionally add `OPENAI_MODEL` to choose a model; the default is `gpt-5.5`.
4. Redeploy the site. The AI Coach page will then be able to answer questions using a summary of your current tracker data.

For local development, use Netlify Dev (`npx netlify dev`) and set both `OPENAI_API_KEY` and `DEBT_COACH_ACCESS_CODE` in a local `.env` file that is never committed. Do not put the key in a `VITE_*` variable or frontend code.

The AI receives your question, recent chat messages, and a limited financial snapshot. Creditor names and private debt notes from tracker records are excluded from the automatic snapshot; anything typed into the chat is sent to the AI service. The coach does not access bank/card accounts or make payments. AI requests may incur OpenAI API charges; check your API billing and usage limits. Verify any recommendation against your actual due dates, interest rates, and essential living costs.
