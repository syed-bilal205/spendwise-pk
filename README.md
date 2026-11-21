# SpendWise PK

A local-first personal expense tracker built with React, Tailwind CSS, Context API + `useReducer`, and Recharts.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to Netlify
Push this project to GitHub, import the repository in Netlify, and use:
- Build command: `npm run build`
- Publish directory: `dist`

The included `netlify.toml` already sets these values.

## Financial rules
- Credit-card purchases count as expenses.
- Card repayments are transfers and do not count as new spending.
- Refunds reduce net spending.
- Committee contributions are tracked separately from consumption spending.
- Data is stored in this browser's LocalStorage. Export a backup regularly.
- Do not enter card numbers, CVV, PINs, passwords, or other banking credentials.

## Learning order
1. `src/state/AppContext.jsx` — Context API and reducer.
2. `src/utils/finance.js` — financial calculations.
3. `src/components/TransactionForm.jsx` — controlled form state.
4. `src/App.jsx` — page composition and derived dashboard views.
