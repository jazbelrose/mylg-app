import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, } from "react";
import Modal from "../../../../components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faDownload, faChevronLeft, faChevronRight, faSave, faTrash, faPen, } from "@fortawesome/free-solid-svg-icons";
import { saveAs } from "file-saver";
import { uploadData, list } from "aws-amplify/storage";
import { updateUserProfile, S3_PUBLIC_BASE, DELETE_FILE_FROM_S3_URL, apiFetch, } from "../../../../utils/api";
import { v4 as uuid } from "uuid";
import { useData } from "../../../../app/contexts/DataProvider";
import { slugify } from "../../../../utils/slug";
import ConfirmModal from "../../../../components/ConfirmModal";
import { toast } from "react-toastify";
import styles from "./InvoicePreviewModal.module.css";
import useModalStack from "../../../../utils/useModalStack";
import useBudgetData from "./useBudgetData";
const formatCurrency = (val) => {
    const num = typeof val === "number"
        ? val
        : parseFloat(String(val).replace(/[$,]/g, ""));
    if (isNaN(num))
        return val || "";
    return num.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
if (typeof document !== "undefined") {
    Modal.setAppElement("#root");
}
const groupFields = [
    { label: "Invoice Group", value: "invoiceGroup" },
    { label: "Area Group", value: "areaGroup" },
    { label: "Category", value: "category" },
];
const InvoicePreviewModal = ({ isOpen, onRequestClose, revision, project, showSidebar = true, allowSave = true, }) => {
    const [items, setItems] = useState([]);
    const [groupField, setGroupField] = useState("invoiceGroup");
    const [groupValues, setGroupValues] = useState([]);
    const invoiceRef = useRef(null);
    const previewRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [pages, setPages] = useState([]);
    const [selectedPages, setSelectedPages] = useState([]);
    const currentRows = pages[currentPage] || [];
    const { userData, setUserData } = useData();
    const { budgetItems } = useBudgetData(project?.projectId);
    const [logoDataUrl, setLogoDataUrl] = useState(null);
    const [brandName, setBrandName] = useState("");
    const [brandAddress, setBrandAddress] = useState("");
    const [brandPhone, setBrandPhone] = useState("");
    const [brandTagline, setBrandTagline] = useState("");
    const [brandLogoUrl, setBrandLogoUrl] = useState("");
    const [useProjectAddress, setUseProjectAddress] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [invoiceDirty, setInvoiceDirty] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState("0000");
    const [issueDate, setIssueDate] = useState(() => new Date().toLocaleDateString());
    const [dueDate, setDueDate] = useState("");
    const [serviceDate, setServiceDate] = useState("");
    const [projectTitle, setProjectTitle] = useState(project?.title || "Project Title");
    const [customerSummary, setCustomerSummary] = useState("Customer");
    const [invoiceSummary, setInvoiceSummary] = useState("Invoice Details");
    const [paymentSummary, setPaymentSummary] = useState("Payment");
    const [notes, setNotes] = useState("Notes...");
    const [depositReceived, setDepositReceived] = useState(0);
    const [totalDue, setTotalDue] = useState(0);
    const [savedInvoices, setSavedInvoices] = useState([]);
    const [selectedInvoices, setSelectedInvoices] = useState(new Set());
    const [currentFileName, setCurrentFileName] = useState('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const fileInputRef = useRef(null);
    const handleLogoSelect = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setLogoDataUrl(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handleLogoDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setLogoDataUrl(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const fetchInvoiceFiles = async () => {
        if (!project?.projectId)
            return [];
        const prefix = `projects/${project.projectId}/invoices/`;
        try {
            const res = await list({ prefix, options: { accessLevel: 'public' } });
            return (res.items || [])
                .filter((item) => item.key && !item.key.endsWith("/"))
                .map((item) => ({
                name: item.key.split("/").pop(),
                url: `${S3_PUBLIC_BASE}/${item.key}`,
            }));
        }
        catch (err) {
            console.error("Failed to list invoice files", err);
            return [];
        }
    };
    const toggleInvoiceSelect = (url) => {
        setSelectedInvoices((prev) => {
            const set = new Set(prev);
            if (set.has(url))
                set.delete(url);
            else
                set.add(url);
            return set;
        });
    };
    const selectAllInvoices = (checked) => {
        if (checked) {
            setSelectedInvoices(new Set(savedInvoices.map((i) => i.url)));
        }
        else {
            setSelectedInvoices(new Set());
        }
    };
    const performDeleteInvoices = async () => {
        const fileUrls = Array.from(selectedInvoices);
        if (fileUrls.length === 0)
            return;
        setIsConfirmingDelete(false);
        const toastId = toast.loading("Deleting invoices...");
        try {
            await apiFetch(DELETE_FILE_FROM_S3_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: project.projectId,
                    field: "invoices",
                    fileKeys: fileUrls,
                }),
            });
            setSavedInvoices((prev) => prev.filter((inv) => !fileUrls.includes(inv.url)));
            setSelectedInvoices(new Set());
            toast.update(toastId, {
                render: "Invoices deleted.",
                type: "success",
                isLoading: false,
                autoClose: 3000,
            });
        }
        catch (err) {
            console.error("Failed to delete invoices", err);
            toast.update(toastId, {
                render: "Failed to delete invoices.",
                type: "error",
                isLoading: false,
                autoClose: 3000,
            });
        }
    };
    const loadInvoice = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok)
                throw new Error('Failed to fetch');
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const page = doc.querySelector('.invoice-page');
            if (!page)
                return;
            setBrandLogoUrl(page.querySelector('.invoice-header img')?.getAttribute('src') || '');
            setLogoDataUrl(null);
            setBrandName(page.querySelector('.brand-name')?.textContent || '');
            setBrandAddress(page.querySelector('.brand-address')?.textContent || '');
            setBrandPhone(page.querySelector('.brand-phone')?.textContent || '');
            setBrandTagline(page.querySelector('.brand-tagline')?.textContent || '');
            const infoSpans = page.querySelectorAll('.billing-info > div:last-child span');
            setInvoiceNumber(infoSpans[0]?.textContent || '');
            setIssueDate(infoSpans[1]?.textContent || '');
            setDueDate(infoSpans[2]?.textContent || '');
            setServiceDate(infoSpans[3]?.textContent || '');
            setProjectTitle(page.querySelector('.project-title')?.textContent || '');
            const summaryDivs = page.querySelectorAll('.summary > div');
            setCustomerSummary(summaryDivs[0]?.textContent || '');
            setInvoiceSummary(summaryDivs[1]?.textContent || '');
            setPaymentSummary(summaryDivs[2]?.textContent || '');
            const totals = page.querySelectorAll('.totals span');
            const parseMoney = (v) => parseFloat(String(v || '').replace(/[$,]/g, '')) || 0;
            if (totals.length >= 3) {
                setDepositReceived(parseMoney(totals[1].textContent));
                setTotalDue(parseMoney(totals[2].textContent));
            }
            const notesEl = page.querySelector('.notes');
            if (notesEl)
                setNotes(notesEl.textContent);
            const parsedGroups = Array.from(doc.querySelectorAll('.group-header td')).map((td) => td.textContent.trim());
            if (parsedGroups.length) {
                const candidate = groupFields
                    .map((g) => g.value)
                    .find((field) => {
                    const opts = Array.from(new Set(items.map((it) => (it[field] || '').trim()).filter(Boolean)));
                    return parsedGroups.every((g) => opts.includes(g));
                });
                if (candidate)
                    setGroupField(candidate);
                setGroupValues(parsedGroups);
            }
            setInvoiceDirty(false);
            setCurrentFileName(url.split('/').pop());
        }
        catch (err) {
            console.error('Failed to load invoice', err);
        }
    };
    useModalStack(isOpen);
    // Load branding info when modal opens
    useEffect(() => {
        if (!isOpen)
            return;
        setBrandLogoUrl(userData?.brandLogoUrl || "");
        setBrandName(userData?.brandName || userData?.company || "");
        setBrandAddress(userData?.brandAddress || "");
        setBrandPhone(userData?.brandPhone || "");
        setBrandTagline(userData?.brandTagline || "");
        setLogoDataUrl(userData?.brandLogoUrl || null);
        setUseProjectAddress(false);
        setShowSaved(false);
        setIsDirty(false);
    }, [isOpen, userData]);
    useEffect(() => {
        if (!isOpen)
            return;
        setInvoiceNumber("0000");
        setIssueDate(new Date().toLocaleDateString());
        setDueDate("");
        setServiceDate("");
        setProjectTitle(project?.title || "Project Title");
        setCustomerSummary(project?.clientName || "Customer");
        setInvoiceSummary("Invoice Details");
        setPaymentSummary("Payment");
        setNotes("Notes...");
        setDepositReceived(0);
        setInvoiceDirty(false);
        if (revision?.revision != null) {
            setCurrentFileName(`invoice-revision-${revision.revision}.html`);
        }
        else {
            setCurrentFileName('invoice.html');
        }
    }, [isOpen, project]);
    // Track edits
    useEffect(() => {
        const dirty = (brandLogoUrl || "") !== (userData?.brandLogoUrl || "") ||
            (brandName || "") !== (userData?.brandName || userData?.company || "") ||
            (brandAddress || "") !== (userData?.brandAddress || "") ||
            (brandPhone || "") !== (userData?.brandPhone || "") ||
            (brandTagline || "") !== (userData?.brandTagline || "");
        setIsDirty(dirty);
    }, [brandLogoUrl, brandName, brandAddress, brandPhone, brandTagline, userData]);
    useEffect(() => {
        if (isOpen) {
            const arr = Array.isArray(budgetItems) ? budgetItems : [];
            setItems(arr);
            if (arr.length && !arr.some((i) => i.invoiceGroup)) {
                setGroupField("category");
                setGroupValues([]);
            }
        }
    }, [isOpen, budgetItems]);
    useEffect(() => {
        if (!isOpen || !project?.projectId)
            return;
        fetchInvoiceFiles()
            .then((files) => setSavedInvoices(Array.isArray(files) ? files : []))
            .catch((err) => console.error('Failed to fetch invoices', err));
    }, [isOpen, project]);
    useEffect(() => {
        const vals = Array.from(new Set(items.map((it) => (it[groupField] || "").trim()).filter(Boolean)));
        if (groupValues.length === 0) {
            setGroupValues(vals);
        }
        else {
            const filteredVals = groupValues.filter((v) => vals.includes(v));
            if (filteredVals.length !== groupValues.length) {
                setGroupValues(filteredVals);
            }
        }
    }, [items, groupField]);
    const groupOptions = Array.from(new Set(items.map((it) => (it[groupField] || "").trim()).filter(Boolean)));
    const filtered = groupValues.length === 0
        ? items
        : items.filter((it) => groupValues.includes(String(it[groupField]).trim()));
    const subtotal = filtered.reduce((sum, it) => sum + (parseFloat(it.itemFinalCost) || 0), 0);
    useEffect(() => {
        const dep = parseFloat(depositReceived) || 0;
        setTotalDue(subtotal - dep);
    }, [subtotal, depositReceived]);
    const rowsData = useMemo(() => {
        const groups = groupValues.length === 0 ? groupOptions : groupValues;
        const arr = [];
        groups.forEach((grp) => {
            if (grp)
                arr.push({ type: "group", group: grp });
            items
                .filter((it) => String(it[groupField]).trim() === grp)
                .forEach((it) => arr.push({ type: "item", item: it }));
        });
        return arr;
    }, [items, groupValues, groupField, groupOptions]);
    useLayoutEffect(() => {
        if (!invoiceRef.current)
            return;
        const pageHeight = 1122; // approx A4 at 96dpi
        const top = invoiceRef.current.querySelector(".invoice-top");
        const thead = invoiceRef.current.querySelector(".items-table thead");
        const totals = invoiceRef.current.querySelector(".totals");
        const notes = invoiceRef.current.querySelector(".notes");
        const footer = invoiceRef.current.querySelector(".footer");
        const topHeight = (top?.offsetHeight || 0) + (thead?.offsetHeight || 0);
        const bottomHeight = (totals?.offsetHeight || 0) +
            (notes?.offsetHeight || 0) +
            (footer?.offsetHeight || 0);
        const rowEls = Array.from(invoiceRef.current.querySelectorAll(".items-table tbody tr"));
        let available = pageHeight - topHeight;
        const pagesAccum = [];
        let current = [];
        rowEls.forEach((row, idx) => {
            const rowHeight = row.offsetHeight;
            const isLast = idx === rowEls.length - 1;
            const needed = rowHeight + (isLast ? bottomHeight : 0);
            if (needed > available && current.length) {
                pagesAccum.push(current);
                current = [];
                available = pageHeight - topHeight;
            }
            current.push(rowsData[idx]);
            available -= rowHeight;
        });
        if (current.length)
            pagesAccum.push(current);
        const same = pages.length === pagesAccum.length &&
            pages.every((p, i) => p.length === pagesAccum[i].length);
        if (!same) {
            setPages(pagesAccum);
        }
    }, [rowsData]);
    useEffect(() => {
        setSelectedPages(pages.map((_, i) => i));
    }, [pages]);
    const buildInvoiceHtml = () => {
        if (!previewRef.current)
            return "";
        const style = document.getElementById("invoice-preview-styles").innerHTML;
        const pageIndexes = selectedPages.length > 0
            ? selectedPages
            : pages.map((_, i) => i);
        const htmlPages = pageIndexes
            .map((idx) => {
            const pageRows = pages[idx] || [];
            const rowsHtml = pageRows
                .map((row) => row.type === "group"
                ? `<tr class="group-header"><td colSpan="5">${row.group}</td></tr>`
                : `<tr><td>${row.item.description || ""}</td><td>${row.item.quantity || ""}</td><td>${row.item.unit || ""}</td><td>${formatCurrency((parseFloat(row.item.itemFinalCost) || 0) / (parseFloat(row.item.quantity) || 1))}</td><td>${formatCurrency(parseFloat(row.item.itemFinalCost) || 0)}</td></tr>`)
                .join("");
            const headerName = brandName || project?.company || "Company Name";
            const headerAddress = useProjectAddress
                ? project?.address || "Address"
                : brandAddress || "Address";
            const headerPhone = brandPhone || "Phone";
            const headerTag = brandTagline || "";
            const logoSrc = logoDataUrl || brandLogoUrl;
            const invNum = invoiceNumber || "";
            const issue = issueDate || "";
            const due = dueDate || "";
            const service = serviceDate || "";
            const billContact = project?.clientName || "Client Name";
            const billCompany = project?.invoiceBrandName || "Client Company";
            const billAddress = project?.invoiceBrandAddress || project?.clientAddress || "Client Address";
            const billPhone = project?.invoiceBrandPhone || project?.clientPhone || "";
            const projTitle = projectTitle || "";
            const custSum = customerSummary || "";
            const invSum = invoiceSummary || "";
            const paySum = paymentSummary || "";
            const notesText = notes || "";
            const deposit = formatCurrency(depositReceived);
            const total = formatCurrency(totalDue);
            const logoHtml = logoSrc
                ? `<img src="${logoSrc}" alt="logo" style="max-width:100px;max-height:100px" />`
                : "";
            const totalsHtml = idx === pages.length - 1
                ? `<div class="bottom-block"><div class="totals"><div>Subtotal: <span>${formatCurrency(subtotal)}</span></div><div>Deposit received: <span>${deposit}</span></div><div><strong>Total Due: <span>${total}</span></strong></div></div><div class="notes">${notesText}</div><div class="footer">${headerName}</div></div>`
                : "";
            return `
          <div class="invoice-page invoice-container">
            <div class="invoice-top">
              <div class="invoice-header">
                <div>${logoHtml}</div>
                <div class="company-info">
                  <div class="brand-name">${headerName}</div>
                  ${headerTag ? `<div class="brand-tagline">${headerTag}</div>` : ""}
                  <div class="brand-address">${headerAddress}</div>
                  <div class="brand-phone">${headerPhone}</div>
                </div>
                <div class="invoice-title">INVOICE</div>
              </div>
              <div class="billing-info">
                <div>
                  <strong>Bill To:</strong>
                  <div>${billContact}</div>
                  <div>${billCompany}</div>
                  <div>${billAddress}</div>
                  ${billPhone ? `<div>${billPhone}</div>` : ""}
                </div>
                <div>
                  <div>Invoice #: <span>${invNum}</span></div>
                  <div>Issue date: <span>${issue}</span></div>
                  <div>Due date: <span>${due}</span></div>
                  <div>Service date: <span>${service}</span></div>
                </div>
              </div>
            </div>
            <h1 class="project-title">${projTitle}</h1>
            <div class="summary"><div>${custSum}</div><div>${invSum}</div><div>${paySum}</div></div>
            <hr class="summary-divider" />
            <div class="items-table-wrapper">
              <table class="items-table">
                <thead>
                <tr>
                    <th>Description</th>
                    <th>QTY</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
            ${totalsHtml}
            <div class="pageNumber">Page ${idx + 1} of ${pages.length}</div>
          </div>
        `;
        })
            .join("");
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${style}</style></head><body>${htmlPages}</body></html>`;
        return html;
    };
    const exportHtml = () => {
        const html = buildInvoiceHtml();
        if (!html)
            return;
        const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
        saveAs(blob, `invoice-revision-${revision.revision}.html`);
    };
    const saveInvoice = async () => {
        const html = buildInvoiceHtml();
        if (!html || !project?.projectId)
            return;
        const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
        const unique = uuid().slice(0, 8);
        const date = new Date().toISOString().split("T")[0];
        const projectSlug = slugify(project.title || "project");
        const fileName = `${projectSlug}-${revision.revision}-${date}-${unique}.html`;
        const key = `projects/${project.projectId}/invoices/${fileName}`;
        try {
            await uploadData({
                key,
                data: blob,
                options: {
                    accessLevel: "public",
                    metadata: { friendlyName: fileName },
                },
            });
            const url = `${S3_PUBLIC_BASE}/${key}`;
            setSavedInvoices((prev) => [...prev, { name: fileName, url }]);
            setInvoiceDirty(false);
            setCurrentFileName(fileName);
        }
        catch (err) {
            console.error("Failed to save invoice", err);
        }
    };
    const handleSaveClick = () => {
        if (invoiceDirty) {
            saveInvoice();
        }
        else {
            toast.info("Invoice already saved");
        }
    };
    const handleSaveHeader = async () => {
        try {
            let uploadedUrl = brandLogoUrl;
            if (logoDataUrl && logoDataUrl.startsWith("data:")) {
                const file = await (async () => {
                    const res = await fetch(logoDataUrl);
                    const blob = await res.blob();
                    const ext = blob.type.split("/").pop() || "png";
                    return new File([blob], `logo.${ext}`, { type: blob.type });
                })();
                const filename = `userBranding/${userData.userId}/${file.name}`;
                await uploadData({ key: filename, data: file, options: { accessLevel: "public" } });
                uploadedUrl = `${S3_PUBLIC_BASE}/${filename}`;
            }
            const updated = {
                ...userData,
                brandLogoUrl: uploadedUrl,
                brandName,
                brandAddress,
                brandPhone,
                brandTagline,
            };
            await updateUserProfile(updated);
            setUserData(updated);
            setBrandLogoUrl(uploadedUrl);
            setShowSaved(true);
            setIsDirty(false);
        }
        catch (err) {
            console.error("Failed to save header", err);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Invoice Preview", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: {
                    base: styles.modalOverlay,
                    afterOpen: styles.modalOverlayAfterOpen,
                    beforeClose: styles.modalOverlayBeforeClose,
                }, children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("div", { className: styles.modalTitle, children: "Invoice Preview" }), _jsx("button", { className: styles.iconButton, onClick: onRequestClose, "aria-label": "Close", children: _jsx(FontAwesomeIcon, { icon: faXmark }) })] }), _jsxs("div", { className: styles.currentFileRow, children: [_jsx("div", { className: styles.fileName, children: currentFileName || "Unsaved Invoice" }), _jsxs("div", { className: styles.buttonGroup, children: [allowSave && (_jsx("button", { className: styles.iconButton, onClick: handleSaveClick, "aria-label": "Save invoice", children: _jsx(FontAwesomeIcon, { icon: faSave }) })), _jsx("button", { className: styles.iconButton, onClick: exportHtml, "aria-label": "Download HTML", children: _jsx(FontAwesomeIcon, { icon: faDownload }) })] })] }), _jsx("div", { className: styles.modalBody, children: items.length === 0 ? (_jsx("div", { className: styles.emptyPlaceholder, children: "No budget line items available" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.navControls, children: [_jsx("button", { className: styles.navButton, onClick: () => setCurrentPage((p) => Math.max(0, p - 1)), disabled: currentPage === 0, "aria-label": "Previous Page", children: _jsx(FontAwesomeIcon, { icon: faChevronLeft }) }), _jsxs("span", { children: ["Page ", currentPage + 1, " of ", pages.length] }), _jsx("button", { className: styles.navButton, onClick: () => setCurrentPage((p) => Math.min(p + 1, pages.length - 1)), disabled: currentPage >= pages.length - 1, "aria-label": "Next Page", children: _jsx(FontAwesomeIcon, { icon: faChevronRight }) })] }), _jsxs("div", { className: styles.contentRow, style: showSidebar ? undefined : { minWidth: "850px" }, children: [showSidebar && (_jsxs("div", { className: styles.sidebar, children: [_jsxs("label", { htmlFor: "group-field-select", children: ["Group By:", " "] }), _jsx("select", { id: "group-field-select", value: groupField, onChange: (e) => {
                                                        setGroupField(e.target.value);
                                                        setGroupValues([]);
                                                    }, children: groupFields.map((g) => (_jsx("option", { value: g.value, children: g.label }, g.value))) }), _jsxs("div", { className: styles.groupSelect, role: "group", "aria-label": "Groups", children: [_jsxs("label", { className: styles.groupItem, children: [_jsx("input", { type: "checkbox", checked: groupValues.length === groupOptions.length, onChange: (e) => setGroupValues(e.target.checked ? groupOptions : []) }), "Select All"] }), groupOptions.map((val) => (_jsxs("label", { className: styles.groupItem, children: [_jsx("input", { type: "checkbox", checked: groupValues.includes(val), onChange: () => setGroupValues((prev) => prev.includes(val)
                                                                        ? prev.filter((v) => v !== val)
                                                                        : [...prev, val]) }), val] }, val)))] }), _jsxs("div", { className: styles.pageSelect, role: "group", "aria-label": "Pages", children: [_jsxs("label", { className: styles.groupItem, children: [_jsx("input", { type: "checkbox", checked: selectedPages.length === pages.length, onChange: (e) => setSelectedPages(e.target.checked ? pages.map((_, i) => i) : []) }), "Select All Pages"] }), pages.map((_, idx) => (_jsxs("label", { className: styles.groupItem, children: [_jsx("input", { type: "checkbox", checked: selectedPages.includes(idx), onChange: () => setSelectedPages((prev) => prev.includes(idx)
                                                                        ? prev.filter((p) => p !== idx)
                                                                        : [...prev, idx]) }), "Page ", idx + 1] }, idx)))] }), savedInvoices.length > 0 && (_jsxs("div", { className: styles.invoiceList, children: [_jsx("div", { className: styles.listHeader, children: "Saved Invoices" }), _jsxs("label", { className: styles.groupItem, children: [_jsx("input", { type: "checkbox", checked: selectedInvoices.size === savedInvoices.length, onChange: (e) => selectAllInvoices(e.target.checked) }), "Select All"] }), savedInvoices.map((inv, idx) => (_jsxs("div", { className: styles.invoiceRow, children: [_jsx("input", { type: "checkbox", checked: selectedInvoices.has(inv.url), onChange: () => toggleInvoiceSelect(inv.url) }), _jsx("button", { type: "button", className: styles.linkButton, onClick: () => loadInvoice(inv.url), children: inv.name }), _jsx("button", { className: styles.iconButton, onClick: () => {
                                                                        setSelectedInvoices(new Set([inv.url]));
                                                                        setIsConfirmingDelete(true);
                                                                    }, "aria-label": "Delete invoice", children: _jsx(FontAwesomeIcon, { icon: faTrash }) })] }, idx))), selectedInvoices.size > 0 && (_jsxs("button", { className: styles.iconButton, onClick: () => setIsConfirmingDelete(true), "aria-label": "Delete selected invoices", children: [_jsx(FontAwesomeIcon, { icon: faTrash }), " Delete Selected"] }))] })), isDirty && (_jsx("button", { className: styles.saveButton, onClick: handleSaveHeader, children: "Save as my default invoice header" })), showSaved && (_jsx("div", { className: styles.savedMsg, role: "status", children: "Header info saved! Future invoices will use this by default." }))] })), _jsxs("div", { className: styles.previewWrapper, ref: previewRef, children: [_jsx("style", { id: "invoice-preview-styles", children: `
          .invoice-container{background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;width:210mm;box-sizing:border-box;margin:0 auto;padding:20px;overflow-x:hidden;}
          .invoice-page{width:210mm;height:297mm;box-shadow:0 2px 6px rgba(0,0,0,0.15);margin:0 auto 20px;padding:20px;box-sizing:border-box;position:relative;overflow-x:hidden;display:flex;flex-direction:column;}
         .invoice-header{display:flex;align-items:flex-start;gap:20px;}
          .logo-upload{width:100px;height:100px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
          .logo-upload img{max-width:100%;max-height:100%;}
          .company-block{flex:1;display:flex;justify-content:space-between;align-items:flex-start;}
          .company-info{display:flex;flex-direction:column;margin-top:10px;}
          .brand-name{font-size:1.2rem;font-weight:bold;}
          .brand-tagline,.brand-address,.brand-phone{font-size:0.7rem;}
          .invoice-meta{text-align:right;font-size:0.85rem;}
          .billing-info{margin-top:20px;display:flex;justify-content:space-between;font-size:0.85rem;}
          .invoice-title{font-size:2rem;color:#FA3356;font-weight:bold;text-align:right;margin-left:auto;}
          .project-title{font-size:1.5rem;font-weight:bold;text-align:center;margin:10px 0;}
          .summary{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;}
          .summary>div{flex:1;}
          .summary-divider{border:0;border-top:1px solid #ccc;margin-bottom:10px;}
          .items-table-wrapper{flex:1 0 auto;}
          .items-table{width:100%;border-collapse:collapse;margin-top:20px;box-sizing:border-box;}
          .items-table th,.items-table td{border:1px solid #ddd;padding:8px;}
          .items-table th{background:#f5f5f5;text-align:left;}
          .group-header{background:#fafafa;font-weight:bold;}
          .bottom-block{margin-top:auto;margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;margin-bottom:40px;}
          .totals{margin-top:20px;margin-left:auto;}
          .notes{margin-top:20px;}
          .footer{margin-top:40px;font-size:0.9rem;color:#666;}
          .pageNumber{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-family:'Roboto',Arial,sans-serif;font-size:0.85rem;color:#666;font-weight:normal;pointer-events:none;user-select:none;}
          @media print{
            .invoice-page{box-shadow:none;margin:0;page-break-after:always;}
            .invoice-page:last-child{page-break-after:auto;}
          }
        ` }), _jsxs("div", { className: "invoice-page invoice-container", ref: invoiceRef, style: { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }, children: [_jsxs("div", { className: "invoice-top", children: [_jsxs("header", { className: "invoice-header", children: [_jsxs("div", { className: "logo-upload", onClick: () => fileInputRef.current && fileInputRef.current.click(), onDragOver: (e) => e.preventDefault(), onDrop: handleLogoDrop, "aria-label": "Company logo", children: [logoDataUrl || brandLogoUrl ? (_jsx("img", { src: logoDataUrl || brandLogoUrl, alt: "Company logo" })) : (_jsx("span", { children: "Upload Logo" })), _jsx("input", { type: "file", accept: "image/*", ref: fileInputRef, style: { display: "none" }, onChange: handleLogoSelect })] }), _jsxs("div", { className: "company-block", children: [_jsxs("div", { className: "company-info", children: [_jsx("div", { className: "brand-name", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Company Name", onBlur: (e) => {
                                                                                                setBrandName(e.currentTarget.textContent);
                                                                                                setInvoiceDirty(true);
                                                                                            }, children: brandName || 'Your Business Name' }), _jsx("div", { className: "brand-tagline", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Tagline", onBlur: (e) => {
                                                                                                setBrandTagline(e.currentTarget.textContent);
                                                                                                setInvoiceDirty(true);
                                                                                            }, children: brandTagline || 'Tagline' }), _jsx("div", { className: "brand-address", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Company Address", onBlur: (e) => {
                                                                                                setBrandAddress(e.currentTarget.textContent);
                                                                                                setInvoiceDirty(true);
                                                                                            }, children: useProjectAddress ? project?.address || 'Project Address' : brandAddress || 'Business Address' }), _jsx("div", { className: "brand-phone", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Company Phone", onBlur: (e) => {
                                                                                                setBrandPhone(e.currentTarget.textContent);
                                                                                                setInvoiceDirty(true);
                                                                                            }, children: brandPhone || 'Phone Number' }), project?.address && (_jsxs("label", { style: { fontSize: '0.8rem' }, children: [_jsx("input", { type: "checkbox", checked: useProjectAddress, onChange: (e) => setUseProjectAddress(e.target.checked) }), ' ', "Use project address"] }))] }), _jsxs("div", { className: "invoice-meta", children: [_jsxs("div", { children: ["Invoice #:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                        setInvoiceNumber(e.currentTarget.textContent);
                                                                                                        setInvoiceDirty(true);
                                                                                                    }, children: invoiceNumber })] }), _jsxs("div", { children: ["Issue date:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                        setIssueDate(e.currentTarget.textContent);
                                                                                                        setInvoiceDirty(true);
                                                                                                    }, children: issueDate })] }), _jsxs("div", { children: ["Due date:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                        setDueDate(e.currentTarget.textContent);
                                                                                                        setInvoiceDirty(true);
                                                                                                    }, children: dueDate })] }), _jsxs("div", { children: ["Service date:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                        setServiceDate(e.currentTarget.textContent);
                                                                                                        setInvoiceDirty(true);
                                                                                                    }, children: serviceDate })] })] })] })] }), _jsx("h1", { className: "project-title", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Project Title", onBlur: (e) => {
                                                                        setProjectTitle(e.currentTarget.textContent);
                                                                        setInvoiceDirty(true);
                                                                    }, children: projectTitle }), _jsxs("div", { className: "summary", children: [_jsx("div", { contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Customer Summary", onBlur: (e) => {
                                                                                setCustomerSummary(e.currentTarget.textContent);
                                                                                setInvoiceDirty(true);
                                                                            }, children: customerSummary }), _jsx("div", { contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Invoice Details", onBlur: (e) => {
                                                                                setInvoiceSummary(e.currentTarget.textContent);
                                                                                setInvoiceDirty(true);
                                                                            }, children: invoiceSummary }), _jsx("div", { contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Payment", onBlur: (e) => {
                                                                                setPaymentSummary(e.currentTarget.textContent);
                                                                                setInvoiceDirty(true);
                                                                            }, children: paymentSummary })] }), _jsx("hr", { className: "summary-divider" })] }), _jsx("div", { className: "items-table-wrapper", children: _jsxs("table", { className: "items-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Description" }), _jsx("th", { children: "QTY" }), _jsx("th", { children: "Unit" }), _jsx("th", { children: "Unit Price" }), _jsx("th", { children: "Amount" })] }) }), _jsx("tbody", { children: rowsData.map((row, idx) => row.type === 'group' ? (_jsx("tr", { className: "group-header", children: _jsx("td", { colSpan: "5", children: row.group }) }, idx)) : (_jsxs("tr", { children: [_jsx("td", { children: row.item.description || '' }), _jsx("td", { children: row.item.quantity || '' }), _jsx("td", { children: row.item.unit || '' }), _jsx("td", { children: formatCurrency((parseFloat(row.item.itemFinalCost) || 0) / (parseFloat(row.item.quantity) || 1)) }), _jsx("td", { children: formatCurrency(parseFloat(row.item.itemFinalCost) || 0) })] }, row.item.budgetItemId))) })] }) }), _jsxs("div", { className: "bottom-block", children: [_jsxs("div", { className: "totals", children: [_jsxs("div", { children: ["Subtotal: ", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, children: formatCurrency(subtotal) })] }), _jsxs("div", { children: ["Deposit received:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                        setDepositReceived(parseFloat(e.currentTarget.textContent.replace(/[$,]/g, "")) || 0);
                                                                                        setInvoiceDirty(true);
                                                                                    }, children: formatCurrency(depositReceived) })] }), _jsx("div", { children: _jsxs("strong", { children: ["Total Due:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                            setTotalDue(parseFloat(e.currentTarget.textContent.replace(/[$,]/g, "")) || 0);
                                                                                            setInvoiceDirty(true);
                                                                                        }, children: formatCurrency(totalDue) })] }) })] }), _jsx("div", { className: "notes", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                        setNotes(e.currentTarget.textContent);
                                                                        setInvoiceDirty(true);
                                                                    }, children: notes }), _jsx("div", { className: "footer", contentEditable: true, suppressContentEditableWarning: true, children: project?.company || 'Company Name' })] })] }), pages[currentPage] && (_jsx(React.Fragment, { children: _jsxs("div", { className: "invoice-page invoice-container", children: [_jsxs("div", { className: "invoice-top", children: [_jsxs("header", { className: "invoice-header", children: [_jsxs("div", { className: "logo-upload", onClick: () => fileInputRef.current && fileInputRef.current.click(), onDragOver: (e) => e.preventDefault(), onDrop: handleLogoDrop, "aria-label": "Company logo", children: [logoDataUrl || brandLogoUrl ? (_jsx("img", { src: logoDataUrl || brandLogoUrl, alt: "Company logo" })) : (_jsx("span", { children: "Upload Logo" })), _jsx("input", { type: "file", accept: "image/*", ref: fileInputRef, style: { display: "none" }, onChange: handleLogoSelect })] }), _jsxs("div", { className: "company-block", children: [_jsxs("div", { className: "company-info", children: [_jsx("div", { className: "brand-name", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Company Name", onBlur: (e) => {
                                                                                                    setBrandName(e.currentTarget.textContent);
                                                                                                    setInvoiceDirty(true);
                                                                                                }, children: brandName || 'Your Business Name' }), _jsx("div", { className: "brand-tagline", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Tagline", onBlur: (e) => {
                                                                                                    setBrandTagline(e.currentTarget.textContent);
                                                                                                    setInvoiceDirty(true);
                                                                                                }, children: brandTagline || 'Tagline' }), _jsx("div", { className: "brand-address", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Company Address", onBlur: (e) => {
                                                                                                    setBrandAddress(e.currentTarget.textContent);
                                                                                                    setInvoiceDirty(true);
                                                                                                }, children: useProjectAddress ? project?.address || 'Project Address' : brandAddress || 'Business Address' }), _jsx("div", { className: "brand-phone", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Company Phone", onBlur: (e) => {
                                                                                                    setBrandPhone(e.currentTarget.textContent);
                                                                                                    setInvoiceDirty(true);
                                                                                                }, children: brandPhone || 'Phone Number' }), project?.address && (_jsxs("label", { style: { fontSize: '0.8rem' }, children: [_jsx("input", { type: "checkbox", checked: useProjectAddress, onChange: (e) => setUseProjectAddress(e.target.checked) }), ' ', "Use project address"] }))] }), _jsxs("div", { className: "invoice-meta", children: [_jsxs("div", { children: ["Invoice #:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                            setInvoiceNumber(e.currentTarget.textContent);
                                                                                                            setInvoiceDirty(true);
                                                                                                        }, children: invoiceNumber })] }), _jsxs("div", { children: ["Issue date:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                            setIssueDate(e.currentTarget.textContent);
                                                                                                            setInvoiceDirty(true);
                                                                                                        }, children: issueDate })] }), _jsxs("div", { children: ["Due date:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                            setDueDate(e.currentTarget.textContent);
                                                                                                            setInvoiceDirty(true);
                                                                                                        }, children: dueDate })] }), _jsxs("div", { children: ["Service date:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                            setServiceDate(e.currentTarget.textContent);
                                                                                                            setInvoiceDirty(true);
                                                                                                        }, children: serviceDate })] })] })] })] }), _jsx("h1", { className: "project-title", contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Project Title", onBlur: (e) => {
                                                                            setProjectTitle(e.currentTarget.textContent);
                                                                            setInvoiceDirty(true);
                                                                        }, children: projectTitle }), _jsxs("div", { className: "summary", children: [_jsx("div", { contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Customer Summary", onBlur: (e) => {
                                                                                    setCustomerSummary(e.currentTarget.textContent);
                                                                                    setInvoiceDirty(true);
                                                                                }, children: customerSummary }), _jsx("div", { contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Invoice Details", onBlur: (e) => {
                                                                                    setInvoiceSummary(e.currentTarget.textContent);
                                                                                    setInvoiceDirty(true);
                                                                                }, children: invoiceSummary }), _jsx("div", { contentEditable: true, suppressContentEditableWarning: true, "aria-label": "Payment", onBlur: (e) => {
                                                                                    setPaymentSummary(e.currentTarget.textContent);
                                                                                    setInvoiceDirty(true);
                                                                                }, children: paymentSummary })] }), _jsx("hr", { className: "summary-divider" })] }), _jsx("div", { className: "items-table-wrapper", children: _jsxs("table", { className: "items-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Description" }), _jsx("th", { children: "QTY" }), _jsx("th", { children: "Unit" }), _jsx("th", { children: "Unit Price" }), _jsx("th", { children: "Amount" })] }) }), _jsx("tbody", { children: currentRows.map((row, idx2) => row.type === 'group' ? (_jsx("tr", { className: "group-header", children: _jsx("td", { colSpan: "5", children: row.group }) }, `g-${currentPage}-${idx2}`)) : (_jsxs("tr", { children: [_jsx("td", { children: row.item.description || '' }), _jsx("td", { children: row.item.quantity || '' }), _jsx("td", { children: row.item.unit || '' }), _jsx("td", { children: formatCurrency((parseFloat(row.item.itemFinalCost) || 0) / (parseFloat(row.item.quantity) || 1)) }), _jsx("td", { children: formatCurrency(parseFloat(row.item.itemFinalCost) || 0) })] }, row.item.budgetItemId))) })] }) }), currentPage === pages.length - 1 && (_jsxs("div", { className: "bottom-block", children: [_jsxs("div", { className: "totals", children: [_jsxs("div", { children: ["Subtotal: ", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, children: formatCurrency(subtotal) })] }), _jsxs("div", { children: ["Deposit received:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                            setDepositReceived(parseFloat(e.currentTarget.textContent.replace(/[$,]/g, "")) || 0);
                                                                                            setInvoiceDirty(true);
                                                                                        }, children: formatCurrency(depositReceived) })] }), _jsx("div", { children: _jsxs("strong", { children: ["Total Due:", _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                                                setTotalDue(parseFloat(e.currentTarget.textContent.replace(/[$,]/g, "")) || 0);
                                                                                                setInvoiceDirty(true);
                                                                                            }, children: formatCurrency(totalDue) })] }) })] }), _jsx("div", { className: "notes", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                                                                            setNotes(e.currentTarget.textContent);
                                                                            setInvoiceDirty(true);
                                                                        }, children: notes }), _jsx("div", { className: "footer", contentEditable: true, suppressContentEditableWarning: true, children: project?.company || 'Company Name' })] }))] }) }))] })] })] })) })] }), _jsx(ConfirmModal, { isOpen: isConfirmingDelete, onRequestClose: () => setIsConfirmingDelete(false), onConfirm: performDeleteInvoices, message: "Delete selected invoices?", className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: {
                    base: styles.modalOverlay,
                    afterOpen: styles.modalOverlayAfterOpen,
                    beforeClose: styles.modalOverlayBeforeClose,
                } })] }));
};
export default InvoicePreviewModal;
