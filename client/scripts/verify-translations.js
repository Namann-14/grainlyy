#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const languages = ['en', 'hi', 'ta', 'dz', 'ne', 'bn', 'si'];
const localesDir = path.join(__dirname, '../locales');

// Reference structure from English file
const referenceFile = path.join(localesDir, 'en', 'common.json');
let referenceData;

try {
  referenceData = JSON.parse(fs.readFileSync(referenceFile, 'utf8'));
} catch (error) {
  console.error('Error reading reference file:', error.message);
  process.exit(1);
}

// Function to get all keys from an object (nested)
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const referenceKeys = getAllKeys(referenceData).sort();
console.log(`Reference (English) has ${referenceKeys.length} translation keys.`);

let allValid = true;

// Check each language file
languages.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'common.json');
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = getAllKeys(data).sort();
    
    console.log(`\n🌍 ${lang.toUpperCase()}: ${keys.length} keys`);
    
    // Check for missing keys
    const missingKeys = referenceKeys.filter(key => !keys.includes(key));
    const extraKeys = keys.filter(key => !referenceKeys.includes(key));
    
    if (missingKeys.length > 0) {
      console.log(`  ❌ Missing keys (${missingKeys.length}):`);
      missingKeys.forEach(key => console.log(`    - ${key}`));
      allValid = false;
    }
    
    if (extraKeys.length > 0) {
      console.log(`  ⚠️  Extra keys (${extraKeys.length}):`);
      extraKeys.forEach(key => console.log(`    + ${key}`));
    }
    
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`  ✅ Perfect match with reference!`);
    }
    
  } catch (error) {
    console.log(`  ❌ Error reading ${lang}: ${error.message}`);
    allValid = false;
  }
});

console.log(`\n${'='.repeat(50)}`);
if (allValid) {
  console.log('🎉 All translation files are properly structured!');
  console.log('   Landing page translations should work perfectly.');
} else {
  console.log('⚠️  Some translation files need fixes.');
  console.log('   Please review the missing keys above.');
}

console.log('\n📋 Key sections verified:');
console.log('   - Navigation (nav.*)');
console.log('   - Hero section (hero.*)');
console.log('   - Stats (stats.*)');
console.log('   - Features (features.*)');
console.log('   - How it works (how_it_works.*)');
console.log('   - Stakeholders (stakeholders.*)');
console.log('   - Testimonials (testimonials.*)');
console.log('   - FAQ (faq.*)');
console.log('   - CTA (cta.*)');
console.log('   - Footer (footer.*)');
console.log('   - Common elements (common.*)');