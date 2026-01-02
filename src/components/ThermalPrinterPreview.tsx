import React from "react";
import { format } from "date-fns";

export interface ThermalPrinterPreviewProps {
  data?: Array<{
    item_name?: string;
    name?: string;
    amount: number;
    qty?: number;
    quantity?: number;
  }>;
  total?: number;
  name?: string;
  receiptNo?: string;
  modeOfPayment?: string;
  cashier?: string;
  discount?: number;
  balance?: number;
  grandTotal?: number;
  paymentStatus?: string;
  amountPaid?: number;
  facilityInfo?: {
    logo?: string;
    printTitle?: string;
    printSubtitle1?: string;
    printSubtitle2?: string;
  };
  info?: {
    createdAt?: string;
  };
  title?: string;
  patient_id?: string;
  consultation_number?: string;
}

const formatNumber = (num: number | string): string => {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const COL1_WIDTH = 40;
const COL_AMT_WIDTH = 20;
const COLN_WIDTH = (100 - (COL1_WIDTH + COL_AMT_WIDTH)) / 2;

export function ThermalPrinterPreview({
  data = [],
  total = 0,
  name = "",
  receiptNo = "",
  modeOfPayment = "Cash",
  cashier = "",
  discount = 0,
  balance = 0,
  grandTotal = 0,
  paymentStatus = "Full Payment",
  amountPaid = 0,
  facilityInfo = {},
  info = {},
  title = "",
  patient_id = "",
  consultation_number = "",
}: ThermalPrinterPreviewProps) {
  return (
    <div
      style={{
        width: "200px",
        padding: "5px 10px",
        fontSize: "8px",
        fontFamily: "'Roboto', sans-serif",
        fontWeight: "bold",
        backgroundColor: "#fff",
        color: "#000",
        margin: "0 auto",
      }}
    >
      {/* Header Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {facilityInfo.logo && (
          <img
            src={facilityInfo.logo}
            alt="Logo"
            style={{ height: "40px", width: "40px" }}
          />
        )}
        {facilityInfo.printTitle && (
          <div style={{ fontSize: "10px", fontFamily: "'Roboto', sans-serif", fontWeight: "bold" }}>
            {facilityInfo.printTitle}
          </div>
        )}
        {facilityInfo.printSubtitle1 && (
          <div style={{ fontSize: "8px", fontFamily: "'Roboto', sans-serif", fontWeight: "bold" }}>
            {facilityInfo.printSubtitle1}
          </div>
        )}
        {facilityInfo.printSubtitle2 && (
          <div style={{ fontSize: "8px", fontFamily: "'Roboto', sans-serif", fontWeight: "bold" }}>
            {facilityInfo.printSubtitle2}
          </div>
        )}
      </div>

      {/* Date Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          margin: "4px 0",
        }}
      >
        <div style={{ fontWeight: "bold" }}>Receipt No: {receiptNo}</div>
        <div style={{ margin: 0 }}>
          {info.createdAt &&
            format(new Date(info.createdAt), "dd-MM-yy - HH:mm")}
        </div>
      </div>

      {/* Title */}
      {title && (
        <div style={{ textAlign: "center", fontSize: "12px", fontWeight: "bold" }}>
          {title}
        </div>
      )}

      {/* Account Name */}
      <div style={{ display: "flex", flexDirection: "row", margin: "3px 0", fontWeight: "bold" }}>
        <span style={{ marginRight: "5px" }}>Account name:</span>
        <div>
          <div>{name === "" ? "Walk-In" : `${name}${patient_id ? `(${patient_id})` : ""}`}</div>
          {consultation_number && <div>{consultation_number}</div>}
        </div>
      </div>

      {/* Table */}
      <div style={{ width: "100%", margin: "6px 0" }}>
        {/* Table Header */}
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ width: `${COL1_WIDTH}%` }}>
            <div style={{ fontWeight: "bold" }}>Service</div>
          </div>
          <div style={{ width: `${COLN_WIDTH}%` }}>
            <div style={{ fontWeight: "bold" }}>Cost</div>
          </div>
          <div style={{ width: `${COLN_WIDTH}%` }}>
            <div style={{ fontWeight: "bold" }}>Qty</div>
          </div>
          <div style={{ width: `${COL_AMT_WIDTH}%` }}>
            <div style={{ fontWeight: "bold", textAlign: "right" }}>
              Amount (₦)
            </div>
          </div>
        </div>

        {/* Table Rows */}
        {data.map((item, index) => {
          const itemName = item.item_name || item.name || "Unknown Item";
          const qty = item.qty || item.quantity || 1;
          const unitPrice = item.amount / parseInt(String(qty || 1));
          const amount = item.amount;

          return (
            <div key={index} style={{ display: "flex", flexDirection: "row" }}>
              <div style={{ width: `${COL1_WIDTH}%` }}>
                <div style={{ margin: "1px 0", fontWeight: "bold" }}>{itemName}</div>
              </div>
              <div style={{ width: `${COLN_WIDTH}%` }}>
                <div style={{ margin: "1px 0", fontWeight: "bold" }}>
                  {formatNumber(unitPrice)}
                </div>
              </div>
              <div style={{ width: `${COLN_WIDTH}%` }}>
                <div style={{ margin: "1px 0", fontWeight: "bold" }}>{formatNumber(qty)}</div>
              </div>
              <div style={{ width: `${COL_AMT_WIDTH}%` }}>
                <div style={{ margin: "1px 0", textAlign: "right", fontWeight: "bold" }}>
                  {formatNumber(amount)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Total Row */}
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ width: `${COL1_WIDTH}%` }}>
            <div style={{ margin: "1px 0", fontWeight: "bold" }}>Total</div>
          </div>
          <div style={{ width: `${COLN_WIDTH}%` }}>
            <div style={{ margin: "1px 0" }}></div>
          </div>
          <div
            style={{
              width: `${2 * COLN_WIDTH}%`,
              fontWeight: "bold",
            }}
          >
            <div style={{ margin: "1px 0", textAlign: "right", fontWeight: "bold" }}>
              ₦ {formatNumber(total)}
            </div>
          </div>
        </div>

        {/* Discount Row */}
        {parseInt(String(discount)) > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              marginTop: "2px",
            }}
          >
            <div style={{ width: `${COL1_WIDTH}%` }}>
              <div style={{ margin: "1px 0", fontWeight: "bold" }}>Discount</div>
            </div>
            <div style={{ width: `${COLN_WIDTH}%` }}>
              <div style={{ margin: "1px 0" }}></div>
            </div>
            <div
              style={{
                width: `${2 * COLN_WIDTH}%`,
                fontWeight: "bold",
              }}
            >
              <div style={{ margin: "1px 0", textAlign: "right", fontWeight: "bold" }}>
                ₦ {formatNumber(discount)}
              </div>
            </div>
          </div>
        )}

        {/* Amount Paid Row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            marginTop: "2px",
          }}
        >
          <div style={{ width: `${COL1_WIDTH}%` }}>
            <div style={{ margin: "1px 0", fontWeight: "bold" }}>Amount Paid</div>
          </div>
          <div style={{ width: `${COLN_WIDTH}%` }}>
            <div style={{ margin: "1px 0" }}></div>
          </div>
          <div
            style={{
              width: `${2 * COLN_WIDTH}%`,
              fontWeight: "bold",
              borderTop: "1px solid #000",
              paddingTop: "3px",
            }}
          >
            <div style={{ margin: "1px 0", textAlign: "right", fontWeight: "bold" }}>
              ₦ {formatNumber(amountPaid)}
            </div>
          </div>
        </div>

        {/* Grand Total Row */}
        {paymentStatus !== "Full Payment" && (
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div style={{ width: `${COL1_WIDTH}%` }}>
              <div style={{ margin: "1px 0", fontWeight: "bold" }}>Grand Total</div>
            </div>
            <div style={{ width: `${COLN_WIDTH}%` }}>
              <div style={{ margin: "1px 0" }}></div>
            </div>
            <div
              style={{
                width: `${2 * COLN_WIDTH}%`,
                fontWeight: "bold",
              }}
            >
              <div style={{ margin: "1px 0", textAlign: "right", fontWeight: "bold" }}>
                ₦ {formatNumber(grandTotal || 0)}
              </div>
            </div>
          </div>
        )}

        {/* Balance Row */}
        {paymentStatus !== "Full Payment" && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              marginTop: "2px",
            }}
          >
            <div style={{ width: `${COL1_WIDTH}%` }}>
              <div style={{ margin: "1px 0", fontWeight: "bold" }}>Balance</div>
            </div>
            <div style={{ width: `${COLN_WIDTH}%` }}>
              <div style={{ margin: "1px 0" }}></div>
            </div>
            <div
              style={{
                width: `${2 * COLN_WIDTH}%`,
                fontWeight: "bold",
                borderTop: "1px solid #000",
                paddingTop: "3px",
              }}
            >
              <div style={{ margin: "1px 0", textAlign: "right", fontWeight: "bold" }}>
                ₦ {formatNumber(balance || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          fontWeight: "bold",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", margin: "3px 0" }}>
          <span style={{ marginRight: "5px" }}>Mode of payment:</span>
          <span>{modeOfPayment}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "row", margin: "3px 0" }}>
          <span style={{ marginRight: "5px" }}>Cashier:</span>
          <span>{cashier}</span>
        </div>
      </div>

      {/* Goodbye Text */}
      <div style={{ marginTop: "2px" }}>
        <div
          style={{
            fontSize: "8px",
            textTransform: "capitalize",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Thanks for coming, get well soon!
        </div>
      </div>

      {/* Powered By */}
      <div
        style={{
          fontSize: "8px",
          marginTop: "6px",
          textAlign: "center",
          fontFamily: "'Roboto', sans-serif",
          fontStyle: "italic",
          fontWeight: "bold",
          marginBottom: "30px",
        }}
      >
        Powered by: mylikita.com
      </div>
    </div>
  );
}

