# Test Data Factories

Shared patterns for creating reusable test data across IT, API, and E2E test layers.

## Core Principle

> **Define once, use everywhere.** Test data factories should be defined in a shared location (`src/testFixtures/` or `tests/factories/`) and consumed by all test layers. Each layer accesses data in the way most natural for its testing style.

## Data Factory Patterns by Language

### Java — Builder + Factory

```java
// src/testFixtures/java/com/example/factories/UserTestData.java
package com.example.factories;

import com.example.model.User;

public class UserTestData {

    public static User.UserBuilder aDefaultUser() {
        return User.builder()
            .name("Test User")
            .email("test@example.com")
            .role(UserRole.USER);
    }

    public static User.UserBuilder anAdminUser() {
        return aDefaultUser()
            .role(UserRole.ADMIN)
            .email("admin@example.com");
    }

    public static User.UserBuilder aUserWithEmail(String email) {
        return aDefaultUser().email(email);
    }

    // Valid complete user for persistence tests
    public static User aSavedUser(UserRepository repo) {
        User user = aDefaultUser().build();
        return repo.save(user);
    }
}
```

### Python — Factory Functions + Fixtures

```python
# tests/factories/user_factory.py
import factory  # factory_boy library
from myapp.models import User

class UserFactory(factory.Factory):
    class Meta:
        model = User

    name = factory.Faker("name")
    email = factory.Faker("email")
    role = "user"

    @classmethod
    def admin(cls, **kwargs):
        return cls(role="admin", **kwargs)

# Or simple functions:
def make_user(**overrides):
    defaults = {"name": "Test User", "email": "test@example.com", "role": "user"}
    return {**defaults, **overrides}
```

### TypeScript — Factory Functions

```typescript
// tests/factories/user.factory.ts
import { User, UserRole } from '../../src/models/user';

export const aDefaultUser = (overrides?: Partial<User>): User => ({
  id: 'usr-001',
  name: 'Test User',
  email: 'test@example.com',
  role: UserRole.USER,
  ...overrides,
});

export const anAdminUser = (overrides?: Partial<User>): User =>
  aDefaultUser({ role: UserRole.ADMIN, email: 'admin@example.com', ...overrides });
```

## Layer-Specific Data Access Patterns

### Integration Tests (IT)

Data is injected directly via Repository/ORM — bypasses the API layer:

```java
// Java IT
@Autowired private UserRepository repository;
User user = repository.save(UserTestData.aDefaultUser().build());

// Python IT
user = UserFactory.create()

// TypeScript IT
const user = await prisma.user.create({ data: aDefaultUser() });
```

### API Tests

Data is created through the API under test (validates the write path) or via direct DB as fallback:

```typescript
// Preferred: create via API (exercises POST endpoint)
const res = await request(app)
  .post('/api/users')
  .send(aDefaultUser());
const userId = res.body.id;

// Fallback: direct DB seed for complex prerequisites
await seedUser(aDefaultUser({ role: UserRole.ADMIN }));
```

### E2E Tests

Data is pre-seeded via DB scripts or API seed endpoints before the browser test runs:

```typescript
// Seed via DB before test
test.beforeAll(async () => {
  await seedDatabase({
    users: [aDefaultUser(), anAdminUser()],
  });
});

// Or seed via API
test.beforeAll(async () => {
  await request.post('/api/seed/users').send([aDefaultUser()]);
});
```

## Data Cleanup Strategies

| Strategy | When to Use | Implementation |
|----------|-----------|----------------|
| **Rollback per test** | Fastest; requires transaction support | `@Transactional` (Spring), `transaction=True` (pytest-django) |
| **Delete in teardown** | When transactions aren't available | `@AfterEach` / `teardown_method` / `afterEach` |
| **Unique data per test** | Distributed/parallel tests | UUID suffixes on emails, unique usernames |
| **Truncate all per suite** | E2E tests with full DB reset | `@BeforeAll` seed script |

## When to Use Each Method (Decision Flow)

```
Can you use transactions for rollback?
├── Yes → Use rollback per test (fastest, cleanest)
└── No (distributed, multiple DBs, E2E)
    └── Can you use unique data per test?
        ├── Yes → Use UUID-suffixed data (works with parallel execution)
        └── No → Truncate and reseed per suite (slowest, most thorough)
```
