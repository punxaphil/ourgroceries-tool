import React from 'react';
import { HomeIcon as HomeIconComponent } from '../icons';
import CategorySidebar from './master/CategorySidebar';

type SidebarProps = React.ComponentProps<typeof CategorySidebar>;

type MasterViewProps = {
  title: string;
  itemCountText: string;
  loading: boolean;
  isApplying: boolean;
  showPendingOnly: boolean;
  pendingControlsDisabled: boolean;
  onTogglePendingFilter: () => void;
  onOpenCreateCategory: () => void;
  onNavigateHome: () => void;
  sidebarProps: SidebarProps;
  children: React.ReactNode;
};

const MasterView = (props: MasterViewProps) => (
  <section className="master-section">
    <div className="master-main">
      <Header {...props} />
      <div className="master-content">{props.children}</div>
    </div>
    <CategorySidebar {...props.sidebarProps} />
  </section>
);

const Header = (props: MasterViewProps) => (
  <header className="master-header">
    <div className="master-title-row">
      <HomeButton onNavigateHome={props.onNavigateHome} />
      <Title {...props} />
      {!props.loading && <Actions {...props} />}
    </div>
  </header>
);

const HomeButton = ({ onNavigateHome }: Pick<MasterViewProps, 'onNavigateHome'>) => (
  <button
    type="button"
    className="icon-btn home-btn"
    onClick={onNavigateHome}
    aria-label="Back to Shopping Lists"
    title="Back to Shopping Lists">
    <HomeIconComponent />
  </button>
);

const Title = (props: MasterViewProps) => (
  <div className="master-title-container">
    <h1>{props.title}</h1>
    {!props.loading && <div className="master-item-count">{props.itemCountText}</div>}
  </div>
);

const Actions = (props: MasterViewProps) => (
  <div className="master-actions">
    <button
      type="button"
      className={`filter-btn${props.showPendingOnly ? ' active' : ''}`}
      onClick={props.onTogglePendingFilter}
      disabled={props.pendingControlsDisabled}
      title={props.showPendingOnly ? 'Show all items' : 'Show only items selected for move/deletion'}>
      {props.showPendingOnly ? '✓ Show pending changes' : 'Show pending changes'}
    </button>
    <button
      type="button"
      className="filter-btn"
      onClick={props.onOpenCreateCategory}
      disabled={props.isApplying}
      title="Add a new category">
      Add Category
    </button>
  </div>
);

export default MasterView;
