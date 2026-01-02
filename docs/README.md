# Hexhaven Documentation

Complete documentation for the Hexhaven Multiplayer tactical board game.

## Quick Navigation

### Getting Started
- [Project README](../README.md) - Project overview, features, and quick start
- [Setup Guide](../SETUP.md) - Development environment setup
- [Quick Start Guide](../specs/001-gloomhaven-multiplayer/quickstart.md) - 5-minute setup walkthrough

### Architecture & Design
- [System Architecture](./ARCHITECTURE.md) - Complete system architecture and design patterns
- [Data Model](../specs/001-gloomhaven-multiplayer/data-model.md) - Database schema and entity relationships
- [API Reference](./api-reference.md) - REST and WebSocket API documentation
- [WebSocket Analysis](./websocket_analysis.md) - Real-time communication patterns

### Game Systems
- [Game Rules Index](./game-rules/index.md) - **Gloomhaven rules reference** (split into manageable sections)
- [Game Completion System](./game-completion-system.md) - Victory/defeat detection and match history
- [Objective System Guide](./objective-system-guide.md) - Creating and managing objectives
- [Action System](./action-system.md) - Card actions and combat implementation
- [Deck Management System](./deck-management-system.md) - Player deck mechanics
- [Narrative System](./narrative-system.md) - Story triggers and campaign narratives
- [Campaign Invitation Architecture](./campaign-invitation-architecture.md) - Campaign invitation system

### Migration & Reference
- [Scenario Migration Guide](./scenario-migration-guide.md) - Migrating scenarios to new format

### Testing & Quality
- [Testing Documentation](./testing/README.md) - Complete testing guides and reports
- [E2E Testing Guide for LLM Agents](./E2E_TESTING_GUIDE_FOR_LLM_AGENTS.md) - AI agent testing patterns
- [Test Plan](./test-plan.md) - Overall testing strategy

### Deployment & Operations
- [Production Deployment Guide](./deployment/PRODUCTION_DEPLOYMENT.md) - Complete deployment instructions
- [SSL Setup](./deployment/SSL_SETUP.md) - HTTPS configuration
- [OCI Network Setup](./deployment/OCI_NETWORK_SETUP.md) - Oracle Cloud infrastructure
- [Troubleshooting Network](./deployment/TROUBLESHOOTING_NETWORK.md) - Network issue resolution

### Development
- [Development Todos](./todos.md) - Feature roadmap and task tracking
- [Agents & Commands](../AGENTS.md) - Claude Code slash commands and agents
- [Code Quality Reports](./quality/README.md) - Quality assessments and improvements

### Temporary Documentation
- [Temporary Docs](./temporary/README.md) - Implementation notes and one-time fixes

---

## Documentation Organization

### /docs/ - Evergreen Documentation
Long-term value documentation that serves as ongoing reference:
- Architecture and design documents
- System guides and references
- API documentation
- Testing guides
- Deployment procedures

### /docs/temporary/ - Transient Documentation
Implementation-specific docs created for particular features/fixes:
- Implementation summaries
- Bug fix plans
- Progress evaluations
- Session notes

### /specs/ - Feature Specifications
Feature specs following the SpecKit workflow:
- spec.md - Requirements and success criteria
- plan.md - Technical implementation plan
- tasks.md - Dependency-ordered task lists
- contracts/ - API contracts and data models

### Root Directory
Only essential developer-facing files:
- README.md - Project overview
- SETUP.md - Setup instructions
- CLAUDE.md - Development guidelines
- AGENTS.md - CLI command reference
- bugs.md - Current known issues

---

## Documentation Standards

### File Naming Conventions
- Use kebab-case for multi-word files: `game-completion-system.md`
- Use UPPERCASE for root-level important docs: `README.md`, `SETUP.md`
- Date temporary docs if event-specific: `e2e-testing-session-2025-12-07.md`

### Structure Requirements
- Every document must have a clear title and purpose
- Include table of contents for docs >100 lines
- Cross-link related documents extensively
- Include "Last Updated" date for living documents
- Add "See Also" sections for related topics

### Code Examples
- Specify language for syntax highlighting
- Include both TypeScript and curl examples for APIs
- Keep examples minimal but complete
- Test all code examples before committing

### Maintenance
- Update docs when code changes affect them
- Flag outdated sections with **[OUTDATED]** markers
- Archive deprecated docs to /docs/temporary/deprecated/
- Review and update all docs quarterly

---

## Contributing to Documentation

### When to Update Docs
- Adding new features → Update system guides
- Changing APIs → Update API reference
- Modifying architecture → Update ARCHITECTURE.md
- Bug fixes → Update troubleshooting guides
- New deployment steps → Update deployment docs

### Documentation Review Checklist
- [ ] All code examples tested and working
- [ ] Cross-references updated
- [ ] Table of contents current
- [ ] No broken links
- [ ] Formatting consistent
- [ ] "Last Updated" date current
- [ ] Related docs linked

---

## Quick Links by Role

### New Developers
1. [README](../README.md) - Understand the project
2. [SETUP](../SETUP.md) - Get environment running
3. [ARCHITECTURE](./ARCHITECTURE.md) - Learn system design
4. [Testing Guide](./testing/README.md) - Run tests

### Frontend Developers
1. [Frontend README](../frontend/README.md)
2. [API Reference](./api-reference.md)
3. [WebSocket Events](./websocket_analysis.md)
4. [Visual Testing Guide](./testing/VISUAL-TESTING-GUIDE.md)

### Backend Developers
1. [Backend README](../backend/README.md)
2. [Data Model](../specs/001-gloomhaven-multiplayer/data-model.md)
3. [API Reference](./api-reference.md)
4. [Game Systems](./game-completion-system.md)

### DevOps Engineers
1. [Production Deployment](./deployment/PRODUCTION_DEPLOYMENT.md)
2. [SSL Setup](./deployment/SSL_SETUP.md)
3. [Network Troubleshooting](./deployment/TROUBLESHOOTING_NETWORK.md)
4. [OCI Network Setup](./deployment/OCI_NETWORK_SETUP.md)

### QA/Testers
1. [Test Plan](./test-plan.md)
2. [E2E Testing Guide](./E2E_TESTING_GUIDE_FOR_LLM_AGENTS.md)
3. [Visual Testing Guide](./testing/VISUAL-TESTING-GUIDE.md)
4. [Testing Documentation](./testing/README.md)

---

## Documentation Health

### Recent Updates
- 2026-01-02: Unified card pile UI system documentation (Issue #411)
- 2025-12-31: Game rules split into manageable sections (docs/game-rules/)
- 2025-12-29: Complete documentation reorganization
- 2025-12-27: Campaign narrative system added
- 2025-12-25: Campaign invitation architecture
- 2025-12-07: Game completion system

### Coverage Status
- ✅ Architecture - Complete
- ✅ API Reference - Complete
- ✅ Game Systems - Complete
- ✅ Testing Guides - Complete
- ✅ Deployment - Complete
- ⚠️  Troubleshooting - Needs expansion
- ⚠️  Performance Tuning - Needs documentation

### Known Gaps
- Performance optimization guide
- Monitoring and observability setup
- Disaster recovery procedures
- Scalability planning
- Security audit procedures

---

**Last Updated**: 2026-01-02
**Maintained By**: Hexhaven Development Team
**Version**: 2.0.1
