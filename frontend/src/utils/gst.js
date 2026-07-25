export const TOTAL_GST_RATE = 18;
export const CGST_RATE = 9;
export const SGST_RATE = 9;

export function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function productHasGst(product) {
    if (!product) return false;
    if (product.applyGst === true) return true;
    if (product.applyGst === false) return false;
    return Number(product.gstRate) > 0;
}

function splitInclusiveAmount(inclusiveTotal, gstRate) {
    const total = Number(inclusiveTotal) || 0;
    const rate = Number(gstRate) || 0;
    if (rate <= 0 || total <= 0) {
        return { taxableValue: round2(total), gstAmount: 0, cgstAmount: 0, sgstAmount: 0 };
    }
    const taxableValue = total / (1 + rate / 100);
    const gstAmount = total - taxableValue;
    const half = gstAmount / 2;
    return {
        taxableValue: round2(taxableValue),
        gstAmount: round2(gstAmount),
        cgstAmount: round2(half),
        sgstAmount: round2(half),
    };
}

export function splitLineTax(lineTotal, applyGst) {
    if (!applyGst) {
        return { taxableValue: round2(lineTotal), gstAmount: 0, cgstAmount: 0, sgstAmount: 0 };
    }
    return splitInclusiveAmount(lineTotal, TOTAL_GST_RATE);
}

export function calcBuyGstBreakup(buyPrice, applyGst) {
    const buy = Number(buyPrice) || 0;
    if (!applyGst) return { gstOnBuy: 0, landedCost: round2(buy) };
    const gstOnBuy = round2(buy * TOTAL_GST_RATE / 100);
    return { gstOnBuy, landedCost: round2(buy + gstOnBuy) };
}

export function aggregateCartTax(cart) {
    let taxableAmount = 0;
    let nonGstAmount = 0;
    let gstAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;

    cart.forEach((line) => {
        const applyGst = Boolean(line.applyGst);
        const split = splitLineTax(line.total, applyGst);
        if (applyGst) {
            taxableAmount += split.taxableValue;
            gstAmount += split.gstAmount;
            cgstAmount += split.cgstAmount;
            sgstAmount += split.sgstAmount;
        } else {
            nonGstAmount += Number(line.total) || 0;
        }
    });

    return {
        taxableAmount: round2(taxableAmount),
        nonGstAmount: round2(nonGstAmount),
        gstAmount: round2(gstAmount),
        cgstAmount: round2(cgstAmount),
        sgstAmount: round2(sgstAmount),
        finalTotal: round2(taxableAmount + gstAmount + nonGstAmount),
        hasGst: cart.some((c) => c.applyGst),
    };
}
