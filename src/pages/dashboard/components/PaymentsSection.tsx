import React from 'react';
import { Download } from 'lucide-react';

// Light types to keep the compiler happy without over-specifying shapes
type Project = any;
type TimelineMode = any;
type QuickLinksRef = any;

const PaymentsSection = ({ lastInvoiceDate, lastInvoiceAmount, invoiceList = [], projectBillingDetails = [] }: {
    lastInvoiceDate: string | null;
    lastInvoiceAmount: string | null;
    invoiceList: { url: string; fileName?: string }[];
    projectBillingDetails: any[];
}) => {
    const formattedDate = lastInvoiceDate ? new Date(lastInvoiceDate).toLocaleDateString() : 'N/A';
    return (
        <div className="payments-section">
            <h2>Payments &amp; Invoices</h2>
            <div className="payments-line-one">
                <span className="last-invoice-label">Last Invoice:</span>
                <span className="last-invoice-value">
                    {formattedDate} - {lastInvoiceAmount || ''}
                </span>
            </div>
            <div className="invoice-list">
                {invoiceList.length > 0 ? (
                    invoiceList.map((inv, idx) => (
                        <div className="invoice-item" key={idx}>
                            <a href={inv.url} download>
                                <Download size={16} /> {inv.fileName || `Invoice ${idx + 1}`}
                            </a>
                        </div>
                    ))
                ) : (
                    <span>No invoices</span>
                )}
            </div>
            <div className="future-payment-method">
                Add payment method <span className="coming-soon-badge">coming soon</span>
            </div>
        </div>
    );
};

export default PaymentsSection;
