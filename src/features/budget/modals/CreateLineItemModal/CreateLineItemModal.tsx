import React, { useEffect, useState } from "react";
import Modal from "@/components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "@/shared/ui/ConfirmModal";
import styles from "./CreateLineItemModal.module.css";
import { parseBudget, formatUSD } from "@/utils/budgetUtils";

/* ----------------------------- Types & Consts ----------------------------- */

type MoneyLike = string | number;

type FieldType = "text" | "textarea" | "number" | "date" | "currency" | "percent" | "select";

interface FieldDef {
  name: keyof ItemForm;
  label: string;
  type?: FieldType;
  options?: readonly string[];
}

export interface ItemForm {
  category: string;
  elementKey: string;
  elementId: string;
  description: string;
  quantity: number | string;
  unit: string;

  itemBudgetedCost: MoneyLike;
  itemActualCost: MoneyLike;
  itemReconciledCost: MoneyLike;
  itemMarkUp: MoneyLike; // stored as "12%" in UI, converted to 0.12 on submit
  itemFinalCost: MoneyLike;

  paymentType: string;
  paymentTerms: string;
  paymentStatus: string;

  startDate: string; // ISO yyyy-mm-dd (input type="date")
  endDate: string;

  areaGroup: string;
  invoiceGroup: string;

  poNumber: string;
  vendor: string;
  vendorInvoiceNumber: string;

  client: string;

  amountPaid: MoneyLike;
  balanceDue: MoneyLike;

  notes: string;

  // server-provided id (optional)
  budgetItemId?: string;
  // revision will be added at submit
  revision?: number;
}

export interface CreateLineItemModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit?: (data: ItemForm, isAutoSave?: boolean) => Promise<{ budgetItemId?: string } | void | null>;
  defaultElementKey?: string;
  budgetItems?: Array<Partial<ItemForm>>;
  areaGroupOptions?: string[];
  invoiceGroupOptions?: string[];
  clientOptions?: string[];
  defaultStartDate?: string;
  defaultEndDate?: string;
  initialData?: Partial<ItemForm> | null;
  title?: string;
  submitLabel?: string;
  revision?: number;
}

const CATEGORY_OPTIONS = [
  "AUDIO-VISUAL",
  "CLIENT-SERVICES-VIP",
  "CONTINGENCY-MISC",
  "DECOR",
  "DESIGN",
  "FABRICATION",
  "FOOD-BEVERAGE",
  "GRAPHICS",
  "INSTALLATION-MATERIALS",
  "LABOR",
  "LIGHTING",
  "MERCH-SWAG",
  "PARKING-FUEL-TOLLS",
  "PERMITS-INSURANCE",
  "PRODUCTION-MGMT",
  "RENTALS",
  "STORAGE",
  "TECH-INTERACTIVES",
  "TRAVEL",
  "TRUCKING",
  "VENUE-LOCATION-FEES",
  "WAREHOUSE",
] as const;

const PAYMENT_TYPE_OPTIONS = ["CREDIT CARD", "CHECK", "WIRE", "ACH", "CASH"] as const;
const PAYMENT_TERMS_OPTIONS = ["NET 15", "NET 30", "NET 60", "DUE ON RECEIPT"] as const;
const PAYMENT_STATUS_OPTIONS = ["PAID", "PARTIAL", "UNPAID"] as const;

const UNIT_OPTIONS = ["Each", "Hrs", "Days", "EA", "PCS", "Box", "LF", "SQFT", "KG"] as const;

const TOOLTIP_TEXT: Partial<Record<keyof ItemForm, string>> = {
  itemBudgetedCost:
    "Budgeted Cost will be disabled if Actual or Reconciled Cost is entered.",
  itemActualCost:
    "Overrides Budgeted Cost. This will be disabled if Reconciled Cost is entered.",
  itemReconciledCost:
    "Overrides both Budgeted and Actual Costs when entered.",
  itemMarkUp:
    "Markup will auto-adjust to keep Final Cost unchanged when you override costs. You can then modify Markup as needed.",
};

const fields: FieldDef[] = [
  { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS },
  { name: "elementKey", label: "Element Key" },
  { name: "elementId", label: "Element ID" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "quantity", label: "Quantity", type: "number" },
  { name: "unit", label: "Unit", type: "select", options: UNIT_OPTIONS },
  { name: "itemBudgetedCost", label: "Budgeted Cost", type: "currency" },
  { name: "itemActualCost", label: "Actual Cost", type: "currency" },
  { name: "itemReconciledCost", label: "Reconciled Cost", type: "currency" },
  { name: "itemMarkUp", label: "Markup", type: "percent" },
  { name: "itemFinalCost", label: "Final Cost", type: "currency" },
  { name: "paymentType", label: "Payment Type", type: "select", options: PAYMENT_TYPE_OPTIONS },
  { name: "paymentTerms", label: "Payment Terms", type: "select", options: PAYMENT_TERMS_OPTIONS },
  { name: "paymentStatus", label: "Payment Status", type: "select", options: PAYMENT_STATUS_OPTIONS },
  { name: "startDate", label: "Start Date", type: "date" },
  { name: "endDate", label: "End Date", type: "date" },
  { name: "areaGroup", label: "Area Group" },
  { name: "invoiceGroup", label: "Invoice Group" },
  { name: "poNumber", label: "PO Number" },
  { name: "vendor", label: "Vendor" },
  { name: "vendorInvoiceNumber", label: "Vendor Invoice #" },
  { name: "client", label: "Client" },
  { name: "amountPaid", label: "Amount Paid", type: "currency" },
  { name: "balanceDue", label: "Balance Due", type: "currency" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const initialState: ItemForm = fields.reduce<ItemForm>(
  (acc, f) => {
    if (f.name === "quantity") {
      (acc as any)[f.name] = 1;
    } else if (f.name === "unit") {
      (acc as any)[f.name] = "Each";
    } else {
      (acc as any)[f.name] = "";
    }
    return acc;
  },
  {} as ItemForm
);

/* ------------------------------ Component ------------------------------ */

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

const CreateLineItemModal: React.FC<CreateLineItemModalProps> = ({
  isOpen,
  onRequestClose,
  onSubmit,
  defaultElementKey = "",
  budgetItems = [],
  areaGroupOptions = [],
  invoiceGroupOptions = [],
  clientOptions = [],
  defaultStartDate = "",
  defaultEndDate = "",
  initialData = null,
  title = "Create Line Item",
  submitLabel,
  revision = 1,
}) => {
  const [item, setItem] = useState<ItemForm>({
    ...initialState,
    elementKey: defaultElementKey,
  });

  const [initialItemString, setInitialItemString] = useState<string>("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);

  /* --------------------------- Lifecycle & Setup --------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const formatted: ItemForm = { ...initialState, ...initialData } as ItemForm;

      // normalize markup -> always show as percent string
      const markRaw = (formatted.itemMarkUp ?? "") as MoneyLike;
      if (markRaw !== "" || markRaw === 0) {
        const num = parseFloat(String(markRaw));
        if (!Number.isNaN(num)) {
          const percent = num < 1 ? num * 100 : num;
          formatted.itemMarkUp = `${parseFloat(String(percent))}%`;
        }
      }

      setItem(formatted);
      setInitialItemString(JSON.stringify(formatted));
    } else {
      const defaultItem: ItemForm = {
        ...initialState,
        elementKey: defaultElementKey,
        startDate: defaultStartDate || "",
        endDate: defaultEndDate || "",
      };
      setItem(defaultItem);
      setInitialItemString(JSON.stringify(defaultItem));
    }
  }, [isOpen, initialData, defaultElementKey, defaultStartDate, defaultEndDate]);

  /* ------------------------------- Helpers -------------------------------- */

  const getNextElementId = (category: string) => {
    let max = 0;
    budgetItems.forEach((it) => {
      const cat = (it as any)?.category;
      const elementId = (it as any)?.elementId as string | undefined;
      if (cat === category && typeof elementId === "string") {
        const match = elementId.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
    });
    return `${category}-${String(max + 1).padStart(4, "0")}`;
  };

  const computeFinalCost = (data: ItemForm): string => {
    const budgeted = parseBudget(data.itemBudgetedCost);
    const actual = parseBudget(data.itemActualCost);
    const reconciled = parseBudget(data.itemReconciledCost);
    const mark = parseFloat(String(data.itemMarkUp).replace(/%/g, ""));
    const markupNum = Number.isNaN(mark) ? 0 : mark / 100;
    const baseCost = reconciled || actual || budgeted;
    const qty = parseFloat(String(data.quantity)) || 0;
    const final = baseCost * (1 + markupNum) * (qty || 1);
    return baseCost ? formatUSD(final) : "";
  };

  /* ------------------------------- Handlers -------------------------------- */

  type InputChange =
    | React.ChangeEvent<HTMLInputElement>
    | React.ChangeEvent<HTMLTextAreaElement>
    | React.ChangeEvent<HTMLSelectElement>;

  const handleChange = (e: InputChange) => {
    const { name, value } = e.target as HTMLInputElement;
    const field = name as keyof ItemForm;

    setItem((prev) => {
      const updated: ItemForm = { ...prev, [field]: value } as ItemForm;

      // Auto elementId when category chosen
      if (field === "category" && value) {
        updated.elementId = getNextElementId(value);
      }

      // Recompute final cost and keep markup consistent when overriding costs
      if (
        [
          "itemBudgetedCost",
          "itemActualCost",
          "itemReconciledCost",
          "itemMarkUp",
        ].includes(field)
      ) {
        const prevFinal = parseBudget(prev.itemFinalCost);
        let budgeted = parseBudget(updated.itemBudgetedCost);
        let actual = parseBudget(updated.itemActualCost);
        let reconciled = parseBudget(updated.itemReconciledCost);

        if (field === "itemBudgetedCost") budgeted = parseBudget(value);
        if (field === "itemActualCost") actual = parseBudget(value);
        if (field === "itemReconciledCost") reconciled = parseBudget(value);

        if ((field === "itemActualCost" || field === "itemReconciledCost") && prevFinal) {
          const base = reconciled || actual || budgeted;
          if (base) {
            const qty = parseFloat(String(prev.quantity)) || 1;
            const newMarkup = ((prevFinal / (base * qty) - 1) * 100).toFixed(2);
            updated.itemMarkUp = `${parseFloat(newMarkup)}%`;
          }
        }
        updated.itemFinalCost = computeFinalCost(updated);
      }

      if (field === "quantity") {
        updated.itemFinalCost = computeFinalCost(updated);
      }

      return updated;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof ItemForm;

    if (
      [
        "itemBudgetedCost",
        "itemFinalCost",
        "itemActualCost",
        "itemReconciledCost",
        "amountPaid",
        "balanceDue",
      ].includes(field)
    ) {
      setItem((prev) => {
        const updated: ItemForm = {
          ...prev,
          [field]: value ? formatUSD(parseBudget(value)) : "",
        };

        if (
          [
            "itemBudgetedCost",
            "itemActualCost",
            "itemReconciledCost",
            "itemFinalCost",
          ].includes(field)
        ) {
          const prevFinal = parseBudget(prev.itemFinalCost);
          const budgeted = parseBudget(updated.itemBudgetedCost);
          const actual = parseBudget(updated.itemActualCost);
          const reconciled = parseBudget(updated.itemReconciledCost);

          if ((field === "itemActualCost" || field === "itemReconciledCost") && prevFinal) {
            const base = reconciled || actual || budgeted;
            if (base) {
              const qty = parseFloat(String(prev.quantity)) || 1;
              const newMarkup = ((prevFinal / (base * qty) - 1) * 100).toFixed(2);
              updated.itemMarkUp = `${parseFloat(newMarkup)}%`;
            }
          }
          updated.itemFinalCost = computeFinalCost(updated);
        }

        return updated;
      });
    } else if (field === "itemMarkUp") {
      if (value === "") {
        setItem((prev) => ({ ...prev, [field]: "" }));
      } else {
        const num = parseFloat(String(value).replace(/%/g, ""));
        if (!Number.isNaN(num)) {
          setItem((prev) => {
            const updated: ItemForm = { ...prev, [field]: `${num}%` } as ItemForm;
            const budgeted = parseBudget(updated.itemBudgetedCost);
            const actual = parseBudget(updated.itemActualCost);
            const reconciled = parseBudget(updated.itemReconciledCost);
            const markupNum = num / 100;
            const baseCost = reconciled || actual || budgeted;
            const qty = parseFloat(String(updated.quantity)) || 0;
            const final = baseCost * (1 + markupNum) * (qty || 1);
            updated.itemFinalCost = baseCost ? formatUSD(final) : "";
            return updated;
          });
        }
      }
    }
  };

  const submitItem = async (isAutoSave = false) => {
    const data: ItemForm = { ...item };

    ([
      "itemBudgetedCost",
      "itemFinalCost",
      "itemActualCost",
      "itemReconciledCost",
      "amountPaid",
      "balanceDue",
    ] as const).forEach((f) => {
      (data as any)[f] = (data as any)[f] ? parseBudget((data as any)[f]) : 0;
    });

    data.quantity = data.quantity ? parseFloat(String(data.quantity)) : 0;

    if (data.areaGroup) data.areaGroup = data.areaGroup.trim().toUpperCase();
    if (data.invoiceGroup) data.invoiceGroup = data.invoiceGroup.trim().toUpperCase();

    if (data.itemMarkUp !== "") {
      const num = parseFloat(String(data.itemMarkUp).replace(/%/g, ""));
      // store as decimal for backend
      (data as any).itemMarkUp = Number.isNaN(num) ? 0 : num / 100;
    } else {
      (data as any).itemMarkUp = 0;
    }

    data.revision = revision;

    if (onSubmit) {
      return await onSubmit(data, isAutoSave);
    }
    return null;
  };

  const persistItem = async (isAutoSave = false) => {
    const result = await submitItem(isAutoSave);
    const savedItem =
      result && (result as any).budgetItemId
        ? { ...item, budgetItemId: (result as any).budgetItemId }
        : item;

    if ((result as any)?.budgetItemId && !item.budgetItemId) {
      setItem(savedItem);
    }
    
    const newInitialString = JSON.stringify(savedItem);
    setInitialItemString(newInitialString);
    return result;
  };

  const handleClose = () => {
    const currentItemString = JSON.stringify(item);
    const hasChanges = currentItemString !== initialItemString;

    if (hasChanges) {
      setShowUnsavedConfirm(true);
    } else {
      onRequestClose();
    }
  };

  const confirmSave = async () => {
    await persistItem(false); // explicit save, not autosave
    setShowUnsavedConfirm(false);
    onRequestClose();
  };

  const discardChanges = () => {
    setShowUnsavedConfirm(false);
    onRequestClose();
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await persistItem(false); // explicit form submit, not autosave
  };

  /* ------------------------------- Shortcuts ------------------------------- */

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void persistItem(false); // keyboard shortcut save, not autosave
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item]);

  /* --------------------------------- Render -------------------------------- */

  return (
    <>
      <style>
        {`
        .${styles.modalContent} {
          font-size: 12px !important;
          padding: 16px !important;
        }
        .${styles.form} label {
          margin-bottom: 4px !important;
        }
        .${styles.form} input,
        .${styles.form} textarea,
        .${styles.form} select {
          font-size: 11px !important;
          padding: 2px 6px !important;
        }
        .${styles.fieldDivider} {
          margin: 6px 0 !important;
        }
        .${styles.modalFooter} {
          margin-top: 10px !important;
        }
        .${styles.shortcutHint} {
          font-size: 10px !important;
        }
      `}
      </style>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleClose}
        contentLabel={title}
        closeTimeoutMS={300}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{title}</div>
          <span className={styles.revisionLabel}>Rev.{revision}</span>
          <button
            className={styles.iconButton}
            onClick={handleClose}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {fields.map((f) => {
            const tooltip = TOOLTIP_TEXT[f.name];
            const disabled =
              f.name === "elementKey" ||
              f.name === "elementId" ||
              (f.name === "itemBudgetedCost" &&
                (item.itemActualCost || item.itemReconciledCost)) ||
              (f.name === "itemActualCost" && !!item.itemReconciledCost);

            const commonProps = {
              name: f.name,
              value: (item as any)[f.name] as any,
              onChange: handleChange,
              disabled: !!disabled,
            };

            return (
              <React.Fragment key={f.name}>
                <label
                  className={`${styles.field} ${tooltip ? styles.tooltipLabel : ""}`}
                  title={tooltip || undefined}
                >
                  <span>{f.label}</span>

                  {f.type === "select" ? (
                    f.name === "paymentStatus" ? (
                      <span className={styles.paymentStatusContainer}>
                        <select {...commonProps}>
                          <option hidden value="" />
                          {(f.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        {(item[f.name] as string) && (
                          <span
                            className={`${styles.statusDot} ${
                              String(item[f.name]).trim().toUpperCase() === "PAID"
                                ? styles.paid
                                : String(item[f.name]).trim().toUpperCase() === "PARTIAL"
                                ? styles.partial
                                : styles.unpaid
                            }`}
                          />
                        )}
                      </span>
                    ) : (
                      <select {...commonProps}>
                        <option hidden value="" />
                        {(f.options ?? []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )
                  ) : f.type === "number" || f.type === "date" ? (
                    <input 
                      type={f.type} 
                      {...commonProps}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                    />
                  ) : f.type === "textarea" ? (
                    <textarea
                      {...commonProps}
                      className={f.name === "description" ? styles.descriptionInput : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                        }
                      }}
                    />
                  ) : (
                    // text / currency / percent
                    <input
                      type="text"
                      {...commonProps}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      onBlur={
                        f.type && ["currency", "percent"].includes(f.type)
                          ? handleBlur
                          : undefined
                      }
                      placeholder={
                        f.type === "currency" ? "$0.00" : f.type === "percent" ? "0%" : ""
                      }
                      list={
                        f.name === "areaGroup"
                          ? "area-group-options"
                          : f.name === "invoiceGroup"
                          ? "invoice-group-options"
                          : f.name === "client"
                          ? "client-options"
                          : undefined
                      }
                    />
                  )}
                </label>

                {[
                  "description",
                  "itemFinalCost",
                  "paymentStatus",
                  "endDate",
                  "invoiceGroup",
                  "vendorInvoiceNumber",
                ].includes(f.name) && <hr className={styles.fieldDivider} />}
              </React.Fragment>
            );
          })}

          <datalist id="area-group-options">
            {areaGroupOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <datalist id="invoice-group-options">
            {invoiceGroupOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <datalist id="client-options">
            {clientOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>

          <div className={styles.modalFooter}>
            <button type="submit" className="modal-button primary" style={{ borderRadius: 5 }}>
              {submitLabel || (title === "Edit Item" ? "Save" : "Create")}
            </button>
            <button
              type="button"
              className="modal-button secondary"
              style={{ borderRadius: 5 }}
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>

          <div className={styles.shortcutHint}>Press ⌘+Enter / Ctrl+Enter to save.</div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showUnsavedConfirm}
        onRequestClose={discardChanges}
        onConfirm={confirmSave}
        message="You have unsaved changes, do you want to save this line item?"
        confirmLabel="Yes"
        cancelLabel="No"
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
      />
    </>
  );
};

export default CreateLineItemModal;
