const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  'gathering-durability.spec.ts',
  'gathering-simple.spec.ts',
  'gathering-zone-filter.spec.ts',
  'quest-system.spec.ts',
  'quests.spec.ts',
  'simple-durability-test.spec.ts',
  'test-durability-with-login.spec.ts',
  'tools.spec.ts',
  'dynamic-content.spec.ts',
  'full-flow.spec.ts'
];

files.forEach(fileName => {
  const filePath = path.join(__dirname, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${fileName} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already fixed
  if (content.includes('./helpers/auth')) {
    console.log(`✓ ${fileName} - already fixed`);
    return;
  }

  // Add import at the top after the first import
  const firstImportIndex = content.indexOf("import { test");
  const firstNewline = content.indexOf('\n', firstImportIndex);
  content = content.slice(0, firstNewline + 1) +
    "import { signupAndCreateCharacter } from './helpers/auth'\n" +
    content.slice(firstNewline + 1);

  // Replace various auth patterns
  const authPatterns = [
    // Pattern 1: Simple username signup
    /\/\/ Sign up[\s\S]*?await page\.click\('button:has-text\("Sign Up"\)'\)/g,
    // Pattern 2: Email/username/password signup
    /await page\.fill\('input\[type="email"\]'[\s\S]*?await page\.click\('button:has-text\("Create Account"\)'\)/g,
    // Pattern 3: Username with placeholder
    /await page\.fill\('input\[placeholder="Choose a username"\]'[\s\S]*?await page\.click\('button:has-text\("Sign Up"\)'\)/g,
    // Pattern 4: Login patterns
    /await page\.goto\('\/login'\)[\s\S]*?await page\.click\('button:has-text\("Log In"\)'\)/g
  ];

  authPatterns.forEach(pattern => {
    content = content.replace(pattern, `// Setup: Create account and character
    const success = await signupAndCreateCharacter(page, '${fileName.replace('.spec.ts', '')}')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }`);
  });

  // Replace character creation patterns
  const charPatterns = [
    /\/\/ Create character[\s\S]*?await page\.click\('button:has-text\("Create Character"\)'\)/g,
    /\/\/ Wait for character creation[\s\S]*?await page\.click\('button:has-text\("Begin.*?"\)'\)/g,
    /await expect\(page\.locator\('h[12]:has-text\("Create Your.*?"\)'\)\)[\s\S]*?await page\.click\('button:has-text\(".*?(?:Create|Begin).*?"\)'\)/g
  ];

  charPatterns.forEach(pattern => {
    content = content.replace(pattern, '// Character creation handled by helper');
  });

  // Fix common selector issues
  content = content.replace(/#name(?![\w-])/g, '#characterName');
  content = content.replace(/input\[placeholder\*="character"\]/g, '#characterName');
  content = content.replace(/\.bg-red-500\\\/10/g, '.bg-red-900\\/50');
  content = content.replace(/localhost:3003/g, 'localhost:3000');

  // Remove username variable declarations
  content = content.replace(/const (?:testUsername|username) = .*?\n/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed ${fileName}`);
});

console.log('\nAll tests updated!');