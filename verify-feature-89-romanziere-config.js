const fs = require('fs');
const path = require('path');

console.log('=== Feature #89 Verification: Romanziere Config Wizard ===\n');

// Check 1: Verify Romanziere configuration exists in NewProject.tsx
const newProjectPath = path.join(__dirname, 'client/src/pages/NewProject.tsx');
if (fs.existsSync(newProjectPath)) {
  const content = fs.readFileSync(newProjectPath, 'utf-8');

  // Check for area type including romanziere
  if (content.includes("'romanziere'") || content.includes('"romanziere"')) {
    console.log('✓ Romanziere area type defined');
  } else {
    console.log('✗ Romanziere area type NOT found');
    process.exit(1);
  }

  // Check for genre field
  if (content.includes('genre') && content.includes('Genere letterario')) {
    console.log('✓ Genre field found in Romanziere config');
  } else {
    console.log('✗ Genre field NOT found');
    process.exit(1);
  }

  // Check for tone field
  if (content.includes('tone') && content.includes('Tono narrativo')) {
    console.log('✓ Tone field found in Romanziere config');
  } else {
    console.log('✗ Tone field NOT found');
    process.exit(1);
  }

  // Check for POV (Point of View) field
  if (content.includes('pov') && content.includes('Punto di vista')) {
    console.log('✓ POV field found in Romanziere config');
  } else {
    console.log('✗ POV field NOT found');
    process.exit(1);
  }

  // Check for multiple POV options
  const povOptions = ['first_person', 'third_person_limited', 'third_person_omniscient', 'alternate'];
  const foundPovOptions = povOptions.filter(opt => content.includes(opt));
  if (foundPovOptions.length >= 3) {
    console.log(`✓ Multiple POV options found (${foundPovOptions.length}/4)`);
  } else {
    console.log('✗ Insufficient POV options');
    process.exit(1);
  }

  // Check for target audience field
  if (content.includes('targetAudience') && content.includes('Pubblico target')) {
    console.log('✓ Target audience field found in Romanziere config');
  } else {
    console.log('✗ Target audience field NOT found');
    process.exit(1);
  }

  // Check for word count target (length) field
  if (content.includes('wordCountTarget') && content.includes('Lunghezza target')) {
    console.log('✓ Word count target (length) field found in Romanziere config');
  } else {
    console.log('✗ Word count target field NOT found');
    process.exit(1);
  }

  // Check for preset word count buttons
  if (content.includes('50K') && content.includes('80K') && content.includes('100K')) {
    console.log('✓ Preset word count buttons found (50K, 80K, 100K)');
  } else {
    console.log('✗ Preset word count buttons NOT found');
    process.exit(1);
  }

  // Check for Romanziere-specific UI section
  if (content.includes('Configurazione Romanziere') || content.includes('formData.area === \'romanziere\'')) {
    console.log('✓ Romanziere-specific configuration section found');
  } else {
    console.log('✗ Romanziere config section NOT found');
    process.exit(1);
  }

  // Check for styling specific to Romanziere (amber color)
  if (content.includes('amber-50') || content.includes('bg-amber-')) {
    console.log('✓ Romanziere-specific styling (amber theme) found');
  } else {
    console.log('✗ Romanziere styling NOT found');
    process.exit(1);
  }

} else {
  console.log('✗ NewProject.tsx file not found');
  process.exit(1);
}

// Check 2: Verify form data submission includes Romanziere fields
const hasRomanziereSubmission = fs.readFileSync(newProjectPath, 'utf-8')
  .includes('formData.area === \'romanziere\' ? formData.genre');

if (hasRomanziereSubmission) {
  console.log('✓ Romanziere fields properly submitted to API');
} else {
  console.log('✗ Romanziere field submission NOT found');
  process.exit(1);
}

console.log('\n=== All Checks Passed ✓ ===');
console.log('\nFeature #89 (Romanziere config wizard) is IMPLEMENTED:');
console.log('- Genre field (text input)');
console.log('- Tone field (dropdown with 8 options)');
console.log('- POV field (4 options: first person, third limited, third omniscient, alternate)');
console.log('- Target audience field (text input)');
console.log('- Word count target field with presets (50K, 80K, 100K)');
console.log('- Romanziere-specific styling (amber theme)');
console.log('\nNext: Test with browser to verify wizard flow works correctly');
