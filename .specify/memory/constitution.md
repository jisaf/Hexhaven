<!--
SYNC IMPACT REPORT - Constitution v1.4.0
================================================================================
Version Change: 1.3.1 → 1.4.0 (MINOR - new CI/CD requirements)
Last Amendment: 2025-11-09

Changes in v1.4.0:
- Added new CI/CD Pipeline Requirements section under Quality Gates
  - GitHub Actions checks MUST pass before merge (NON-NEGOTIABLE)
  - Backend checks: lint, type check, tests, build
  - Frontend checks: lint, type check, tests, build
  - E2E tests run after all builds pass
  - Common failure patterns documented with solutions
  - Enum usage patterns (value imports vs type-only imports)
  - Async/await patterns (remove when unnecessary)
  - Frontend ESLint config requirements (tseslint.config format)
  - React hooks patterns (avoid cascading renders)

Changes in v1.3.1:
- Enhanced Quality Gates with explicit Task Completion Gates
  - Created separate TASK COMPLETION GATES section (critical requirement)
  - Tasks CANNOT be marked done until: all tests pass, code builds, no lint/type errors
  - Tasks MUST NOT be reported to user until all gates pass
  - If gates fail: task remains in-progress, NO exceptions
  - Reinforces Testing Standards principle (tests pass before reporting complete)
  - Separated task completion (no exceptions) from merge gates (can have exceptions)

Changes in v1.3.0:
- Enhanced Documentation & Communication with AI-First Documentation principle
  - All documentation MUST be optimized for AI agent comprehension
  - Enable AI to build complete project picture in <5 minutes
  - Top-Down Context: README → ARCHITECTURE.md → module-level docs
  - Explicit Over Implicit: document WHY, not just WHAT; no tribal knowledge
  - Scannable Formats: bullets, tables, diagrams, code examples, cross-references
  - Enhanced all doc sections: spec docs link to architecture, APIs include examples
  - README must include architecture diagram and navigation guide

Changes in v1.2.0:
- Enhanced User Experience Consistency with cross-platform and i18n requirements
  - Added Cross-Platform Compatibility: mobile and desktop support mandatory
    - Responsive design required
    - Test on multiple screen sizes and orientations
    - Mobile-first approach for web interfaces
  - Added Internationalization (i18n): multi-lingual UI from day one
    - All user-facing text MUST be extracted for translation
    - No hardcoded strings in UI code
    - Use i18n framework/library
    - RTL layout support where applicable
    - Locale-aware formatting for dates, times, numbers, currency

Changes in v1.1.1:
- Clarified Continuous Integration section in Testing Standards
  - Tests MUST pass before reporting task completion to user
  - Task remains in-progress if tests fail
  - Explicit requirement to run full test suite before marking work done
  - Added "no works on my machine" clause - CI verification required

Changes in v1.1.0:
- Enhanced Code Quality & Maintainability principle with YAGNI and KISS
  - Added YAGNI: no speculative features, build for current requirements
  - Added KISS: simplest solution, avoid unnecessary complexity
  - Both principles link to Complexity Justification section

Previous Changes (v1.0.0 - 2025-11-07):
- Initial constitution with 6 core principles
- I. Code Quality & Maintainability
- II. Testing Standards (TDD mandatory)
- III. User Experience Consistency
- IV. Performance Requirements
- V. Documentation & Communication
- VI. Security & Reliability

Templates Updated:
- ✅ .specify/templates/plan-template.md - Constitution Check fully synchronized with all principles:
  - Code Quality: YAGNI, KISS, DRY principles
  - Testing: Task completion gates, CI verification
  - UX: Cross-platform and i18n requirements
  - Documentation: AI-first strategy
  - Quality Gates: Task completion requirements
- ✅ .specify/templates/spec-template.md - Aligned with UX principles and documentation standards
- ✅ .specify/templates/tasks-template.md - Aligned with testing standards
- ✅ .specify/templates/checklist-template.md - Compatible with all principles

Follow-up Actions:
- None - all templates fully synchronized with constitution v1.3.1
================================================================================
-->

# HexHaven Constitution

## Core Principles

### I. Code Quality & Maintainability

**All code MUST meet these standards:**

- **Single Responsibility**: Each module, class, or function has ONE clear purpose
- **DRY (Don't Repeat Yourself)**: No duplicated logic; extract common patterns into reusable components
- **YAGNI (You Aren't Gonna Need It)**: Do not add functionality until it is actually needed
  - No speculative features or "future-proofing"
  - Build for current requirements, not imagined future needs
  - Refactor when requirements change, don't preemptively architect for them
- **KISS (Keep It Simple, Stupid)**: Choose the simplest solution that solves the problem
  - Avoid unnecessary abstractions, patterns, or frameworks
  - Prefer straightforward code over clever code
  - Complex solutions require justification (see Complexity Justification section)
- **Readability First**: Code is written for humans first, machines second
  - Meaningful variable/function names (no abbreviations unless industry-standard)
  - Maximum function length: 50 lines (excluding comments/whitespace)
  - Maximum file length: 500 lines
  - Maximum cyclomatic complexity: 10 per function
- **Type Safety**: Use static typing wherever available (TypeScript, Python type hints, etc.)
- **Linting & Formatting**: All code MUST pass configured linters and auto-formatters with zero warnings
- **Code Review**: No code merges without approval from at least one other developer
- **Dependency Management**: Keep dependencies minimal, up-to-date, and audited for security

**Rationale**: Maintainable code reduces technical debt, accelerates feature development, and minimizes bugs. Code is read 10x more than it's written.

### II. Testing Standards (NON-NEGOTIABLE)

**Test-Driven Development (TDD) is MANDATORY for all new features:**

- **Red-Green-Refactor Cycle**: Write failing test → Implement feature → Refactor
- **Test Types Required**:
  - **Unit Tests**: Cover all business logic, target 80%+ code coverage
  - **Integration Tests**: Verify component interactions and data flows
  - **Contract Tests**: Validate API/interface contracts when applicable
  - **End-to-End Tests**: Cover critical user journeys (minimum P1 user stories)
- **Test Quality Standards**:
  - Tests MUST be deterministic (no flaky tests allowed in main branch)
  - Each test has clear Given-When-Then structure
  - Tests are fast (<100ms for unit, <5s for integration)
  - Mock external dependencies appropriately
- **Continuous Integration & Task Completion**:
  - All tests MUST pass before merge
  - All tests MUST pass before reporting a task as complete to the user
  - Run full test suite before marking work as done
  - If tests fail, task remains in-progress until fixed
- **Test Documentation**: Complex test scenarios documented inline

**Rationale**: Testing is not optional. TDD catches bugs early, serves as living documentation, and enables fearless refactoring. High-quality tests are the foundation of reliable software.

### III. User Experience Consistency

**All user-facing interfaces MUST provide consistent, intuitive experiences:**

- **User Story Driven**: Every feature begins with prioritized user stories (P1, P2, P3...)
- **Acceptance Criteria**: Each story has testable Given-When-Then scenarios
- **Independent Testability**: Each user story can be tested and delivered independently as an MVP slice
- **Error Handling**:
  - User-friendly error messages (no raw stack traces)
  - Clear guidance on what went wrong and how to fix it
  - Graceful degradation when features fail
- **Feedback & Responsiveness**:
  - Loading indicators for operations >200ms
  - Progress indicators for long-running operations
  - Immediate visual feedback for user actions
- **Accessibility**: Follow WCAG 2.1 AA standards minimum
- **Cross-Platform Compatibility**:
  - All UX MUST work on both mobile and desktop
  - Responsive design required (adaptive layouts, touch-friendly targets)
  - Test on multiple screen sizes and orientations
  - No platform-specific features unless explicitly scoped
  - Mobile-first approach for web interfaces
- **Internationalization (i18n)**:
  - All user-facing text MUST be extracted for translation
  - No hardcoded strings in UI code
  - Use i18n framework/library for all text content
  - Support multi-lingual UI from day one
  - Text expansion considerations (languages vary 30-50% in length)
  - RTL (right-to-left) layout support where applicable
  - Date, time, number, and currency formatting must be locale-aware
- **Consistency**:
  - Uniform terminology across all interfaces
  - Consistent navigation patterns
  - Predictable behavior (similar actions = similar results)
- **Documentation**: Quickstart guides for all user-facing features

**Rationale**: Users don't care about technical excellence if the product is hard to use. Consistent UX reduces training time, support burden, and user frustration.

### V. Documentation & Communication

**Documentation is code and MUST be maintained with the same rigor:**

- **AI-First Documentation**:
  - All documentation MUST be optimized for AI agent comprehension
  - Enable AI to build complete mental model of project quickly (<5 min reading time)
  - Structure for rapid scanning: clear headers, concise summaries, predictable organization
  - **Top-Down Context**: Start with high-level overview, then drill into details
    - README.md: Project purpose, architecture overview, quick start
    - docs/ARCHITECTURE.md: System design, component relationships, data flows
    - Each module: Brief purpose statement at top of file
  - **Explicit Over Implicit**: State assumptions, constraints, and invariants clearly
    - No "tribal knowledge" - if it's not written, it doesn't exist
    - Document WHY decisions were made, not just WHAT was implemented
    - Link related concepts explicitly (cross-references between docs/code)
  - **Scannable Formats**:
    - Use bullet points, tables, and diagrams over long prose
    - Code examples for common operations
    - Consistent terminology (use glossary for domain terms)
    - File/function references with line numbers where applicable
- **Specification First**:
  - Every feature requires spec.md with user stories and requirements
  - Planning document (plan.md) defines technical approach before implementation
  - Task breakdown (tasks.md) organizes work by user story priority
  - All spec docs include context section linking to relevant architecture
- **Code Documentation**:
  - Public APIs documented with docstrings/JSDoc (inputs, outputs, side effects, examples)
  - Complex algorithms explained with inline comments (WHY, not just WHAT)
  - Architectural decisions recorded in docs/ or ADR (Architecture Decision Records)
  - Module-level documentation explaining purpose and relationships
- **User Documentation**:
  - quickstart.md for getting started (working example in <5 minutes)
  - README.md kept current with project status, architecture diagram, navigation guide
  - API documentation auto-generated from code annotations
  - docs/ directory with clear index and navigation
- **Communication Standards**:
  - Commit messages follow conventional commits format
  - PR descriptions include context, testing done, and risk assessment
  - Breaking changes flagged prominently with migration guide

**Rationale**: Documentation prevents knowledge silos, accelerates onboarding (human and AI), and ensures institutional memory. AI agents with full context deliver better results faster. Undocumented features are unmaintainable features.

### VI. Security & Reliability

**Security and reliability are design constraints, not add-ons:**

- **Security Standards**:
  - Input validation on all user inputs (prevent injection attacks)
  - Output encoding to prevent XSS
  - Authentication and authorization on all protected resources
  - Secrets never committed to version control
  - Dependencies audited regularly for vulnerabilities
  - Principle of least privilege for all access controls
- **Reliability Standards**:
  - Idempotent operations where possible
  - Graceful error handling (no silent failures)
  - Transaction boundaries clearly defined
  - Data validation before persistence
  - Backup and recovery procedures documented
- **Observability**:
  - Structured logging with appropriate levels (DEBUG, INFO, WARN, ERROR)
  - Correlation IDs for request tracing
  - Metrics for business and technical KPIs
  - Health check endpoints for all services

**Rationale**: Security breaches and reliability failures destroy user trust and can be catastrophic. Proactive security and reliability practices are far cheaper than reactive incident response.

## Development Workflow

**The specification-driven development workflow MUST be followed:**

1. **Specification Phase**: Use `/speckit.specify` to create spec.md with user stories
2. **Planning Phase**: Use `/speckit.plan` to create plan.md with technical approach
3. **Task Breakdown**: Use `/speckit.tasks` to generate tasks.md organized by user story
4. **Implementation Phase**: Execute tasks in priority order (P1 → P2 → P3)
5. **Testing Phase**: Validate each user story independently
6. **Review & Merge**: Code review, constitution compliance check, merge

**Each phase has explicit outputs and gates:**
- Specification gate: User stories prioritized, acceptance criteria clear
- Planning gate: Constitution Check passed, complexity justified
- Task gate: Dependencies identified, parallel opportunities marked
- Implementation gate: Tests passing, code reviewed
- Release gate: All P1 stories complete and independently tested

## Quality Gates

**TASK COMPLETION GATES (CRITICAL - Tasks cannot be marked done until ALL pass):**

A task CANNOT be considered complete and MUST NOT be reported to the user until:

- ✅ **All tests pass** (unit, integration, contract, e2e as applicable)
- ✅ **Code builds without errors** (compilation, bundling, packaging all succeed)
- ✅ **No linting errors or warnings**
- ✅ **Type checking passes** (if applicable)

**If any gate fails:**
- Task remains in-progress status
- Fix issues before reporting completion
- Do not tell the user work is complete if tests are failing or code won't build
- This is NON-NEGOTIABLE - no exceptions

**CODE MERGE GATES (Code CANNOT be merged unless ALL pass):**

- ✅ All task completion gates above (tests, build, linting, types)
- ✅ Code coverage meets threshold (80%+ for new code)
- ✅ Security audit passes (no high/critical vulnerabilities)
- ✅ Performance benchmarks meet requirements
- ✅ Code review approved
- ✅ Documentation updated
- ✅ Constitution compliance verified

**Exceptions require:**
- Written justification in Complexity Tracking section of plan.md
- Explicit approval from tech lead
- Remediation plan with timeline
- Note: Task completion gates have NO exceptions - they are absolute requirements

### CI/CD Pipeline Requirements (NON-NEGOTIABLE)

**Every pull request MUST pass all GitHub Actions checks before merging.**

**Backend Requirements:**
- `npm run lint` MUST pass with zero errors
- `npx tsc --noEmit` MUST pass (type checking)
- `npm test` MUST pass with adequate coverage
- `npm run build` MUST succeed

**Frontend Requirements:**
- `npm run lint` MUST pass with zero errors (warnings allowed)
- `npx tsc -b` MUST pass (type checking)
- `npm test` MUST pass
- `npm run build` MUST succeed

**End-to-End Tests:**
- Playwright E2E tests run after all builds pass
- Cover critical user journeys (P1 user stories minimum)

**Common Failure Patterns & Solutions:**

1. **Enum Comparison Errors**
   - ❌ Wrong: `if (status === 'lobby')` (string literal)
   - ✅ Correct: `if (status === RoomStatus.LOBBY)` (enum value)
   - Solution: Always use enum values, never string literals

2. **Enum Import Errors**
   - ❌ Wrong: `import type { RoomStatus }` when using as value
   - ✅ Correct: `import { RoomStatus }` (value import for enums)
   - Solution: Use type-only imports for types, value imports for enums used as values

3. **Unnecessary Async/Await**
   - ❌ Wrong: `async method() { return this.data; }` (no await needed)
   - ✅ Correct: `method() { return this.data; }` (synchronous)
   - Solution: Remove async/await from methods that don't use await

4. **Frontend ESLint Configuration**
   - ❌ Wrong: Using deprecated flat config format or plugins as strings
   - ✅ Correct: Use `tseslint.config()` with plugins as objects
   - Solution: Follow typescript-eslint migration guide for ESLint 9+

5. **React Hooks Cascading Renders**
   - ❌ Wrong: `useEffect(() => { setState(value); })` (synchronous setState in effect)
   - ✅ Correct: `useEffect(() => { queueMicrotask(() => setState(value)); })`
   - Solution: Use queueMicrotask or move state updates to callbacks

6. **TypeScript `any` Usage**
   - ❌ Wrong: Using `any` without justification
   - ✅ Correct: Use `unknown` or specific types, add `// eslint-disable-next-line` if truly needed
   - Solution: Prefer `unknown` for truly dynamic types, use explicit types when possible

**Handling CI Failures:**
1. Review the specific failing check in GitHub Actions logs
2. Reproduce the failure locally
3. Fix the root cause (not just the symptom)
4. Run full local validation: `npm run lint && npm run build && npm test`
5. Push fixes and verify all checks pass
6. No pull request may be merged with failing checks - no exceptions

## Complexity Justification

**The default is SIMPLE. Complexity MUST be justified:**

When violating simplicity principles (adding abstractions, layers, patterns):
1. Document the violation in plan.md Complexity Tracking table
2. Explain why it's needed (specific problem being solved)
3. Document why simpler alternatives were rejected
4. Get approval during planning phase

Examples requiring justification:
- Repository pattern when direct DB access would suffice
- Microservices when monolith would work
- Complex state management when local state is enough
- Custom framework when standard library exists

## Governance

**This constitution supersedes all other development practices and style guides.**

**Amendments:**
- Require documentation of rationale
- Must increment CONSTITUTION_VERSION appropriately
- Need approval from project maintainers
- Include migration plan for existing code if breaking

**Enforcement:**
- All PRs must verify constitution compliance
- Violations in existing code must be addressed or justified
- Regular audits of compliance (quarterly minimum)
- Constitution violations are blockers, not warnings

**Living Document:**
- This constitution evolves with the project
- Feedback from developers drives improvements
- Balance between rigid standards and pragmatic flexibility
- When in doubt, bias toward simplicity and user value

---

**Version**: 1.4.0
**Ratified**: 2025-11-07
**Last Amended**: 2025-11-09
