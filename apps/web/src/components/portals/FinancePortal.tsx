'use client';

import { useState } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

export function FinancePortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black tracking-wider">BUENO FREIGHT OS — FINANCIAL CONTROL HQ</h1>
          <p className="text-xs text-slate-400">Head of Finance / Chief Accountant: {user.fullName}</p>
        </div>
        <button onClick={onSignOut} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
          Sign Out
        </button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Financial Control</span>
          <h2 className="text-2xl font-black text-slate-900">Commercial Invoicing & Station Expense Disbursement</h2>
          <p className="text-xs text-slate-600">Review CEO-cleared requisitions, disburse operational funds, and monitor corridor freight revenue ledgers.</p>
        </div>
      </main>
    </div>
  );
}
