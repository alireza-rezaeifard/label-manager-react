import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordCard from '../components/RecordCard';

const mockRecord = {
  code: 'INV-001',
  project: 'Test Project',
  type: 'Invoice',
  date: '1403/01/01',
  party: 'Test Co',
  amount: '1,000,000',
  related: ['REL-001'],
  color: '#7367f0',
  tags: ['urgent'],
};

const mockRelated = [{ code: 'REL-001', project: 'Related' }];

describe('RecordCard', () => {
  it('renders record code', () => {
    render(
      <RecordCard
        record={mockRecord}
        selected={false}
        onToggle={() => {}}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={() => []}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    expect(screen.getByText('INV-001')).toBeTruthy();
  });

  it('renders record fields', () => {
    render(
      <RecordCard
        record={mockRecord}
        selected={false}
        onToggle={() => {}}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={() => []}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    expect(screen.getByText('Test Project')).toBeTruthy();
    expect(screen.getByText('Invoice')).toBeTruthy();
    expect(screen.getByText('Test Co')).toBeTruthy();
  });

  it('shows selected state', () => {
    const { container } = render(
      <RecordCard
        record={mockRecord}
        selected={true}
        onToggle={() => {}}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={() => []}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    expect(container.querySelector('.label-card.selected')).toBeTruthy();
  });

  it('calls onToggle when card is clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <RecordCard
        record={mockRecord}
        selected={false}
        onToggle={onToggle}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={() => []}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    const firstChild = container.firstChild;
    if (firstChild) fireEvent.click(firstChild);
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders related labels when getRelatedLabels returns data', () => {
    const getRelatedLabels = vi.fn(() => mockRelated);
    render(
      <RecordCard
        record={mockRecord}
        selected={false}
        onToggle={() => {}}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={getRelatedLabels}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    expect(screen.getByText('REL-001')).toBeTruthy();
  });

  it('renders tags', () => {
    render(
      <RecordCard
        record={mockRecord}
        selected={false}
        onToggle={() => {}}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={() => []}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    expect(screen.getByText('urgent')).toBeTruthy();
  });

  it('renders color bar when record has color', () => {
    const { container } = render(
      <RecordCard
        record={mockRecord}
        selected={false}
        onToggle={() => {}}
        onEdit={() => {}}
        onView={() => {}}
        getRelatedLabels={() => []}
        index={0}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        onDrop={() => {}}
        onInlineEdit={() => {}}
      />
    );
    const colorBars = container.querySelectorAll('.label-card > div');
    const hasColorBar = Array.from(colorBars).some(
      div => div.getAttribute('style')?.includes('rgb(115, 103, 240)') ?? false
    );
    expect(hasColorBar).toBe(true);
  });
});
