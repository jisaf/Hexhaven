# Temporary Documentation

Implementation-specific documentation created for particular features, fixes, or sessions. These documents are valuable for understanding specific changes but may become outdated as the system evolves.

---

## Purpose

This directory contains transient documentation that:
- Documents specific implementation sessions or feature work
- Provides historical context for particular decisions
- Tracks progress on specific initiatives
- Records bug fix approaches and analyses

Unlike evergreen documentation in `/docs/`, these documents:
- May reference code that has since changed
- Are snapshots in time, not living documents
- Focus on specific features or issues
- May contain outdated information

---

## Document Categories

### Implementation Summaries
Post-implementation summaries of major features:
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Issue #220 card action system
- [Implementation Progress](./IMPLEMENTATION_PROGRESS.md) - Feature development tracking
- [Deck Management README](./DECK_MANAGEMENT_README.md) - Deck system implementation

### Progress Evaluations
Snapshots evaluating progress on specific initiatives:
- [Centralization Progress Evaluation](./CENTRALIZATION_PROGRESS_EVALUATION.md) - State management refactoring

### Bug Fixes & Plans
Specific bug analysis and fix plans:
- [Backend Build Fix Plan](./BACKEND_BUILD_FIX_PLAN.md) - Build process fixes
- [Room Join Flow Analysis](./ROOM_JOIN_FLOW_ANALYSIS.md) - Room joining bug investigation
- [Room Join Unified Architecture](./ROOM_JOIN_UNIFIED_ARCHITECTURE.md) - Room joining refactor

### Testing Summaries
Test execution reports and summaries:
- [Testing Complete Summary](./TESTING_COMPLETE_SUMMARY.md) - Final testing report
- [Testing Summary](./TESTING_SUMMARY.md) - General testing summary
- [Testing Summary Deck Management](./TESTING_SUMMARY_DECK_MGMT.md) - Deck system tests

### Optimization Reports
Performance and optimization work:
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS.md) - Performance improvements
- [Logging Optimizations](./LOGGING_OPTIMIZATIONS.md) - Logging system optimizations

### Refactoring Documentation
Specific refactoring efforts:
- [Objectives Refactor](./OBJECTIVES_REFACTOR.md) - Objective system refactoring
- [Lifecycle Coordinator Architecture](./LIFECYCLE_COORDINATOR_ARCHITECTURE.md) - Coordinator pattern

### Troubleshooting
Specific issue troubleshooting:
- [Troubleshooting Hex Map](./TROUBLESHOOTING_HEX_MAP.md) - Hex map rendering issues

---

## Usage Guidelines

### When to Add Documents Here
- ✅ Feature implementation summaries
- ✅ Bug fix analyses and approaches
- ✅ Session notes from specific development work
- ✅ Progress evaluations on initiatives
- ✅ Temporary migration guides
- ✅ One-time refactoring documentation

### When NOT to Add Documents Here
- ❌ Permanent architecture documentation (goes in `/docs/`)
- ❌ API reference (goes in `/docs/api-reference.md`)
- ❌ System guides (goes in `/docs/`)
- ❌ Testing procedures (goes in `/docs/testing/`)
- ❌ Deployment guides (goes in `/docs/deployment/`)

### Archiving Old Documents
When temporary docs become outdated:
1. Move to `/docs/temporary/deprecated/`
2. Add **[DEPRECATED - YYYY-MM-DD]** to filename
3. Link to replacement documentation
4. Keep for historical reference

---

## Document Index

### Implementation & Development
- Backend Build Fix Plan
- Implementation Progress
- Implementation Summary (Issue #220)
- Centralization Progress Evaluation

### Testing & Quality
- Testing Complete Summary
- Testing Summary
- Testing Summary Deck Management

### Architecture & Refactoring
- Room Join Flow Analysis
- Room Join Unified Architecture
- Lifecycle Coordinator Architecture
- Objectives Refactor

### Performance & Optimization
- Performance Optimizations
- Logging Optimizations

### Feature-Specific
- Deck Management README

### Troubleshooting
- Troubleshooting Hex Map

---

## Searching Historical Context

To find historical context for a feature:

```bash
# Search all temporary docs
grep -r "feature name" /home/ubuntu/hexhaven/docs/temporary/

# Search implementation summaries
grep -r "feature name" /home/ubuntu/hexhaven/docs/temporary/*SUMMARY*.md

# Find docs by date
ls -lt /home/ubuntu/hexhaven/docs/temporary/
```

---

## Related Documentation

- [Main Documentation Index](../README.md)
- [Architecture](../ARCHITECTURE.md) - Current system architecture
- [Testing Documentation](../testing/README.md) - Current testing guides
- [Quality Reports](../quality/README.md) - Code quality tracking

---

**Last Updated**: 2025-12-29
**Note**: Documents in this directory are historical snapshots and may be outdated
**Version**: 1.0.0
