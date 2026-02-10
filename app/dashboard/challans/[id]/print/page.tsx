import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PrintChallanPage({
  params,
}: {
  params: { id: string };
}) {
  const challan = await prisma.challan.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      createdBy: true,
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

  if (!challan) {
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

  // Calculate GST
  const amount = challan.amount || 0;
  const igstPercent = challan.igstPercent || 18;
  const cgstPercent = challan.cgstPercent || 9;
  const sgstPercent = challan.sgstPercent || 9;

  // Assuming amount includes GST, calculate base and tax
  const igstAmount = (amount * igstPercent) / 100;
  const cgstAmount = (amount * cgstPercent) / 100;
  const sgstAmount = (amount * sgstPercent) / 100;
  const grandTotal = amount + igstAmount; // If using IGST
  // For intra-state: grandTotal = amount + cgstAmount + sgstAmount

  return (
    <html>
      <head>
        <title>Delivery Challan - {challan.challanNumber}</title>
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
            margin-top: 60px; /* Space for control bar */
            max-width: 210mm; /* A4 width */
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
          .address-section {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            margin-top: 5px;
            text-align: left;
           }
           .address-box {
             width: 32%;
           }
           .address-label {
             font-weight: bold;
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
           .sender-receiver {
             display: flex;
             border: 1px solid #000;
             margin-bottom: 10px;
           }
           .sender, .receiver {
             flex: 1;
             padding: 10px;
             border-right: 1px solid #000;
           }
           .receiver { border-right: none; }
           .sr-title {
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
           .amount-section {
             margin-top: 10px;
             display: flex;
             justify-content: flex-end;
           }
           .amount-table {
             width: 250px;
           }
           .amount-table td {
             padding: 4px 8px;
           }
           .grand-total {
             background: #1e40af;
             color: #fff;
             font-weight: bold;
           }
           .declaration {
             margin-top: 20px;
             text-align: center;
             font-weight: bold;
             font-style: italic;
             padding: 8px;
             background: #fffbeb;
             border: 1px solid #f59e0b;
           }
           .signature-section {
             display: flex;
             justify-content: space-between;
             margin-top: 40px;
             page-break-inside: avoid;
           }
           .signature-box {
             width: 30%;
             text-align: center;
           }
           .signature-line {
             border-top: 1px solid #000;
             padding-top: 5px;
             margin-top: 40px;
             font-weight: bold;
           }
        `}</style>
      </head>
      <body>
        <div className="control-bar no-print" data-html2canvas-ignore="true">
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            <span style={{ color: '#6b7280' }}>Challan:</span> {challan.challanNumber}
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

        <div id="challan-content" className="content-wrapper">
          <div className="header">
            <div className="company-name">{companySettings.companyName}</div>
            {companySettings.tagline && (
              <div className="tagline">{companySettings.tagline}</div>
            )}

            <div className="address-section">
              <div className="address-box">
                <span className="address-label">Reg. Office:</span><br />
                {companySettings.registeredOffice || "-"}
              </div>
              <div className="address-box" style={{ textAlign: 'center' }}>
                <span className="address-label">Corp. Office:</span><br />
                {companySettings.corporateOffice || "-"}
              </div>
              <div className="address-box" style={{ textAlign: 'right' }}>
                <span className="address-label">Godown:</span><br />
                {companySettings.godownAddress || "-"}
              </div>
            </div>

            <div className="gstin-pan">
              GSTIN: {companySettings.gstin || "-"} | PAN: {companySettings.pan || "-"} | State: {companySettings.sellerState} ({companySettings.sellerStateCode})
            </div>
          </div>

          <div className="title-bar">
            {challan.challanType === 'RETURN' ? 'RETURN CHALLAN' : 'DELIVERY CHALLAN'}
          </div>

          {/* Info Grid */}
          <div className="info-grid">
            <div className="info-box">
              <div className="info-label">Challan No.</div>
              <div className="info-value pl-1 font-bold">{challan.challanNumber}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Date</div>
              <div className="info-value pl-1">{new Date(challan.issueDate).toLocaleDateString("en-IN")}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Transporter Name</div>
              <div className="info-value">{challan.transporterName || "-"}</div>
            </div>
            <div className="info-box">
              <div className="info-label">L.R / Bilty No.</div>
              <div className="info-value">{challan.lrBiltyNo || "-"}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Vehicle No.</div>
              <div className="info-value">{challan.truckNumber || "-"}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Driver Name & No.</div>
              <div className="info-value">{challan.driverName || "-"} {challan.driverPhone ? `(${challan.driverPhone})` : ""}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Contact Person Name</div>
              <div className="info-value">{challan.contactPersonName || "-"}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Contact Person No.</div>
              <div className="info-value">{challan.contactPersonNumber || "-"}</div>
            </div>
          </div>

          {/* Sender & Receiver */}
          <div className="sender-receiver">
            <div className="sender">
              <div className="sr-title">Material Dispatch From:</div>
              <div>{challan.dispatchFrom || companySettings.godownAddress || "-"}</div>
            </div>
            <div className="receiver">
              <div className="sr-title">Material Dispatch To:</div>
              <div>{challan.dispatchTo || challan.project.location || "-"}</div>
              <div style={{ marginTop: "5px" }}>
                <strong>Project:</strong> {challan.project.name}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table>
            <thead>
              <tr>
                <th className="text-center" style={{ width: "5%" }}>S.No</th>
                <th style={{ width: "55%" }}>Description of Goods</th>
                <th className="text-center" style={{ width: "10%" }}>Qty</th>
                <th className="text-right" style={{ width: "15%" }}>Rate</th>
                <th className="text-right" style={{ width: "15%" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Using same summary structure as original file */}
              <tr>
                <td className="text-center">1</td>
                <td>EVENT MANAGEMENT SERVICES</td>
                <td className="text-center">-</td>
                <td className="text-right">-</td>
                <td className="text-right">₹ {amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colSpan={4} className="text-right"><strong>Taxable Amount</strong></td>
                <td className="text-right">₹ {amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colSpan={4} className="text-right">IGST @ {igstPercent}%</td>
                <td className="text-right">₹ {igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ background: "#1e40af", color: "#fff" }}>
                <td colSpan={4} className="text-right"><strong>Grand Total</strong></td>
                <td className="text-right"><strong>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Item Details (collapsible summary) */}
          <div style={{ marginTop: "10px", fontSize: "9px" }}>
            <strong>Items Included:</strong> {challan.items.map((ci, i) =>
              `${ci.item.name} (${ci.quantity})`
            ).join(", ")}
          </div>

          {/* Declaration */}
          <div className="declaration">
            "Material going on Rental Basis & NOT FOR SALE"
          </div>

          {/* Remarks */}
          {challan.remarks && (
            <div style={{ marginTop: "10px" }}>
              <strong>Remarks:</strong> {challan.remarks}
            </div>
          )}

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line">
                For {companySettings.companyName}
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-line">
                Transporter Signature
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-line">
                Receiver&apos;s Signature & Stamp
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
            const element = document.getElementById('challan-content');
            const opt = {
              margin: [5, 5, 5, 5],
              filename: 'Challan-${challan.challanNumber}.pdf',
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
