import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, Component } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useRecords', () => ({
  useRecords: vi.fn(() => ({
    records: [
      { code: 'INV-001', project: 'Test Project', type: 'Invoice', date: '1403/01/01', party: 'Test Co', amount: '1000000', related: [], tags: [], id: '1' },
      { code: 'INV-002', project: 'Another Project', type: 'Receipt', date: '1403/02/15', party: 'Vendor Inc', amount: '500000', related: [], tags: ['urgent'], id: '2' },
    ],
    setRecords: vi.fn(), addRecord: vi.fn(), updateRecord: vi.fn(), deleteRecords: vi.fn(),
    reorderRecords: vi.fn(), undo: vi.fn(), undoStack: [], pushUndo: vi.fn(), isDuplicateCode: () => false,
  })),
}));
vi.mock('../hooks/useToast', () => ({ useToast: vi.fn(() => ({ addToast: vi.fn(), removeToast: vi.fn(), toasts: [] })) }));
vi.mock('../hooks/useSWR', () => ({ useSWR: vi.fn(() => ({ data: [], error: null, isLoading: false, revalidate: vi.fn() })), invalidateCache: vi.fn() }));
vi.mock('../hooks/usePrintExport', () => ({ usePrintExport: vi.fn(() => ({ handlePrint: vi.fn(), handleExcel: vi.fn(), handleCSVExport: vi.fn(), handlePDF: vi.fn(), handleExportAllExcel: vi.fn(), handleExportAllCSV: vi.fn(), handleExportAllPrint: vi.fn() })) }));
vi.mock('../hooks/useWorkspace', () => ({ useWorkspace: vi.fn(() => ({ user: null, workspaces: [], currentWorkspaceId: 1, workspaceRole: 'owner', login: vi.fn(), register: vi.fn(), logout: vi.fn(), createWorkspace: vi.fn(), switchWorkspace: vi.fn(), inviteUser: vi.fn(), removeMember: vi.fn(), changeMemberRole: vi.fn(), transferOwnership: vi.fn(), deleteWorkspace: vi.fn(), getWorkspaceMembers: vi.fn(() => []), joinDefaultWorkspace: vi.fn() })) }));
vi.mock('../hooks/useCustomFields', () => ({ useCustomFields: vi.fn(() => ({ customFields: [], setCustomFields: vi.fn(), tags: [], addTag: vi.fn(), removeTag: vi.fn(), allFieldKeys: [], enabledCustomFieldKeys: [], handleToggleCustomField: vi.fn(), handleAddCustomField: vi.fn(), handleDeleteCustomField: vi.fn() })) }));
vi.mock('../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn(() => ({ showHelp: false, setShowHelp: vi.fn() })) }));
vi.mock('../hooks/useWebSocket', () => ({ useWebSocket: vi.fn(() => ({})) }));
vi.mock('../hooks/useDebounce', () => ({ useDebounce: vi.fn((v) => v) }));
vi.mock('../utils/api', () => {
  function rp(val: any) { return Promise.resolve(val); }
  return {
    api: { getRecords: vi.fn(() => rp({ records: [], total: 0 })), getAllRecords: vi.fn(() => rp([])), createRecord: vi.fn(() => rp({})), updateRecord: vi.fn(() => rp({})), deleteRecords: vi.fn(() => rp({ deleted: 1 })), getRecordVersions: vi.fn(() => rp([])), restoreRecordVersion: vi.fn(() => rp({})), checkDuplicateCode: vi.fn(() => rp({ exists: false })), getActivity: vi.fn(() => rp([])), getMe: vi.fn(() => rp({ username: 'admin' })), changePassword: vi.fn(() => rp({ ok: true })), reorder: vi.fn(() => rp({ ok: true })), renumberRecords: vi.fn(() => rp({ ok: true })), backup: vi.fn(() => rp([])), restore: vi.fn(() => rp({ ok: true })), uploadImage: vi.fn(() => rp({ url: '' })), getWorkspaces: vi.fn(() => rp([{ id: 1, name: 'Personal Workspace', member_role: 'owner' }])), createWorkspace: vi.fn(() => rp({})), inviteToWorkspace: vi.fn(() => rp({ ok: true })), getWorkspaceMembers: vi.fn(() => rp([])), leaveWorkspace: vi.fn(() => rp({ ok: true })), changeMemberRole: vi.fn(() => rp({ ok: true })), removeMember: vi.fn(() => rp({ ok: true })), transferOwnership: vi.fn(() => rp({ ok: true })), deleteWorkspace: vi.fn(() => rp({ ok: true })), getCustomFields: vi.fn(() => rp([])), createCustomField: vi.fn(() => rp({})), batchSaveCustomFields: vi.fn(() => rp({ ok: true })), updateCustomField: vi.fn(() => rp({})), deleteCustomField: vi.fn(() => rp({ ok: true })) },
    isAuthenticated: vi.fn(() => true),
    getAuthUser: vi.fn(() => ({ username: 'admin', id: 1, role: 'admin' })),
  };
});

import App from '../App';
import { AppProvider } from '../context/AppContext';

// Use JSX directly to see if it makes a difference
describe('App JSX test', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify({ username: 'admin', id: 1, role: 'admin' }));
  });

  it('renders with direct createElement', () => {
    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ['/records'] },
        createElement(AppProvider, null,
          createElement(App)
        )
      )
    );
    console.log('createElement - childNodes:', container.childNodes.length);
  });

  it('renders with JSX', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/records']}>
        <AppProvider>
          <App />
        </AppProvider>
      </MemoryRouter>
    );
    console.log('JSX - childNodes:', container.childNodes.length);

    // Key check - what's in the container?
    if (container.childNodes.length === 0) {
      console.log('EMPTY - no DOM produced');
    } else {
      console.log('HAS DOM:', container.innerHTML.substring(0, 500));
    }
  });

  it('App directly returns JSX', () => {
    // Create an element from App and check its type
    const appElement = createElement(App);
    console.log('App element type:', appElement.type?.name || appElement.type?.toString().substring(0, 100));
    console.log('App element props:', JSON.stringify(appElement.props));
    console.log('App element $$typeof:', String(appElement.$$typeof));
    console.log('Expected $$typeof:', Symbol.for('react.element'));
    console.log('$$typeof match:', appElement.$$typeof === Symbol.for('react.element'));

    // Check if has ref and key
    console.log('App element key:', appElement.key);
    console.log('App element ref:', appElement.ref);
  });
});
