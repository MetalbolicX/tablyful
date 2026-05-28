# Skill Registry — tablyful

**Generated**: 2026-05-28
**Project Skills**: none (no project-level skills found)
**User Skills**: scanned from ~/.config/opencode/skills/ and ~/.claude/skills/

## Available Skills

### Implementation & Refactoring

| Skill | Trigger | Path |
|-------|---------|------|
| refactor | Surgical code refactoring — extract functions, rename, break down god functions, type safety | ~/.claude/skills/refactor/SKILL.md |
| ast-grep | Structural code search and AST-aware rewrite with capture variables | ~/.claude/skills/ast-grep/SKILL.md |
| rename-refactoring | Refactor identifiers within code blocks for clarity and domain alignment | ~/.claude/skills/rename-refactoring/SKILL.md |
| doc-comments | Inject language-specific documentation and strict type hints | ~/.config/opencode/skills/doc-comments/SKILL.md |

### Testing & Quality

| Skill | Trigger | Path |
|-------|---------|------|
| code-review | Structured code reviews with blocking issues separated from suggestions | ~/.claude/skills/code-review/SKILL.md |
| go-testing | Go tests, coverage, Bubbletea teatest, golden files | ~/.config/opencode/skills/go-testing/SKILL.md |
| judgment-day | Blind dual review, fix confirmed issues, re-judge | ~/.config/opencode/skills/judgment-day/SKILL.md |

### Git, PRs & Collaboration

| Skill | Trigger | Path |
|-------|---------|------|
| branch-pr | Create PRs with issue-first checks | ~/.config/opencode/skills/branch-pr/SKILL.md |
| chained-pr | Split oversized PRs (>400 lines) into stacked review slices | ~/.config/opencode/skills/chained-pr/SKILL.md |
| work-unit-commits | Plan commits as reviewable work units with tests/docs | ~/.config/opencode/skills/work-unit-commits/SKILL.md |
| issue-creation | Create GitHub issues, bug reports, feature requests | ~/.config/opencode/skills/issue-creation/SKILL.md |
| comment-writer | Write warm, direct collaboration comments for PRs/issues/reviews | ~/.config/opencode/skills/comment-writer/SKILL.md |

### Documentation & Diagrams

| Skill | Trigger | Path |
|-------|---------|------|
| cognitive-doc-design | Design docs that reduce cognitive load (guides, READMEs, RFCs) | ~/.config/opencode/skills/cognitive-doc-design/SKILL.md |
| readme-refactor | Interactively refactor README.md into professional, accurate document | ~/.claude/skills/readme-refactor/SKILL.md |
| mermaid-diagram-generator | Generate accurate Mermaid diagrams (23+ types) | ~/.claude/skills/mermaid-diagram-generator/SKILL.md |
| element-reference | Resolve @<file>::<element> code references via ast-grep | ~/.claude/skills/element-reference/SKILL.md |

## Compact Rules

### refactor
- Extract functions before renaming; break god functions incrementally
- Never change behavior — maintainability only
- Prefer small, focused changes over large rewrites
- Use type safety improvements as refactoring opportunities

### ast-grep
- Patterns must be complete AST nodes (valid code)
- Use $VAR for single nodes, $$$ for multiple
- Supports 25+ languages including ReScript (rescript = rust-like syntax)
- Dry-run by default before applying rewrites

### code-review
- Separate blocking issues from minor suggestions
- Check: correctness, security, performance, maintainability
- Always verify technical claims before stating them

### branch-pr
- Issue-first: link PR to existing issue
- Check: tests pass, no secrets committed, conventional commit style
- Review diff before creating PR

### work-unit-commits
- Each commit should be a reviewable, self-contained unit
- Keep tests and docs with the code they describe
- Use conventional commits (feat, fix, refactor, etc.)

### judgment-day
- Run blind dual review before fixing
- Fix confirmed issues, then re-judge
- Adversarial mindset — stress-test the changes
