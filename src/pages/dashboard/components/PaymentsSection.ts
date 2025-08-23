import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Download } from 'lucide-react';
const PaymentsSection = ({ lastInvoiceDate, lastInvoiceAmount, invoiceList = [], projectBillingDetails = [] }) => {
    const formattedDate = lastInvoiceDate ? new Date(lastInvoiceDate).toLocaleDateString() : 'N/A';
    return (_jsxs("div", { className: "payments-section", children: [_jsx("h2", { children: "Payments & Invoices" }), _jsxs("div", { className: "payments-line-one", children: [_jsx("span", { className: "last-invoice-label", children: "Last Invoice:" }), _jsxs("span", { className: "last-invoice-value", children: [formattedDate, " - ", lastInvoiceAmount || ''] })] }), _jsx("div", { className: "invoice-list", children: invoiceList.length > 0 ? (invoiceList.map((inv, idx) => (_jsx("div", { className: "invoice-item", children: _jsxs("a", { href: inv.url, download: true, children: [_jsx(Download, { size: 16 }), " ", inv.fileName || `Invoice ${idx + 1}`] }) }, idx)))) : (_jsx("span", { children: "No invoices" })) }), _jsxs("div", { className: "future-payment-method", children: ["Add payment method ", _jsx("span", { className: "coming-soon-badge", children: "coming soon" })] })] }));
};
export default PaymentsSection;
