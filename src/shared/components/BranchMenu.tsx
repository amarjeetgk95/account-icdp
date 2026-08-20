/**
 * @deprecated BranchMenu is legacy - Header.tsx now implements the 3-level
 * cascading flyout directly with better a11y, memoization and mobile support.
 * Kept for backwards-compatibility only. New code should use the navigation
 * model from `@/shared/navigation/model` directly.
 */
import { useCallback, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ModuleIcon } from '@/shared/icons';
import { isBranchActive, type NavSection } from '@/shared/navigation/model';

interface BranchMenuProps {
  section: NavSection;
  align: 'left' | 'right';
  selectedBranchKey: string | null;
  currentBasePath: string;
  onNavigateTo: (path: string) => void;
  onClosePanel: () => void;
}

/* Each navigation level lives in its own layout container:
   - Top Navigation   : the header bar (see Header.tsx)
   - Branch Navigation: .branch-menu-panel — sized only by its own content
   - Child Navigation : .branch-menu-child — an absolutely positioned
     SIBLING that branches out from the selected branch row. It is out of
     the normal flow, so a branch with 10 child tabs can never stretch the
     branch box; each child list sizes only its own container. */
export function BranchMenu({
  section,
  align,
  selectedBranchKey,
  currentBasePath,
  onNavigateTo,
  onClosePanel,
}: BranchMenuProps) {
  const [hoveredBranchKey, setHoveredBranchKey] = useState<string | null>(null);
  const [childTop, setChildTop] = useState(0);

  /* Follow the URL branch until the user hovers another one; reset the
     hovered branch whenever the URL branch changes (render-phase
     adjustment so navigation keeps the panel in sync). */
  const [lastSelectedKey, setLastSelectedKey] = useState(selectedBranchKey);
  if (lastSelectedKey !== selectedBranchKey) {
    setLastSelectedKey(selectedBranchKey);
    setHoveredBranchKey(null);
  }

  const activeBranchKey =
    hoveredBranchKey ??
    (selectedBranchKey && section.branches.some((b) => b.key === selectedBranchKey)
      ? selectedBranchKey
      : (section.branches[0]?.key ?? null));
  const activeBranch = section.branches.find((b) => b.key === activeBranchKey) ?? null;

  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const childRef = useRef<HTMLDivElement | null>(null);

  /* Anchor the child panel to the selected branch row so it visually
     branches out from that item. Re-measured on mount, hover, scroll and
     branch change; clamped so the child stays inside the viewport. */
  const recomputeChildTop = useCallback(() => {
    const menu = menuRef.current;
    const list = listRef.current;
    if (!menu || !list) return;
    const index = section.branches.findIndex((b) => b.key === activeBranchKey);
    const row = index >= 0 ? (list.children[index] as HTMLElement | undefined) : undefined;
    let top = row
      ? Math.round(row.getBoundingClientRect().top - menu.getBoundingClientRect().top)
      : 0;
    const child = childRef.current;
    if (child) {
      const maxTop = window.innerHeight - child.offsetHeight - 16;
      if (top > maxTop) top = Math.max(0, maxTop);
    }
    setChildTop(top);
  }, [activeBranchKey, section.branches]);

  const listRefCallback = useCallback(
    (node: HTMLUListElement | null) => {
      listRef.current = node;
      if (node) recomputeChildTop();
    },
    [recomputeChildTop],
  );

  const childRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      childRef.current = node;
      if (node) recomputeChildTop();
    },
    [recomputeChildTop],
  );

  return (
    <div
      className={`branch-menu ${align === 'right' ? 'branch-menu-right' : ''}`}
      ref={menuRef}
      role="menu"
      aria-label={`${section.label} branches`}
    >
      {/* Level 2: branch navigation (own box, own dimensions) */}
      <div className="branch-menu-panel">
        <ul className="branch-menu-list" ref={listRefCallback} onScroll={() => recomputeChildTop()}>
          {section.branches.map((branch) => {
            const isSelected = branch.key === activeBranchKey;
            const isActive = isBranchActive(branch, currentBasePath);
            return (
              <li key={branch.key}>
                <button
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  onMouseEnter={() => setHoveredBranchKey(branch.key)}
                  onFocus={() => setHoveredBranchKey(branch.key)}
                  onClick={() => {
                    setHoveredBranchKey(branch.key);
                    onNavigateTo(branch.defaultPath);
                  }}
                  className={`branch-menu-item ${
                    isSelected ? 'branch-menu-item-selected' : ''
                  } ${isActive ? 'branch-menu-item-active' : ''}`}
                >
                  <span className="branch-menu-item-icon">
                    <ModuleIcon id={branch.icon || 'dashboard'} size={15} />
                  </span>
                  <span className="branch-menu-item-label truncate">{branch.label}</span>
                  <span className="branch-menu-item-dot" />
                  {branch.subBranches.length > 0 && (
                    <span className="branch-menu-item-count">{branch.subBranches.length}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Level 3: child navigation — separate positioned container that
          branches out from the selected branch; never resizes the branch
          box, and expands only itself when a branch has more child tabs */}
      {activeBranch && (
        <div
          className="branch-menu-child"
          ref={childRefCallback}
          style={{ top: childTop }}
          role="group"
          aria-label={`${activeBranch.label} sub-pages`}
        >
          {activeBranch.subBranches.length > 0 ? (
            <ul className="branch-menu-subbranch-list">
              {activeBranch.subBranches.map((subBranch) => (
                <li key={subBranch.path}>
                  <NavLink
                    to={subBranch.path}
                    onClick={onClosePanel}
                    className={({ isActive }) =>
                      `branch-menu-subbranch-item ${
                        isActive ? 'branch-menu-subbranch-item-active' : ''
                      }`
                    }
                  >
                    {subBranch.icon && (
                      <span className="branch-menu-subbranch-item-icon">
                        <ModuleIcon id={subBranch.icon} size={14} />
                      </span>
                    )}
                    <span className="branch-menu-subbranch-item-content">
                      <span className="branch-menu-subbranch-item-label truncate">
                        {subBranch.label}
                      </span>
                      {subBranch.subtitle && (
                        <span className="branch-menu-subbranch-item-sub truncate">
                          {subBranch.subtitle}
                        </span>
                      )}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="branch-menu-subbranch-empty">
              No sub-pages under {activeBranch.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}