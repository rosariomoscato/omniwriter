// Verification script for Feature #181 - Character relationship mapping
const fs = require('fs');
const path = require('path');

console.log('=== Feature #181: Character Relationship Mapping ===\n');

let checksPassed = 0;
let totalChecks = 0;

// 1. Check RelationshipMap component exists
console.log('1. Checking RelationshipMap component...');
const componentPath = path.join(__dirname, 'client/src/components/RelationshipMap.tsx');
const componentExists = fs.existsSync(componentPath);
totalChecks++;
if (componentExists) {
  console.log('   ✓ RelationshipMap component exists: YES');
  checksPassed++;

  const componentCode = fs.readFileSync(componentPath, 'utf-8');

  // Check for key functionality
  const hasEdgeState = componentCode.includes('useState<Edge[]>([])');
  const hasNodeState = componentCode.includes('useState<Node[]>([])');
  const hasAddDialog = componentCode.includes('showAddDialog');
  const hasEdgeDetail = componentCode.includes('selectedEdge');
  const hasRelationshipColor = componentCode.includes('getRelationshipColor');

  totalChecks += 5;
  if (hasEdgeState) checksPassed++;
  if (hasNodeState) checksPassed++;
  if (hasAddDialog) checksPassed++;
  if (hasEdgeDetail) checksPassed++;
  if (hasRelationshipColor) checksPassed++;

  console.log(`   ✓ Has relationship state: ${hasEdgeState ? 'YES' : 'NO'}`);
  console.log(`   ✓ Has node state: ${hasNodeState ? 'YES' : 'NO'}`);
  console.log(`   ✓ Has add dialog: ${hasAddDialog ? 'YES' : 'NO'}`);
  console.log(`   ✓ Has edge detail dialog: ${hasEdgeDetail ? 'YES' : 'NO'}`);
  console.log(`   ✓ Has relationship color mapping: ${hasRelationshipColor ? 'YES' : 'NO'}`);

  // Check for visual elements
  const hasSvgLayer = componentCode.includes('<svg');
  const hasNodeCircles = componentCode.includes('rounded-full');
  const hasEdgeLines = componentCode.includes('<line');
  const hasLegend = componentCode.includes('Legend');

  totalChecks += 4;
  if (hasSvgLayer) checksPassed++;
  if (hasNodeCircles) checksPassed++;
  if (hasEdgeLines) checksPassed++;
  if (hasLegend) checksPassed++;

  console.log(`\n   Visual elements:`);
  console.log(`   ✓ SVG layer for edges: ${hasSvgLayer ? 'YES' : 'NO'}`);
  console.log(`   ✓ Node circles for characters: ${hasNodeCircles ? 'YES' : 'NO'}`);
  console.log(`   ✓ Edge lines for connections: ${hasEdgeLines ? 'YES' : 'NO'}`);
  console.log(`   ✓ Color legend: ${hasLegend ? 'YES' : 'NO'}`);
} else {
  console.log('   ✗ RelationshipMap component exists: NO');
}

// 2. Check ProjectDetail integration
console.log('\n2. Checking ProjectDetail.tsx integration...');
const projectDetailPath = path.join(__dirname, 'client/src/pages/ProjectDetail.tsx');
const projectDetailCode = fs.readFileSync(projectDetailPath, 'utf-8');

const hasRelationshipMapImport = projectDetailCode.includes("import RelationshipMap from '../components/RelationshipMap'");
const hasShowRelationshipMapState = projectDetailCode.includes('showRelationshipMap');
const hasRelationshipMapButton = projectDetailCode.includes('Relationship Map');
const hasRelationshipMapComponent = projectDetailCode.includes('<RelationshipMap');
const hasAddRelationshipHandler = projectDetailCode.includes('handleAddRelationship');

totalChecks += 5;
if (hasRelationshipMapImport) checksPassed++;
if (hasShowRelationshipMapState) checksPassed++;
if (hasRelationshipMapButton) checksPassed++;
if (hasRelationshipMapComponent) checksPassed++;
if (hasAddRelationshipHandler) checksPassed++;

console.log(`   ✓ RelationshipMap import: ${hasRelationshipMapImport ? 'YES' : 'NO'}`);
console.log(`   ✓ showRelationshipMap state: ${hasShowRelationshipMapState ? 'YES' : 'NO'}`);
console.log(`   ✓ "Relationship Map" button: ${hasRelationshipMapButton ? 'YES' : 'NO'}`);
console.log(`   ✓ <RelationshipMap> component: ${hasRelationshipMapComponent ? 'YES' : 'NO'}`);
console.log(`   ✓ handleAddRelationship handler: ${hasAddRelationshipHandler ? 'YES' : 'NO'}`);

// Check handler implementation
if (hasAddRelationshipHandler) {
  const updatesCharacter = projectDetailCode.includes("updateCharacter(fromCharacterId");
  const parsesRelationships = projectDetailCode.includes('JSON.parse(fromCharacter.relationships_json)');
  const addsToRelationships = projectDetailCode.includes('relationships.push(');
  const showsToast = projectDetailCode.includes('toast.success(`Relationship added');

  totalChecks += 4;
  if (updatesCharacter) checksPassed++;
  if (parsesRelationships) checksPassed++;
  if (addsToRelationships) checksPassed++;
  if (showsToast) checksPassed++;

  console.log(`\n   Handler implementation:`);
  console.log(`   ✓ Updates character via API: ${updatesCharacter ? 'YES' : 'NO'}`);
  console.log(`   ✓ Parses existing relationships: ${parsesRelationships ? 'YES' : 'NO'}`);
  console.log(`   ✓ Adds to relationships array: ${addsToRelationships ? 'YES' : 'NO'}`);
  console.log(`   ✓ Shows success toast: ${showsToast ? 'YES' : 'NO'}`);
}

// 3. Check button only shows with 2+ characters
const hasCharacterCountCheck = projectDetailCode.includes('characters.length >= 2');
totalChecks++;
if (hasCharacterCountCheck) checksPassed++;
console.log(`\n   ✓ Button only shows with 2+ characters: ${hasCharacterCountCheck ? 'YES' : 'NO'}`);

// Summary
console.log('\n=== Summary ===');
console.log(`Checks passing: ${checksPassed}/${totalChecks}`);

if (checksPassed === totalChecks) {
  console.log('\n✅ Feature #181 implementation complete!');
  console.log('\nManual testing steps:');
  console.log('1. Create a Romanziere project');
  console.log('2. Create at least 2 characters');
  console.log('3. Click "Relationship Map" button in Characters section');
  console.log('4. Verify visual map shows characters as nodes');
  console.log('5. Click on a character node to add relationship');
  console.log('6. Select "To Character" and "Relationship Type"');
  console.log('7. Click "Add Relationship"');
  console.log('8. Verify new edge appears on the map');
  console.log('9. Click on an edge to see relationship details');
  console.log('10. Close map and reopen - verify relationships persist');
} else {
  console.log('\n⚠ Some checks failed');
  console.log(`  Passed: ${checksPassed}/${totalChecks}`);
}

console.log('\n=== Verification complete ===');
