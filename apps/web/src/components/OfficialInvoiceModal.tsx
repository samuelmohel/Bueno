'use client';

import React from 'react';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
  onRecordPayment?: () => void;
}

export default function OfficialInvoiceModal({ invoice, onClose, onRecordPayment }: InvoiceModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const csvRows = [
      ['BUENO LOGISTICS LIMITED - FREIGHT INVOICE & SETTLEMENT'],
      ['Invoice Number', invoice.invoiceNumber || invoice.id],
      ['Date of Issue', invoice.issueDate || '24 Aug 2026'],
      ['Due Date', invoice.dueDate || '07 Sep 2026'],
      ['Consignee Company', invoice.companyName],
      ['Consignee Email', invoice.clientEmail || 'N/A'],
      ['Trip Reference', invoice.tripId || 'N/A'],
      ['Deal Reference', invoice.dealId || 'N/A'],
      ['Corridor Route', invoice.route || 'Ewekoro ➔ Moniya Siding'],
      ['Cargo Description', invoice.cargoType || 'Industrial Freight'],
      ['Total Volume', `${Number(invoice.totalBags || 0).toLocaleString()} Bags / ${Number(invoice.totalTonnes || 0).toLocaleString()} MT`],
      [],
      ['LINE ITEM DESCRIPTION', 'QTY / METRIC', 'UNIT RATE (NGN)', 'TOTAL AMOUNT (NGN)'],
      [
        `Heavy Rail Freight Tariff (${invoice.route})`,
        `${Number(invoice.totalTonnes || 0).toLocaleString()} MT`,
        Number(invoice.ratePerTonne || 160000).toLocaleString(),
        Number(invoice.subtotal || 0).toLocaleString()
      ],
    ];

    if (Number(invoice.damageUnits || 0) > 0) {
      csvRows.push([
        `LESS: Transit Damage & Burst Bag Indemnity Deduction`,
        `-${invoice.damageUnits} Burst Bags`,
        '8,000 / Bag',
        `-${Number(invoice.damageDeduction || 0).toLocaleString()}`
      ]);
    }

    csvRows.push(
      [],
      ['Gross Subtotal', '', '', Number(invoice.subtotal || 0).toLocaleString()],
      ['Damage Indemnity Deduction', '', '', `-${Number(invoice.damageDeduction || 0).toLocaleString()}`],
      ['Net Total Payable', '', '', Number(invoice.totalAmount || 0).toLocaleString()],
      ['Total Remitted / Paid', '', '', Number(invoice.amountPaid || 0).toLocaleString()],
      ['Outstanding Balance Due', '', '', Number(invoice.balance || 0).toLocaleString()],
      ['Status', invoice.status || 'ISSUED']
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Invoice_${invoice.invoiceNumber || invoice.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSettled = invoice.status === 'SETTLED' || Number(invoice.balance || 0) <= 0;
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID' || (Number(invoice.amountPaid || 0) > 0 && Number(invoice.balance || 0) > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl mx-auto border border-slate-200 shadow-2xl overflow-hidden font-sans my-auto">
        {/* Printable Action Bar */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#62BC37]/20 text-[#62BC37] flex items-center justify-center font-black text-lg">
              🧾
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">
                  COMMERCIAL FREIGHT INVOICE & DEBIT NOTE
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    isSettled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isPartiallyPaid
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {invoice.status || 'ISSUED'}
                </span>
              </div>
              <h3 className="text-sm font-black text-white">
                Invoice #{invoice.invoiceNumber || invoice.id} — {invoice.companyName}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRecordPayment && !isSettled && (
              <button
                onClick={onRecordPayment}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
              >
                + Record Payment
              </button>
            )}
            <button
              onClick={handleDownloadCsv}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
            >
              Export CSV 📊
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all"
            >
              Print Official PDF 🖨️
            </button>
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-3 py-2 text-xs rounded-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── OFFICIAL PRINTABLE DOCUMENT CANVAS ─── */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white space-y-8 print:p-6 print:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-[#62BC37] flex items-center justify-center p-3 shadow-md">
                <svg viewBox="0 0 100 100" className="w-full h-full text-white" fill="currentColor">
                  <path d="M15 75 L85 75 L80 82 L20 82 Z" />
                  <path d="M25 65 L75 65 L70 70 L30 70 Z" />
                  <rect x="25" y="28" width="50" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <circle cx="38" cy="44" r="5" />
                  <circle cx="62" cy="44" r="5" />
                  <path d="M50 18 L50 28" stroke="#62BC37" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                  BUENO LOGISTICS LIMITED
                </h1>
                <p className="text-xs font-bold text-[#62BC37] uppercase tracking-wider mt-1">
                  Commercial Heavy Rail & Multimodal Freight Operations
                </p>
                <p className="text-[11px] text-slate-500 leading-snug mt-1">
                  Moniya Freight Terminal, Ibadan • Apapa Port Terminal • Ewekoro Siding
                  <br />
                  RC: 1892014 | TIN: 24109822-0001 | finance@bueno.ng | +234 (0) 1 800 BUENO
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono">
              <span className="text-[11px] uppercase tracking-widest font-black text-slate-400 block">
                COMMERCIAL TAX INVOICE
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {invoice.invoiceNumber || invoice.id}
              </h2>
              <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                <p><strong className="text-slate-900">Issue Date:</strong> {invoice.issueDate || '24 Aug 2026'}</p>
                <p><strong className="text-slate-900">Due Date:</strong> {invoice.dueDate || '07 Sep 2026'}</p>
                <p><strong className="text-slate-900">Corridor Trip ID:</strong> {invoice.tripId || 'TRP-101'}</p>
                <p><strong className="text-slate-900">Deal Ref:</strong> {invoice.dealId || 'DEAL-88210'}</p>
              </div>
            </div>
          </div>

          {/* Consignee & Route Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider mb-1">
                BILLED TO (INDUSTRIAL CONSIGNEE):
              </span>
              <h3 className="text-base font-black text-slate-900">{invoice.companyName}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Email: {invoice.clientEmail || 'logistics@client.ng'}
              </p>
              <p className="text-xs text-slate-600">
                Payment Terms: <span className="font-bold text-slate-800">Net 14 Days (Bank Wire Transfer)</span>
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider mb-1">
                FREIGHT CORRIDOR & DISPATCH DETAILS:
              </span>
              <p className="text-xs text-slate-800">
                <strong>Rail Corridor:</strong> {invoice.route || 'Ewekoro ➔ Moniya Siding'}
              </p>
              <p className="text-xs text-slate-800 mt-0.5">
                <strong>Consignment Cargo:</strong> {invoice.cargoType || 'Bagged Cement (50kg)'}
              </p>
              <p className="text-xs text-slate-800 mt-0.5">
                <strong>Manifest Tonnage:</strong> {Number(invoice.totalTonnes || 0).toLocaleString()} MT ({Number(invoice.totalBags || 0).toLocaleString()} Units)
              </p>
            </div>
          </div>

          {/* Itemized Billing Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-mono uppercase text-slate-500">
                  <th className="py-3 px-2">Description of Freight Haulage Services</th>
                  <th className="py-3 px-2 text-center">Billed Quantity</th>
                  <th className="py-3 px-2 text-right">Tariff Rate</th>
                  <th className="py-3 px-2 text-right">Line Total (NGN)</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-2">
                    <p className="font-sans font-bold text-slate-900 text-sm">
                      Standard Gauge Heavy Rail Freight Haulage
                    </p>
                    <p className="text-slate-500 font-sans text-xs mt-0.5">
                      Corridor transit: {invoice.route} • Dedicated hopper consist • Full track access & locomotive traction
                    </p>
                  </td>
                  <td className="py-4 px-2 text-center font-bold text-slate-700">
                    {Number(invoice.totalTonnes || 0).toLocaleString()} MT
                    <span className="block text-[10px] text-slate-400 font-normal">
                      ({Number(invoice.totalBags || 0).toLocaleString()} Bags)
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right font-bold text-slate-700">
                    ₦{Number(invoice.ratePerTonne || 160000).toLocaleString()}
                    <span className="block text-[10px] text-slate-400 font-normal">/ MT</span>
                  </td>
                  <td className="py-4 px-2 text-right font-black text-slate-900 text-sm">
                    ₦{Number(invoice.subtotal || 0).toLocaleString()}
                  </td>
                </tr>

                {/* Burst Bag / Damage Deductions Line (Debit Note) */}
                {Number(invoice.damageUnits || 0) > 0 ? (
                  <tr className="bg-rose-50/70 border-l-4 border-l-rose-500">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                          DEBIT NOTE DEDUCTION
                        </span>
                        <p className="font-sans font-black text-rose-900 text-sm">
                          Less: Siding Offload Transit Damage & Burst Bags Indemnity
                        </p>
                      </div>
                      <p className="text-rose-700 font-sans text-xs mt-1">
                        Discrepancy logged at Moniya yard discharge: {invoice.damageUnits} burst bags @ ₦8,000/bag agreed claim deduction.
                        {invoice.damageDetails && invoice.damageDetails[0]?.notes && (
                          <span className="block italic mt-0.5 text-[11px] text-rose-600">
                            Inspection Notes: &quot;{invoice.damageDetails[0].notes}&quot;
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="py-4 px-2 text-center font-bold text-rose-800">
                      -{Number(invoice.damageUnits || 0)} Bags
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-rose-800">
                      -₦8,000 / Bag
                    </td>
                    <td className="py-4 px-2 text-right font-black text-rose-700 text-sm">
                      -₦{Number(invoice.damageDeduction || 0).toLocaleString()}
                    </td>
                  </tr>
                ) : (
                  <tr className="bg-emerald-50/50">
                    <td colSpan={4} className="py-2.5 px-3 text-emerald-800 font-sans text-xs font-bold flex items-center gap-2">
                      <span>✓</span> Zero Transit Loss / Spillage Reported — 100% Intact Consignment Discharge Verified
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Reconciliation Box */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-200 gap-6">
            {/* Bank Wire Payment Instructions */}
            <div className="w-full sm:w-1/2 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider mb-2">
                BANK REMITTANCE DETAILS (DIRECT DEPOSIT / WIRE)
              </span>
              <div className="space-y-1 font-mono text-slate-700">
                <p><strong>Bank:</strong> Guaranty Trust Bank (GTBank) PLC</p>
                <p><strong>Account Name:</strong> Bueno Logistics Limited</p>
                <p><strong>Account No:</strong> <span className="font-black text-slate-900 text-sm">0882190341</span></p>
                <p><strong>Sort Code:</strong> 058-152062 | Commercial Freight Division</p>
                <p className="mt-2 text-slate-500 font-sans text-[11px]">
                  Alternate Bank: <strong>Zenith Bank PLC</strong> (Acct: 1229044810)
                </p>
                <p className="text-amber-700 font-sans font-bold text-[11px] mt-1">
                  ⚠️ Note: Quote <strong>{invoice.invoiceNumber || invoice.id}</strong> in wire transfer narration.
                </p>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="w-full sm:w-1/2 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-600 pb-1">
                <span>Gross Commercial Freight Tariff:</span>
                <span className="font-bold text-slate-900">₦{Number(invoice.subtotal || 0).toLocaleString()}</span>
              </div>
              {Number(invoice.damageUnits || 0) > 0 && (
                <div className="flex justify-between text-rose-700 font-bold pb-1">
                  <span>Less: Siding Transit Damage Claim:</span>
                  <span>-₦{Number(invoice.damageDeduction || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-[11px] pb-1">
                <span>Value Added Tax (VAT 0% - Interstate Rail Transit):</span>
                <span>₦0.00</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t-2 border-slate-900">
                <span>NET PAYABLE FREIGHT SETTLEMENT:</span>
                <span>₦{Number(invoice.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold pt-1">
                <span>Total Amount Remitted to Date:</span>
                <span>-₦{Number(invoice.amountPaid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-base pt-2 border-t border-slate-300 bg-slate-50 p-2 rounded-xl">
                <span>OUTSTANDING BALANCE DUE:</span>
                <span className={Number(invoice.balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  ₦{Number(invoice.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Remittance History */}
          {Array.isArray(invoice.paymentHistory) && invoice.paymentHistory.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-2">
                VERIFIED PAYMENT REMITTANCE AUDIT TRAIL
              </span>
              <div className="space-y-1.5 font-mono text-xs">
                {invoice.paymentHistory.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900">{p.type}</span>
                      <span className="text-slate-400 text-[10px] ml-2 font-mono">Ref: {p.ref}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-700">₦{Number(p.amount || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{p.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures and QR Audit Block */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {/* QR Stamp */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-slate-900 text-white p-1 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-full h-full text-white" fill="currentColor">
                  <rect x="2" y="2" width="10" height="10" />
                  <rect x="4" y="4" width="6" height="6" fill="#0f172a" />
                  <rect x="5" y="5" width="4" height="4" fill="white" />
                  <rect x="28" y="2" width="10" height="10" />
                  <rect x="30" y="4" width="6" height="6" fill="#0f172a" />
                  <rect x="31" y="5" width="4" height="4" fill="white" />
                  <rect x="2" y="28" width="10" height="10" />
                  <rect x="4" y="30" width="6" height="6" fill="#0f172a" />
                  <rect x="5" y="31" width="4" height="4" fill="white" />
                  <rect x="16" y="4" width="8" height="4" />
                  <rect x="16" y="16" width="8" height="8" />
                  <rect x="28" y="16" width="4" height="8" />
                  <rect x="4" y="16" width="8" height="4" />
                  <rect x="16" y="28" width="8" height="4" />
                  <rect x="28" y="28" width="8" height="8" />
                </svg>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                <span className="font-bold text-[#62BC37] block">BUENO VERIFIED ERP AUDIT</span>
                <span>SHA-256: 8a91f..0e4</span>
                <span className="block text-slate-400">Official Electronic Record</span>
              </div>
            </div>

            {/* Signature 1 */}
            <div className="text-center sm:text-left font-sans text-xs">
              <div className="border-b border-slate-300 pb-1 mb-1 font-mono italic text-slate-600 font-bold">
                Chinenye Nnamdi (Chartered Accountant)
              </div>
              <p className="font-black text-slate-900">Head of Finance & Treasury</p>
              <p className="text-[10px] text-slate-400">Bueno Logistics Ltd • HQ</p>
            </div>

            {/* Signature 2 */}
            <div className="text-center sm:text-right font-sans text-xs">
              <div className="border-b border-slate-300 pb-1 mb-1 font-mono italic text-slate-600 font-bold">
                Babajide Sanwo (Rail Dispatch)
              </div>
              <p className="font-black text-slate-900">Head of Operations & Logistics</p>
              <p className="text-[10px] text-slate-400">NRC Corridor Operations Unit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
