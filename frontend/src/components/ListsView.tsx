import React from 'react';

type ShoppingListEntry = {
  id?: string | null;
  name: string;
};

type MasterListSummary = {
  name?: string | null;
  itemCount: number;
};

type ListsViewProps = {
  status: string | null;
  lists: ShoppingListEntry[];
  masterList: MasterListSummary | null;
  onManageMasterClick: () => void;
  actions: {
    onLogout: () => void;
    disableLogout: boolean;
  };
  email: string | null;
};

function renderHeader() {
  return <h1>OurGroceries Overview</h1>;
}

function renderStatus(status: string | null) {
  if (!status) return null;
  return <p className="status">{status}</p>;
}

function renderShoppingLists(lists: ShoppingListEntry[]) {
  return lists.map((entry) => <li key={entry.id ?? entry.name}>{entry.name}</li>);
}

function renderShoppingSection(lists: ShoppingListEntry[]) {
  return (
    <section className="shopping-section">
      <h2>Shopping Lists</h2>
      <ul className="lists">{renderShoppingLists(lists)}</ul>
    </section>
  );
}

function renderMasterButton(masterList: MasterListSummary | null, onManageMasterClick: () => void) {
  if (!masterList) return null;
  const name = masterList.name || 'Master List';
  return (
    <button className="primary-btn" type="button" onClick={onManageMasterClick}>
      {`Manage ${name} (${masterList.itemCount} items)`}
    </button>
  );
}

function ListsView({ status, lists, masterList, onManageMasterClick, actions, email }: ListsViewProps) {
  return (
    <>
      <div className="overview-header">
        {renderHeader()}
        <div className="overview-actions">
          <span className="app-header-email">Signed in as {email ?? 'unknown user'}</span>
          <button type="button" className="secondary-btn" onClick={actions.onLogout} disabled={actions.disableLogout}>
            Log out
          </button>
        </div>
      </div>
      {renderStatus(status)}
      {renderShoppingSection(lists)}
      {renderMasterButton(masterList, onManageMasterClick)}
    </>
  );
}

export default ListsView;
