import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PrintPurchaseOrderPage({
    params,
}: {
    params: { id: string };
}) {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: params.id },
        include: {
            items: {
                include: {
                    item: {
                        include: {
                            category: true,
                        },
                    },
                },
            },
        },
    });

    if (!purchaseOrder) {
        notFound();
    }

    // Fetch company settings
    let companySettings = await prisma.companySettings.findUnique({
        where: { id: "default" },
    });

    if (!companySettings) {
        companySettings = {
            id: "default",
            companyName: "YOUR COMPANY NAME",
            tagline: "Event Management & Tent Rental Services",
            registeredOffice: null,
            corporateOffice: null,
            godownAddress: null,
            gstin: null,
            pan: null,
            email: null,
            phone: null,
            logoUrl: null,
            sellerState: "DELHI",
            sellerStateCode: "07",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    const totalAmount = purchaseOrder.totalAmount
        ? parseFloat(purchaseOrder.totalAmount.toString())
        : purchaseOrder.items.reduce((sum, item) => {
            const cost = item.unitCost
                ? parseFloat(item.unitCost.toString()) * item.orderedQuantity
                : 0;
            return sum + cost;
        }, 0);

    return (
        <html>
            <head>
                <title>Purchase Order - {purchaseOrder.poNumber}</title>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
                <style>{`
          @media print {
            body { margin: 0; padding: 10px; }
            @page { size: A4; margin: 10mm; }
            .no-print { display: none !important; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 20px;
            background: #fff;
          }
          .control-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f3f4f6;
            padding: 10px 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            z-index: 1000;
          }
          .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
          }
          .btn-primary {
            background: #2563eb;
            color: white;
          }
          .btn-primary:hover {
            background: #1d4ed8;
          }
          .btn-secondary {
            background: #fff;
            color: #374151;
            border: 1px solid #d1d5db;
            margin-right: 10px;
          }
          .btn-secondary:hover {
            background: #f9fafb;
          }
          .content-wrapper {
            margin-top: 60px;
            max-width: 210mm;
            margin-left: auto;
            margin-right: auto;
            background: white;
            padding: 20px;
          }
          @media screen {
            body { background: #e5e7eb; }
            .content-wrapper { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          }
          .header {
            text-align: center;
            border: 2px solid #000;
            padding: 10px;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
          }
          .tagline {
            font-size: 10px;
            font-style: italic;
            margin: 3px 0;
          }
          .contact-info {
            font-size: 9px;
            margin-top: 5px;
          }
          .gstin-pan {
            text-align: center;
            font-weight: bold;
            margin-top: 5px;
            font-size: 10px;
            background: #f0f0f0;
            padding: 3px;
          }
          .title-bar {
            background: #1e40af;
            color: #fff;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            padding: 8px;
            margin: 10px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid #000;
            margin-bottom: 10px;
          }
          .info-box {
            padding: 8px;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
          }
          .info-box:nth-child(even) {
            border-right: none;
          }
          .info-label {
            font-weight: bold;
            font-size: 9px;
            color: #666;
          }
          .info-value {
            font-size: 11px;
            margin-top: 2px;
          }
          .vendor-section {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 10px;
          }
          .vendor-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 5px;
            color: #1e40af;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
          }
          th {
            background: #1e40af;
            color: #fff;
            font-weight: bold;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .grand-total {
            background: #1e40af;
            color: #fff;
            font-weight: bold;
          }
          .notes-section {
            margin-top: 15px;
            padding: 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            page-break-inside: avoid;
          }
          .signature-box {
            width: 45%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 50px;
            font-weight: bold;
          }
        `}</style>
            </head>
            <body>
                <div className="control-bar no-print" data-html2canvas-ignore="true">
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        <span style={{ color: '#6b7280' }}>Purchase Order:</span> {purchaseOrder.poNumber}
                    </div>
                    <div>
                        <button className="btn btn-secondary" id="printBtn">
                            🖨️ Print
                        </button>
                        <button className="btn btn-primary" id="downloadBtn">
                            ⬇️ Download PDF
                        </button>
                    </div>
                </div>

                <div id="po-content" className="content-wrapper">
                    <div className="header">
                        <div className="company-name">{companySettings.companyName}</div>
                        {companySettings.tagline && (
                            <div className="tagline">{companySettings.tagline}</div>
                        )}
                        <div className="contact-info">
                            {companySettings.phone && `📞 ${companySettings.phone}`}
                            {companySettings.email && ` | ✉️ ${companySettings.email}`}
                        </div>
                        <div className="gstin-pan">
                            GSTIN: {companySettings.gstin || "-"} | PAN: {companySettings.pan || "-"}
                        </div>
                    </div>

                    <div className="title-bar">
                        PURCHASE ORDER
                    </div>

                    {/* PO Info Grid */}
                    <div className="info-grid">
                        <div className="info-box">
                            <div className="info-label">PO Number</div>
                            <div className="info-value font-bold">{purchaseOrder.poNumber}</div>
                        </div>
                        <div className="info-box">
                            <div className="info-label">Order Date</div>
                            <div className="info-value">{new Date(purchaseOrder.orderDate).toLocaleDateString("en-IN")}</div>
                        </div>
                        <div className="info-box">
                            <div className="info-label">Expected Delivery</div>
                            <div className="info-value">
                                {purchaseOrder.expectedDate
                                    ? new Date(purchaseOrder.expectedDate).toLocaleDateString("en-IN")
                                    : "-"}
                            </div>
                        </div>
                        <div className="info-box">
                            <div className="info-label">Status</div>
                            <div className="info-value">{purchaseOrder.status.replace("_", " ")}</div>
                        </div>
                    </div>

                    {/* Vendor Info */}
                    <div className="vendor-section">
                        <div className="vendor-title">Vendor Details:</div>
                        <div style={{ fontSize: '11px', marginTop: '5px' }}>
                            <strong>{purchaseOrder.vendor}</strong>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table>
                        <thead>
                            <tr>
                                <th className="text-center" style={{ width: "5%" }}>S.No</th>
                                <th style={{ width: "30%" }}>Item Name</th>
                                <th style={{ width: "20%" }}>Category</th>
                                <th className="text-center" style={{ width: "10%" }}>Ordered</th>
                                <th className="text-center" style={{ width: "10%" }}>Received</th>
                                <th className="text-right" style={{ width: "12%" }}>Unit Cost</th>
                                <th className="text-right" style={{ width: "13%" }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrder.items.map((item, index) => {
                                const unitCost = item.unitCost
                                    ? parseFloat(item.unitCost.toString())
                                    : 0;
                                const total = unitCost * item.orderedQuantity;

                                return (
                                    <tr key={item.id}>
                                        <td className="text-center">{index + 1}</td>
                                        <td>{item.item.name}</td>
                                        <td>{item.item.category.name}</td>
                                        <td className="text-center font-bold">{item.orderedQuantity}</td>
                                        <td className="text-center" style={{ color: '#f59e0b' }}>
                                            {item.receivedQuantity}
                                        </td>
                                        <td className="text-right">
                                            {unitCost > 0 ? `₹${unitCost.toFixed(2)}` : "-"}
                                        </td>
                                        <td className="text-right">
                                            {total > 0 ? `₹${total.toFixed(2)}` : "-"}
                                        </td>
                                    </tr>
                                );
                            })}
                            {totalAmount > 0 && (
                                <tr className="grand-total">
                                    <td colSpan={6} className="text-right"><strong>Grand Total</strong></td>
                                    <td className="text-right">
                                        <strong>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Notes */}
                    {purchaseOrder.notes && (
                        <div className="notes-section">
                            <strong>Notes:</strong><br />
                            {purchaseOrder.notes}
                        </div>
                    )}

                    {/* Signature Section */}
                    <div className="signature-section">
                        <div className="signature-box">
                            <div className="signature-line">
                                Authorized Signatory
                            </div>
                        </div>
                        <div className="signature-box">
                            <div className="signature-line">
                                Vendor Signature & Stamp
                            </div>
                        </div>
                    </div>
                </div>

                <script dangerouslySetInnerHTML={{
                    __html: `
          // Print function
          document.getElementById('printBtn').onclick = function() { window.print(); };

          // PDF Download function
          document.getElementById('downloadBtn').onclick = function() {
            const element = document.getElementById('po-content');
            const opt = {
              margin: [5, 5, 5, 5],
              filename: 'PO-${purchaseOrder.poNumber}.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            // Show loading state
            const btn = document.getElementById('downloadBtn');
            const originalText = btn.innerText;
            btn.innerText = 'Generating...';
            btn.disabled = true;

            html2pdf().set(opt).from(element).save().then(() => {
              btn.innerText = originalText;
              btn.disabled = false;
            }).catch(err => {
              console.error('PDF Generation Error:', err);
              btn.innerText = '❌ Error - Try Again';
              btn.disabled = false;
              setTimeout(() => {
                btn.innerText = originalText;
              }, 3000);
            });
          };
        `}} />
            </body>
        </html>
    );
}
