# AI Development Guidelines

**Purpose**: Rules and modes for any AI coding session on this project. Paste or reference this at the start of every session.

---

## Governing Principle

If you are not highly confident a change is safe, say so. Never guess silently. Uncertainty is useful — hiding it is not.

---

## Core Rules (Always Apply)

1. **No duplication.** Before writing ANY new code, search the existing codebase for similar functionality. Reuse or extend what exists. Never rebuild something that already exists elsewhere.

2. **Respect existing architecture.** Do not restructure files, rename conventions, change design patterns, or reorganize project structure unless explicitly asked.

3. **No state management changes without permission.** Do not add, remove, move, or restructure useState, useEffect, useContext, or any state/context providers unless the task specifically requires it and you explain why.

4. **No unnecessary abstractions.** Do not create wrapper components, helper functions, custom hooks, or utility files unless they will be used in 3+ places. Simpler is better.

5. **No dependency changes.** Don't add, remove, or update imports/packages unless directly required. If you must, flag it.

6. **Explain before coding.** Before writing code, briefly state:
   - What you're doing and why
   - What you're intentionally NOT touching
   - Any risks or cross-file impacts

7. **Match existing patterns.** Follow the naming conventions, file structure, component patterns, and coding style already in the codebase. Do not introduce new patterns.

8. **Clean up after yourself.** If your changes make any existing code unused (imports, variables, functions, components, styles), remove the dead code. Never leave orphans.

---

## Mode Selection

Before starting any task, ask the user which mode applies:
- **Bug Fix** — fixing broken behavior
- **New Feature** — building something new
- **Design Change** — moving, removing, or adding UI elements

Wait for the user to confirm before proceeding. Once confirmed, follow the Core Rules above PLUS the corresponding mode rules below.

---

## Bug Fix Mode

1. **Surgical fixes only.** Fix the specific bug described — nothing else. Do not refactor, reorganize, rename, or "improve" surrounding code.

2. **Do not modify any function signatures, type definitions, component props, or API contracts** unless the bug literally cannot be fixed without it. If you must, flag it explicitly and explain the downstream impact.

3. **Preserve all existing behavior.** Every current feature, side effect, and edge case handling must continue to work exactly as it does now. If you're unsure whether something is intentional, assume it is.

4. **Minimal diff.** The best bug fix changes the fewest lines possible. If your fix touches more than ~15 lines, pause and ask if there's a simpler approach.

5. **No silent type changes.** Do not change types, add/remove optional chaining, modify type unions, or alter null/undefined handling beyond what the bug requires.

6. **No async restructuring.** Do not rearrange promise chains, add/remove awaits, or change the timing of async operations unless the bug is specifically a race condition you can explain.

7. **Check cross-file impact.** If the code you're changing is imported or called elsewhere, verify those call sites still work with your change.

8. **Describe how to verify this fix** and what existing behavior to retest afterward.

9. **Flag nearby issues.** If you see other bugs or code smells nearby, mention them but DO NOT fix them — that's a separate task.

---

## New Feature Mode

1. **Reuse first, build second.** Before creating any new component, hook, utility, or function — search the codebase for something that already does what you need or could be extended to do it. Justify any net-new code.

2. **One component, one job.** Don't create a new component for every slight UI variation. Make flexible, reusable components with props instead of duplicating.

3. **Keep the footprint small.** The feature should add the minimum lines of code needed to work correctly. If your implementation seems long, it probably is. Ask if there's a leaner approach.

4. **No speculative code.** Don't add features, error handling, edge cases, or flexibility "just in case" or "for future use." Build exactly what's needed now.

5. **Follow existing data flow.** Use the state management patterns and data fetching approaches already in the app. Don't introduce new patterns (new context providers, new state libraries, new fetching methods) without explicit approval.

6. **Integrate, don't isolate.** New code should plug into existing structure — use existing layouts, shared components, established routes, and current styling patterns. The new feature should feel like it was always part of the app.

7. **Track your additions.** At the end, provide a summary of:
   - New files created and why each one is necessary
   - New dependencies added (if any) and why
   - Existing files modified and what changed

---

## Design Change Mode

1. **Move means move, not rebuild.** When relocating a component, cut it from the old location and place it in the new one. Do not rebuild it from scratch in the new location.

2. **Remove means remove everything.** When deleting a UI element, also remove:
   - Its imports
   - Its state (useState, variables, refs)
   - Its event handlers and callbacks
   - Its styles/classNames (if not shared)
   - Its types/interfaces (if not used elsewhere)
   - Any useEffect or logic that only existed to support it
   Leave zero dead code behind.

3. **Add by extending, not duplicating.** When adding a new UI element, first check if a similar component already exists that could be reused or adapted with props.

4. **Preserve all non-visual behavior.** Moving or changing UI must not alter:
   - Business logic or data flow
   - API calls or data fetching
   - Authentication or permissions
   - Form validation or submission behavior
   - Navigation and routing logic

5. **CSS/styling changes only where needed.** Don't restyle unrelated components. Don't "clean up" styles you weren't asked to touch.

6. **Test the mental model.** After making changes, describe:
   - What the user sees differently
   - What should behave exactly the same as before
   - Any interactions that might feel different (even if functionally identical)

7. **The codebase should be the same size or smaller after a design change.** If the line count went up significantly, something was duplicated instead of moved.
