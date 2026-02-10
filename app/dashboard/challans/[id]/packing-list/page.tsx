import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PackingListPage({
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

    // Sort items by category loading order
    const sortedItems = [...challan.items].sort((a, b) =>
        (a.item.category.loadingOrder || 999) - (b.item.category.loadingOrder || 999)
    );

    return (
        <html>
            <head>
                <title>Packing List - {challan.challanNumber}</title>
                <style>{`
          @media print {
            body { margin: 0; padding: 10px; }
            @page { size: A4; margin: 10mm; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            border: 2px solid #000;
            padding: 10px;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
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
          }
          .title-bar {
            background: #333;
            color: #fff;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            padding: 5px;
            margin: 10px 0;
          }
          .info-row {
            display: flex;
            border: 1px solid #000;
            border-bottom: none;
          }
          .info-row:last-child {
            border-bottom: 1px solid #000;
          }
          .info-cell {
            padding: 5px;
            border-right: 1px solid #000;
            flex: 1;
          }
          .info-cell:last-child {
            border-right: none;
          }
          .info-label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .declaration {
            margin-top: 15px;
            text-align: center;
            font-weight: bold;
            font-style: italic;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature-box {
            width: 30%;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 5px;
          }
          .print-button {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          @media print {
            .print-button { display: none; }
          }
        `}</style>
            </head>
            <body>
                {/* Print button using inline script - works in server component */}
                <button
                    className="print-button"
                    id="printBtn"
                >
                    🖨️ Print
                </button>
                <script dangerouslySetInnerHTML={{
                    __html: `document.getElementById('printBtn').onclick = function() { window.print(); }`
                }} />

                {/* Company Header */}
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
                        <div className="address-box">
                            <span className="address-label">Corp. Office:</span><br />
                            {companySettings.corporateOffice || "-"}
                        </div>
                        <div className="address-box">
                            <span className="address-label">Godown:</span><br />
                            {companySettings.godownAddress || "-"}
                        </div>
                    </div>
                    <div className="gstin-pan">
                        GSTIN: {companySettings.gstin || "-"} | PAN: {companySettings.pan || "-"} |
                        Email: {companySettings.email || "-"} | Ph: {companySettings.phone || "-"}
                    </div>
                </div>

                {/* Title */}
                <div className="title-bar">PACKING LIST</div>

                {/* Info Section */}
                <div className="info-row">
                    <div className="info-cell">
                        <span className="info-label">Packing List No.:</span> {challan.challanNumber}
                    </div>
                    <div className="info-cell">
                        <span className="info-label">Date:</span> {new Date(challan.issueDate).toLocaleDateString("en-IN")}
                    </div>
                </div>
                <div className="info-row">
                    <div className="info-cell">
                        <span className="info-label">M/s:</span> {challan.project.name}
                    </div>
                </div>
                <div className="info-row">
                    <div className="info-cell">
                        <span className="info-label">Delivery Address:</span> {challan.dispatchTo || challan.project.location}
                    </div>
                </div>
                {challan.truckNumber && (
                    <div className="info-row">
                        <div className="info-cell">
                            <span className="info-label">Vehicle No.:</span> {challan.truckNumber}
                        </div>
                        <div className="info-cell">
                            <span className="info-label">Driver:</span> {challan.driverName || "-"}
                        </div>
                    </div>
                )}

                {/* Items Table */}
                <table>
                    <thead>
                        <tr>
                            <th className="text-center" style={{ width: "5%" }}>S.No</th>
                            <th style={{ width: "45%" }}>Description of Goods</th>
                            <th className="text-center" style={{ width: "12%" }}>Size</th>
                            <th className="text-center" style={{ width: "12%" }}>Length</th>
                            <th className="text-center" style={{ width: "8%" }}>Qty</th>
                            <th className="text-center" style={{ width: "8%" }}>Unit</th>
                            <th className="text-center" style={{ width: "10%" }}>HSN/SAC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((challanItem, index) => (
                            <tr key={challanItem.id}>
                                <td className="text-center">{index + 1}</td>
                                <td>{challanItem.item.name}</td>
                                <td className="text-center">-</td>
                                <td className="text-center">-</td>
                                <td className="text-center">{challanItem.quantity}</td>
                                <td className="text-center">Nos</td>
                                <td className="text-center">{challanItem.item.hsnCode || "-"}</td>
                            </tr>
                        ))}
                        {/* Empty rows to fill page */}
                        {Array.from({ length: Math.max(0, 15 - sortedItems.length) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="text-center">&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Declaration */}
                <div className="declaration">
                    "We hereby declare that goods are going only for Rental purpose and NOT FOR SALE"
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
                        Prepared By
                    </div>
                    <div className="signature-box">
                        Checked By
                    </div>
                    <div className="signature-box">
                        Receiver&apos;s Signature
                    </div>
                </div>
            </body>
        </html>
    );
}
