# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality & Maintainability**:
- [ ] Feature complexity justified (or meets simplicity standards)
- [ ] YAGNI: No speculative features or premature abstractions
- [ ] KISS: Simplest solution chosen (complex solutions justified in Complexity Tracking)
- [ ] No anticipated violations of single responsibility principle
- [ ] Type safety approach defined
- [ ] DRY principle applied (no duplicate logic)

**Testing Standards**:
- [ ] TDD approach confirmed (tests before implementation)
- [ ] Test types identified (unit, integration, contract, e2e)
- [ ] Target code coverage defined (80%+ for new code)
- [ ] Task completion requirement understood (tests MUST pass before marking tasks done)
- [ ] CI verification strategy (no "works on my machine")

**User Experience Consistency**:
- [ ] User stories prioritized (P1, P2, P3...)
- [ ] Each story independently testable
- [ ] Error handling approach defined
- [ ] User feedback mechanisms specified
- [ ] Mobile and desktop compatibility confirmed (responsive design)
- [ ] Internationalization (i18n) framework selected
- [ ] All UI text extraction strategy defined (no hardcoded strings)
- [ ] Multi-lingual support approach documented

**Performance Requirements**:
- [ ] Response time targets defined (<200ms read, <500ms write for APIs)
- [ ] Resource efficiency constraints documented
- [ ] Scalability approach (horizontal scaling planned)
- [ ] Performance testing strategy defined

**Documentation & Communication**:
- [ ] spec.md with user stories exists
- [ ] This plan.md documents technical approach
- [ ] quickstart.md will be created (working example in <5 min)
- [ ] API documentation approach defined (auto-generated from code)
- [ ] AI-first documentation strategy confirmed (scannable, top-down context)
- [ ] README includes architecture overview and navigation guide
- [ ] ARCHITECTURE.md planned (if project complexity warrants)
- [ ] Documentation explains WHY decisions made, not just WHAT

**Security & Reliability**:
- [ ] Input validation strategy defined
- [ ] Authentication/authorization approach specified (if applicable)
- [ ] Error handling and logging strategy defined
- [ ] No secrets in version control (approach for secrets management)

**Quality Gates & Task Completion**:
- [ ] Task completion gates understood (tests pass + builds without errors before marking done)
- [ ] Linting and type checking configured
- [ ] Code review process defined
- [ ] Definition of "done" documented (aligns with constitution Quality Gates)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
