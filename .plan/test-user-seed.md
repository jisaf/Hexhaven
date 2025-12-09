# Test User Seed Implementation Plan

## Overview
Add database seeding for 3 test users (foo, bar, baz) with password "foobarbaz123" to support development and testing workflows.

## Context Analysis

### Existing Infrastructure
- **Seed system**: `/home/opc/hexhaven/backend/prisma/seed.ts`
  - Uses `upsert` pattern for idempotent seeding
  - Supports both dev (TS) and prod (compiled JS) environments
  - Currently seeds: character classes, ability cards, items, scenarios, card layout templates

- **User model**: `/home/opc/hexhaven/backend/prisma/schema.prisma`
  ```typescript
  model User {
    id           String   @id @default(uuid())
    username     String   @unique
    passwordHash String
    // ... other fields
  }
  ```

- **Password hashing**: `/home/opc/hexhaven/backend/src/services/auth.service.ts:59`
  - Uses `bcrypt` with 12 salt rounds (configurable via BCRYPT_SALT_ROUNDS env var)
  - Pattern: `await bcrypt.hash(password, this.bcryptSaltRounds)`

## Implementation Approach

### Option 1: Add to Existing seed.ts (RECOMMENDED)
**Pros:**
- Single seed file to maintain
- Uses existing infrastructure
- Runs with standard `npm run db:seed` command
- Consistent with other seed data

**Cons:**
- Mixes test users with production seed data
- Test users always created, even in production

### Option 2: Separate seed-test-users.ts
**Pros:**
- Clean separation between prod and test data
- Can run conditionally (NODE_ENV=development)
- Easier to exclude from production

**Cons:**
- Requires separate npm script
- More files to maintain
- Developers must remember to run separate command

**DECISION: Use Option 1** - Add test users to existing seed.ts since:
1. The seed file already contains game data that's development-focused
2. Can add environment check if needed later
3. Simpler developer workflow

## Implementation Steps

### 1. Add seedTestUsers() function to seed.ts
Location: `/home/opc/hexhaven/backend/prisma/seed.ts`

```typescript
async function seedTestUsers() {
  console.log('Seeding test users...');

  // Import bcrypt at top of file
  const bcrypt = require('bcrypt');
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  const testUsers = [
    { username: 'foo' },
    { username: 'bar' },
    { username: 'baz' },
  ];

  const password = 'foobarbaz123'; // 12+ chars, meets validation
  const passwordHash = await bcrypt.hash(password, saltRounds);

  for (const userData of testUsers) {
    await prisma.user.upsert({
      where: { username: userData.username },
      update: {
        passwordHash, // Update password if user exists
      },
      create: {
        username: userData.username,
        passwordHash,
      },
    });
  }

  console.log(`✓ Seeded ${testUsers.length} test users`);
}
```

### 2. Add to main() execution
Location: `/home/opc/hexhaven/backend/prisma/seed.ts:227-242`

Insert after seedCardLayoutTemplates() (line 231):
```typescript
async function main() {
  console.log('Starting database seed...\n');

  try {
    await seedCardLayoutTemplates();
    await seedTestUsers(); // <-- ADD HERE
    await seedCharacterClasses();
    await seedAbilityCards();
    await seedItems();
    await seedScenarios();

    console.log('\n✅ Database seed completed successfully!');
  } catch (error) {
    // ... existing error handling
  }
}
```

**Rationale for placement:**
- Before character classes to ensure users exist if future seeds need user references
- After card layout templates (which have no dependencies)

### 3. Import bcrypt dependency
Location: `/home/opc/hexhaven/backend/prisma/seed.ts:1-3`

Add after existing imports:
```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt'; // <-- ADD HERE
```

**Note:** bcrypt is already in backend/package.json dependencies (v6.0.0)

## Testing Plan

### 1. Manual Verification
```bash
# Run seed
npm run db:seed

# Expected output should include:
# "Seeding test users..."
# "✓ Seeded 3 test users"

# Verify in database
psql -U postgres -d hexhaven_dev -c "SELECT username, created_at FROM users WHERE username IN ('foo', 'bar', 'baz');"
```

### 2. Login Test via API
```bash
# Test login for each user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "foo", "password": "foobarbaz123"}'

# Should return JWT tokens and user data
```

### 3. Re-run Safety Test
```bash
# Run seed twice to verify upsert works
npm run db:seed
npm run db:seed

# Should not create duplicates or fail
```

## Security Considerations

### Password Strength
- "foobarbaz123" is 12 characters (meets minimum requirement)
- Contains lowercase and numbers
- **NOTE:** This is for testing only. Document clearly that these are test accounts

### Environment-Specific Seeding (Future Enhancement)
If needed, can add conditional seeding:
```typescript
async function seedTestUsers() {
  // Only seed test users in development
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠ Skipping test users in production');
    return;
  }
  // ... rest of function
}
```

**Decision:** Not implementing now because:
1. Current seed data (game classes, scenarios) is already development-focused
2. Can add later if production deployment requires it
3. Simpler initial implementation

## Files to Modify

1. `/home/opc/hexhaven/backend/prisma/seed.ts`
   - Add bcrypt import (line ~3)
   - Add seedTestUsers() function (after seedCardLayoutTemplates)
   - Call seedTestUsers() in main() (line ~232)

## Acceptance Criteria

- [ ] Seed script successfully creates 3 users: foo, bar, baz
- [ ] All users have password "foobarbaz123" (properly hashed with bcrypt)
- [ ] Can log in with each test user via auth API
- [ ] Re-running seed doesn't create duplicates or fail
- [ ] Seed output shows "✓ Seeded 3 test users"
- [ ] No lint or type errors in seed.ts

## Rollback Plan

If issues arise:
1. Remove seedTestUsers() function
2. Remove import for bcrypt
3. Remove seedTestUsers() call from main()
4. Run `npm run db:seed` to verify other seeds still work

## Future Enhancements

1. Add email addresses to test users for email-related testing
2. Create test users with different permission levels (if roles added)
3. Add environment check to skip in production
4. Create test characters for each test user
