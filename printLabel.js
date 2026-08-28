// Generates a printable dispensing label sheet for a prescription.
// One label per prescribed item — sized for standard pharmacy label stickers.

// All interpolated values come from user-entered data (patient/medication
// names, instructions, etc). Escape before injecting into document.write —
// otherwise a name containing "<" or "<script>" would execute in the print
// window.
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Returns true if the label window opened successfully, false if it was
// blocked by the browser's popup blocker (caller should toast on false).
export function printPrescriptionLabel(rx) {
  const items = rx.items?.length ? rx.items : [{ medication_name: "—", dosage: "", quantity: 0, instructions: "" }];
  const today = new Date().toLocaleDateString();

  const labelsHtml = items
    .map((item) => {
      const qty = item.quantity || 0;
      return `
      <div class="label">
        <div class="label-header">
          <div class="pharmacy">MediCare Pharmacy</div>
          <div class="rx-no">Rx: ${escapeHtml(rx.prescription_number || "—")}</div>
        </div>
        <div class="label-body">
          <div class="patient-line">
            <span class="field-label">Patient:</span>
            <span class="field-value">${escapeHtml(rx.patient_name || "—")}</span>
            ${rx.patient_age ? `<span class="field-meta">${escapeHtml(rx.patient_age)} yrs</span>` : ""}
            ${rx.patient_gender ? `<span class="field-meta">${escapeHtml(rx.patient_gender)}</span>` : ""}
          </div>
          <div class="med-name">${escapeHtml(item.medication_name || "—")}</div>
          ${item.dosage ? `<div class="dosage-line"><span class="field-label">Take:</span> ${escapeHtml(item.dosage)}</div>` : ""}
          ${item.instructions ? `<div class="instructions">${escapeHtml(item.instructions)}</div>` : ""}
          <div class="qty-line">
            <span><span class="field-label">Qty:</span> ${escapeHtml(qty)}</span>
            <span><span class="field-label">Date:</span> ${escapeHtml(rx.date ? new Date(rx.date).toLocaleDateString() : today)}</span>
          </div>
        </div>
        <div class="label-footer">
          <span>Prescriber: ${escapeHtml(rx.prescriber_name || "—")}</span>
          <span>${escapeHtml(today)}</span>
        </div>
      </div>`;
    })
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Dispensing Label — ${escapeHtml(rx.prescription_number || "")}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; background: #fff; padding: 12px; }
      .label-sheet { display: flex; flex-direction: column; gap: 10px; }
      .label {
        border: 1px dashed #94a3b8;
        border-radius: 6px;
        padding: 10px 12px;
        width: 100%;
        max-width: 3.5in;
        page-break-inside: avoid;
      }
      .label-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 2px solid #0d9488;
        padding-bottom: 4px;
        margin-bottom: 6px;
      }
      .pharmacy { font-size: 13px; font-weight: bold; color: #0f766e; }
      .rx-no { font-size: 11px; color: #475569; font-weight: 600; }
      .label-body { font-size: 11px; color: #1e293b; line-height: 1.4; }
      .patient-line { display: flex; gap: 4px; align-items: baseline; flex-wrap: wrap; margin-bottom: 4px; }
      .field-label { font-weight: bold; color: #64748b; }
      .field-value { font-weight: 600; }
      .field-meta { color: #64748b; font-size: 10px; }
      .med-name { font-size: 13px; font-weight: bold; color: #0f172a; margin: 2px 0 4px; }
      .dosage-line { margin-bottom: 2px; }
      .instructions { font-style: italic; color: #334155; margin-bottom: 4px; }
      .qty-line { display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px; }
      .label-footer {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #94a3b8;
        margin-top: 6px;
        padding-top: 4px;
        border-top: 1px solid #e2e8f0;
      }
      @media print {
        body { padding: 0; }
        .label { border: 1px dashed #94a3b8; }
      }
    </style>
  </head>
  <body>
    <div class="label-sheet">
      ${labelsHtml}
    </div>
    <script>
      window.onload = function() {
        window.focus();
        window.print();
      };
    </script>
  </body>
  </html>`;

  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) {
    // Popup blocked — let the caller (which has access to the toast system)
    // inform the user, instead of a blocking alert() here.
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
