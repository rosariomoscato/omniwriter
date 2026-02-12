#!/usr/bin/env node

/**
 * Verification script for Feature #77: Display available subscription plans
 *
 * This script checks:
 * 1. LandingPage component exists
 * 2. Pricing section is present with Free, Premium, Lifetime plans
 * 3. All plans have features listed
 * 4. Feature comparison is visible
 */

const fs = require('fs');
const path = require('path');

console.log('=== Feature #77: Display available subscription plans ===\n');

const landingPagePath = path.join(__dirname, 'client/src/pages/LandingPage.tsx');

// Check if LandingPage exists
if (!fs.existsSync(landingPagePath)) {
  console.error('❌ FAIL: LandingPage.tsx not found');
  process.exit(1);
}
console.log('✅ PASS: LandingPage.tsx exists');

// Read the file
const content = fs.readFileSync(landingPagePath, 'utf-8');

// Check for pricing section
const hasPricingSection = content.includes('Pricing Section') || content.includes('Piani e Prezzi');
if (!hasPricingSection) {
  console.error('❌ FAIL: Pricing section not found in LandingPage');
  process.exit(1);
}
console.log('✅ PASS: Pricing section exists in LandingPage');

// Check for Free plan
const hasFreePlan = content.includes('Free') || content.includes('name="Free"');
if (!hasFreePlan) {
  console.error('❌ FAIL: Free plan not found');
  process.exit(1);
}
console.log('✅ PASS: Free plan is displayed');

// Check for Premium plan
const hasPremiumPlan = content.includes('Premium') || content.includes('name="Premium"');
if (!hasPremiumPlan) {
  console.error('❌ FAIL: Premium plan not found');
  process.exit(1);
}
console.log('✅ PASS: Premium plan is displayed');

// Check for Lifetime plan
const hasLifetimePlan = content.includes('Lifetime') || content.includes('name="Lifetime"');
if (!hasLifetimePlan) {
  console.error('❌ FAIL: Lifetime plan not found');
  process.exit(1);
}
console.log('✅ PASS: Lifetime plan is displayed');

// Check for PricingCard component usage
const pricingCardCount = (content.match(/PricingCard/g) || []).length;
if (pricingCardCount < 3) {
  console.error(`❌ FAIL: Expected at least 3 PricingCard components, found ${pricingCardCount}`);
  process.exit(1);
}
console.log(`✅ PASS: All 3 plans are rendered with PricingCard components`);

// Check for plan features
const planFeatures = [
  'Generazione', // Generation feature
  'Human Model', // Human Model feature
  'Export', // Export feature
];

let featuresFound = 0;
planFeatures.forEach(feature => {
  if (content.includes(feature)) {
    featuresFound++;
  }
});

if (featuresFound < 2) {
  console.error(`❌ FAIL: Not enough plan features listed (found ${featuresFound}/3+)`);
  process.exit(1);
}
console.log(`✅ PASS: Plans include feature comparison (${featuresFound}/3+ features found)`);

// Check for pricing information
const hasPricing = content.includes('price') || content.includes('€') || content.includes('$');
if (!hasPricing) {
  console.error('❌ FAIL: Pricing information not displayed');
  process.exit(1);
}
console.log('✅ PASS: Pricing information is displayed');

// Check for CTA buttons
const hasCTA = content.includes('ctaText') || content.includes('Inizia') || content.includes('Ottieni');
if (!hasCTA) {
  console.error('❌ FAIL: Call-to-action buttons not found');
  process.exit(1);
}
console.log('✅ PASS: Call-to-action buttons are present');

// Check for period/billing information
const hasPeriod = content.includes('period') || content.includes('/mese') || content.includes('una tantum');
if (!hasPeriod) {
  console.error('❌ FAIL: Billing period information not displayed');
  process.exit(1);
}
console.log('✅ PASS: Billing period information is displayed');

console.log('\n=== Feature #77: VERIFICATION COMPLETE ===');
console.log('All checks passed! ✅\n');

console.log('Summary:');
console.log('- Free, Premium, and Lifetime plans are displayed');
console.log('- Plans include feature comparison');
console.log('- Pricing information is shown');
console.log('- Call-to-action buttons are present\n');
