import { NavLink } from 'react-router-dom';
import { ModuleIcon } from '@/shared/icons';
import { ChevronRight } from 'lucide-react';
import { isBranchActive, type NavSection } from '@/shared/navigation/model';

interface BranchMenuProps {
  section: NavSection;
  align: 'left' | 'right';
  selectedBranchKey: string | null;
  currentBasePath: string;
  onSelectBranch: (key: string) => void;
  onNavigateTo: (path: string) => void;
}

export function BranchMenu({
  section,
  align,
  selectedBranchKey,
  currentBasePath,
  onSelectBranch,
  onNavigateTo,
}: BranchMenuProps) {
  const selectedBranch =
    section.branches.find((branch) => branch.key === selectedBranchKey) ?? null;
  const showFlyout = selectedBranch !== null && selectedBranch.subBranches.length > 0;

  return (
    <div
      className={`branch-menu ${align === 'right' ? 'branch-menu-right' : ''}`}
      role="menu"
      aria-label={`${section.label} branches`}
    >
      <div className="branch-menu-panel">
        <div className="branch-menu-header">{section.label}</div>
        <ul className="branch-menu-list">
          {section.branches.map((branch) => {
            const isSelected = branch.key === selectedBranchKey;
            const isActive = isBranchActive(branch, currentBasePath);
            const hasChildren = branch.subBranches.length > 0;
            return (
              <li key={branch.key}>
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup={hasChildren}
                  aria-expanded={isSelected && hasChildren}
                  onMouseEnter={() => onSelectBranch(branch.key)}
                  onFocus={() => onSelectBranch(branch.key)}
                  onClick={() => {
                    onSelectBranch(branch.key);
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
                  {hasChildren && (
                    <span className="branch-menu-item-end">
                      <span className="branch-menu-item-dot" />
                      <ChevronRight
                        size={13}
                        className={`branch-menu-item-chevron ${
                          isSelected ? 'rotate-90' : ''
                        }`}
                      />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {showFlyout && (
        <div className="branch-menu-flyout">
          <div className="branch-menu-flyout-header">
            <span className="branch-menu-connector" />
            <span className="branch-menu-flyout-title truncate">{selectedBranch.label}</span>
          </div>
          <ul className="branch-menu-flyout-list">
            {selectedBranch.subBranches.map((subBranch) => (
              <li key={subBranch.path}>
                <NavLink
                  to={subBranch.path}
                  className={({ isActive }) =>
                    `branch-menu-flyout-item ${
                      isActive ? 'branch-menu-flyout-item-active' : ''
                    }`
                  }
                >
                  {subBranch.icon && (
                    <span className="branch-menu-flyout-item-icon">
                      <ModuleIcon id={subBranch.icon} size={14} />
                    </span>
                  )}
                  <span className="branch-menu-flyout-item-content">
                    <span className="branch-menu-flyout-item-label truncate">
                      {subBranch.label}
                    </span>
                    {subBranch.subtitle && (
                      <span className="branch-menu-flyout-item-sub truncate">
                        {subBranch.subtitle}
                      </span>
                    )}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}