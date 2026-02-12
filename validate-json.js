const fs = require('fs');

const enPath = 'client/src/i18n/locales/en.json';
const itPath = 'client/src/i18n/locales/it.json';

try {
  JSON.parse(fs.readFileSync(enPath, 'utf8'));
  console.log('✓ en.json: Valid JSON');
} catch(e) {
  console.error('✗ en.json: Invalid JSON -', e.message);
  process.exit(1);
}

try {
  JSON.parse(fs.readFileSync(itPath, 'utf8'));
  console.log('✓ it.json: Valid JSON');
} catch(e) {
  console.error('✗ it.json: Invalid JSON -', e.message);
  process.exit(1);
}

// Check for required keys
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const it = JSON.parse(fs.readFileSync(itPath, 'utf8'));

const requiredKeys = [
  'dashboard.onboarding.welcome',
  'dashboard.onboarding.subtitle',
  'dashboard.onboarding.gettingStarted',
  'dashboard.onboarding.step1',
  'dashboard.onboarding.step1Desc',
  'dashboard.onboarding.step2',
  'dashboard.onboarding.step2Desc',
  'dashboard.onboarding.step3',
  'dashboard.onboarding.step3Desc',
  'dashboard.onboarding.chooseArea',
  'dashboard.onboarding.importOption',
  'dashboard.onboarding.importDesc',
  'dashboard.onboarding.importProject',
  'dashboard.onboarding.close',
  'dashboard.onboarding.areas.romanziere.title',
  'dashboard.onboarding.areas.romanziere.description',
  'dashboard.onboarding.areas.romanziere.feature1',
  'dashboard.onboarding.areas.romanziere.feature2',
  'dashboard.onboarding.areas.romanziere.feature3',
  'dashboard.onboarding.areas.romanziere.feature4',
  'dashboard.onboarding.areas.saggista.title',
  'dashboard.onboarding.areas.saggista.description',
  'dashboard.onboarding.areas.saggista.feature1',
  'dashboard.onboarding.areas.saggista.feature2',
  'dashboard.onboarding.areas.saggista.feature3',
  'dashboard.onboarding.areas.saggista.feature4',
  'dashboard.onboarding.areas.redattore.title',
  'dashboard.onboarding.areas.redattore.description',
  'dashboard.onboarding.areas.redattore.feature1',
  'dashboard.onboarding.areas.redattore.feature2',
  'dashboard.onboarding.areas.redattore.feature3',
  'dashboard.onboarding.areas.redattore.feature4'
];

function checkKey(obj, key) {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || !current.hasOwnProperty(part)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

let allKeysPresent = true;
for (const key of requiredKeys) {
  const enExists = checkKey(en, key);
  const itExists = checkKey(it, key);
  if (!enExists || !itExists) {
    console.log(`✗ Missing key: ${key} (en: ${enExists}, it: ${itExists})`);
    allKeysPresent = false;
  }
}

if (allKeysPresent) {
  console.log('✓ All required translation keys present');
  console.log('\nFeature #191: OnboardingGuide i18n implementation complete!');
} else {
  process.exit(1);
}
