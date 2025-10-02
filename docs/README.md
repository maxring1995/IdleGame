# Documentation - Eternal Realms

This folder contains all project documentation, implementation guides, and technical references.

## 📚 Documentation Index

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide for new developers
- **[README.md](../README.md)** - Main project README (in root)

### Implementation Phases
- **[PHASE3_COMBAT.md](PHASE3_COMBAT.md)** - Phase 3: Combat System Implementation
- **[PHASE3_SUMMARY.md](PHASE3_SUMMARY.md)** - Phase 3 Summary & Results
- **[FEATURE2_SUMMARY.md](FEATURE2_SUMMARY.md)** - Feature 2 Implementation Summary

### Bug Fixes & Troubleshooting
- **[BUG_FIX_REPORT.md](BUG_FIX_REPORT.md)** - Latest: Character creation loading loop fix (2025-10-02)
- **[BUGFIX_REPORT.md](BUGFIX_REPORT.md)** - Earlier bug fix report
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions
- **[TIMEOUT_FIX.md](TIMEOUT_FIX.md)** - Supabase timeout issue resolution
- **[FIX_EMAIL_COLUMN.md](FIX_EMAIL_COLUMN.md)** - Email column migration fix

### Technical Guides
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication system architecture
- **[TESTING.md](TESTING.md)** - Testing strategy and Playwright setup
- **[ICONS.md](ICONS.md)** - Icon usage guide and visual reference

## 🗂️ Documentation Organization

### Phase Documents
Phase documents track major feature implementations:
- **PHASE3_COMBAT.md** - Combat system with boss fights, auto-attack
- **PHASE3_SUMMARY.md** - Results and verification of Phase 3

### Bug Fix Reports
All bug fixes are documented with:
- Root cause analysis
- Implementation details
- Verification steps
- Files changed

### Technical References
- **AUTHENTICATION.md** - Deep dive into auth flow
- **TESTING.md** - Test coverage and strategies
- **ICONS.md** - Visual design system

## 📝 Document Naming Convention

- `PHASE[N]_*.md` - Implementation phase documents
- `*_FIX.md` - Specific bug/issue fixes
- `*_REPORT.md` - Post-mortem reports
- `TROUBLESHOOTING.md` - Ongoing troubleshooting guide

## 🔍 Quick Navigation

**Need to...**
- **Start developing?** → [QUICKSTART.md](QUICKSTART.md)
- **Understand auth?** → [AUTHENTICATION.md](AUTHENTICATION.md)
- **Fix a bug?** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Add icons?** → [ICONS.md](ICONS.md)
- **Write tests?** → [TESTING.md](TESTING.md)

## 📅 Latest Updates

- **2025-10-02** - Added ICONS.md with complete icon system documentation
- **2025-10-02** - BUG_FIX_REPORT.md - Fixed character creation loading loop
- **2025-10-02** - TROUBLESHOOTING.md - Session management guide
- **2025-10-02** - Organized all docs into `/docs` folder

## 🤝 Contributing to Documentation

When adding new documentation:

1. **Choose the right location:**
   - Implementation guides → `/docs/PHASE[N]_*.md`
   - Bug fixes → `/docs/*_FIX.md` or `*_REPORT.md`
   - References → `/docs/[TOPIC].md`

2. **Use clear naming:**
   - ALL_CAPS for document names
   - Descriptive names (e.g., `AUTHENTICATION.md` not `AUTH.md`)

3. **Update this README:**
   - Add to appropriate section
   - Update "Latest Updates" with date

4. **Cross-reference:**
   - Link related documents
   - Update [CLAUDE.md](../CLAUDE.md) if architecture changes

## 📖 Main Project Files (Not in /docs)

These files remain in the project root:
- **[CLAUDE.md](../CLAUDE.md)** - Instructions for Claude Code AI
- **[AGENTS.md](../AGENTS.md)** - Agent system documentation
- **[README.md](../README.md)** - Main project README

---

**Last Updated:** 2025-10-02
**Maintained by:** Development Team
