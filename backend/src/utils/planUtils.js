function getMaxProducts(plan) {
  switch ((plan || '').toLowerCase()) {
    case 'basic':
      return 200; // Basic plan: inventory-focused (limited)
    case 'standard':
      return 500; // Standard plan: mid-tier
    case 'pro':
    case 'enterprise':
    case 'retail pro':
      return 999999; // effectively unlimited
    default:
      return 50;
  }
}

function getMaxWorkers(plan) {
  switch ((plan || '').toLowerCase()) {
    case 'basic':
      return 0; // basic cannot add workers
    case 'standard':
      return 4;
    case 'pro':
    case 'enterprise':
    case 'retail pro':
      return 9999;
    default:
      return 0;
  }
}

function canAccessFeature(plan, feature) {
  // feature: 'pos','cashbook','payments','gst','workers','backups','reports','inventory','history','profile'
  const p = (plan || '').toLowerCase();
  if (p === 'enterprise' || p === 'pro' || p === 'retail pro') return true;
  if (p === 'standard') {
    return ['pos','cashbook','payments','gst','workers','backups','reports','inventory','history','profile'].includes(feature);
  }
  if (p === 'basic') {
    // basic allows inventory, stock selling, history and profile only
    return ['inventory','history','profile','pos'].includes(feature);
  }
  return false;
}

module.exports = { getMaxProducts, getMaxWorkers, canAccessFeature };
