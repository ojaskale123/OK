/**
 * Per-item GST: CGST 9% + SGST 9% (= 18% inclusive split). Only when applyGst is true.
 */

const TOTAL_GST_RATE = 18;
const CGST_RATE = 9;
const SGST_RATE = 9;

function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function productHasGst(product) {
    if (!product) return false;
    if (product.applyGst === true) return true;
    if (product.applyGst === false) return false;
    return Number(product.gstRate) > 0;
}

function splitInclusiveAmount(inclusiveTotal, gstRate) {
    const total = Number(inclusiveTotal) || 0;
    const rate = Number(gstRate) || 0;
    if (rate <= 0 || total <= 0) {
        return {
            taxableValue: round2(total),
            gstAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
        };
    }
    const taxableValue = total / (1 + rate / 100);
    const gstAmount = total - taxableValue;
    const half = gstAmount / 2;
    return {
        taxableValue: round2(taxableValue),
        gstAmount: round2(gstAmount),
        cgstAmount: round2(half),
        sgstAmount: round2(half),
        igstAmount: 0,
    };
}

function splitLineTax(lineTotal, applyGst) {
    if (!applyGst) {
        return {
            taxableValue: round2(lineTotal),
            gstAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            cgstRate: 0,
            sgstRate: 0,
            applyGst: false,
            gstRate: 0,
        };
    }
    const split = splitInclusiveAmount(lineTotal, TOTAL_GST_RATE);
    return {
        ...split,
        cgstRate: CGST_RATE,
        sgstRate: SGST_RATE,
        applyGst: true,
        gstRate: TOTAL_GST_RATE,
    };
}

function calcBuyGstBreakup(buyPrice, applyGst) {
    const buy = Number(buyPrice) || 0;
    if (!applyGst) return { gstOnBuy: 0, landedCost: round2(buy) };
    const gstOnBuy = round2(buy * TOTAL_GST_RATE / 100);
    return { gstOnBuy, landedCost: round2(buy + gstOnBuy) };
}

function aggregateBillTax(lines) {
    let taxableAmount = 0;
    let nonGstAmount = 0;
    let gstAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;

    const items = lines.map((line) => {
        const lineTotal = Number(line.total) || Number(line.price) * Number(line.quantity) || 0;
        const applyGst = Boolean(line.applyGst);
        const split = splitLineTax(lineTotal, applyGst);

        if (applyGst) {
            taxableAmount += split.taxableValue;
            gstAmount += split.gstAmount;
            cgstAmount += split.cgstAmount;
            sgstAmount += split.sgstAmount;
        } else {
            nonGstAmount += lineTotal;
        }

        return {
            ...line,
            applyGst,
            hsn: line.hsn || '8517',
            ...split,
        };
    });

    const finalTotal = round2(taxableAmount + gstAmount + nonGstAmount);

    return {
        items,
        taxableAmount: round2(taxableAmount),
        nonGstAmount: round2(nonGstAmount),
        gstAmount: round2(gstAmount),
        cgstAmount: round2(cgstAmount),
        sgstAmount: round2(sgstAmount),
        igstAmount: 0,
        finalTotal,
        hasGst: items.some((i) => i.applyGst),
    };
}

module.exports = {
    TOTAL_GST_RATE,
    CGST_RATE,
    SGST_RATE,
    round2,
    productHasGst,
    splitInclusiveAmount,
    splitLineTax,
    calcBuyGstBreakup,
    aggregateBillTax,
};
