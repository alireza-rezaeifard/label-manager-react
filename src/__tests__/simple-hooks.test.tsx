import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useLocation } from 'react-router-dom';
import { useRecords } from '../hooks/useRecords';
import { useToast } from '../hooks/useToast';
import { useSWR } from '../hooks/useSWR';
import { api } from '../utils/api';

// Simple components using hooks
function SimpleRecords() {
  const { records } = useRecords();
  return createElement('div', null,
    createElement('h1', null, 'Records'),
    createElement('ul', null,
      ...records.map((r: any, i: number) =>
        createElement('li', { key: i }, r.code)
      )
    )
  );
}

function SimpleLocation() {
  const location = useLocation();
  return createElement('div', null,
    createElement('span', { 'data-testid': 'path' }, location.pathname)
  );
}

function SimpleToast() {
  const { toasts } = useToast();
  return createElement('div', null,
    createElement('span', null, `toasts: ${toasts.length}`)
  );
}

function SimpleSWR() {
  const { data, isLoading } = useSWR('test', () => Promise.resolve([1,2,3]));
  return createElement('div', null,
    createElement('span', null, `data: ${JSON.stringify(data)}, loading: ${isLoading}`)
  );
}

describe('Simple hook tests', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify({ username: 'admin', id: 1, role: 'admin' }));
  });

  it('renders useRecords', () => {
    const { container } = render(
      createElement(MemoryRouter, null,
        createElement(SimpleRecords)
      )
    );
    console.log('SimpleRecords HTML:', container.innerHTML);
    expect(container.querySelector('h1')?.textContent).toBe('Records');
  });

  it('renders useLocation', () => {
    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ['/test-path'] },
        createElement(SimpleLocation)
      )
    );
    console.log('SimpleLocation HTML:', container.innerHTML);
    expect(screen.getByTestId('path').textContent).toBe('/test-path');
  });

  it('renders useToast', () => {
    const { container } = render(
      createElement(MemoryRouter, null,
        createElement(SimpleToast)
      )
    );
    console.log('SimpleToast HTML:', container.innerHTML);
    expect(container.querySelector('span')?.textContent).toBe('toasts: 0');
  });

  it('renders useSWR', () => {
    const { container } = render(
      createElement(MemoryRouter, null,
        createElement(SimpleSWR)
      )
    );
    console.log('SimpleSWR HTML:', container.innerHTML);
  });
});
