import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import AutocompleteInput from '../components/AutocompleteInput';

const suggestions = ['Invoice', 'Receipt', 'Contract', 'Purchase Order'];

function Stateful({ initialSuggestions = suggestions, initial = '' }: { initialSuggestions?: string[]; initial?: string }) {
  const [value, setValue] = React.useState(initial);
  return (
    <>
      <AutocompleteInput
        value={value}
        onChange={(v) => setValue(v)}
        suggestions={initialSuggestions}
        placeholder="Type..."
      />
      <span data-testid="current-value">{value}</span>
    </>
  );
}

describe('AutocompleteInput', () => {
  it('renders input with placeholder', () => {
    render(<AutocompleteInput value="" onChange={vi.fn()} suggestions={[]} placeholder="Type..." />);
    expect(screen.getByPlaceholderText('Type...')).toBeTruthy();
  });

  it('shows suggestions when typing', async () => {
    render(<Stateful />);
    fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: 'Inv' } });
    await waitFor(() => {
      expect(screen.getByText('Invoice')).toBeTruthy();
    });
  });

  it('hides suggestions when value is empty', () => {
    render(<Stateful />);
    fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: '' } });
    expect(screen.queryByText('Invoice')).toBeNull();
  });

  it('filters suggestions by substring match', async () => {
    render(<Stateful />);
    fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: 'Inv' } });
    await waitFor(() => {
      expect(screen.getByText('Invoice')).toBeTruthy();
    });
  });

  it('selects suggestion on click', async () => {
    render(<Stateful />);
    fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: 'Inv' } });
    await waitFor(() => screen.getByText('Invoice'));
    fireEvent.mouseDown(screen.getByText('Invoice'));
    expect(screen.getByTestId('current-value').textContent).toBe('Invoice');
  });

  it('selects with Enter key', async () => {
    render(<Stateful />);
    const input = screen.getByPlaceholderText('Type...');
    fireEvent.change(input, { target: { value: 'Con' } });
    await waitFor(() => screen.getByText('Contract'));
    // ArrowDown sets focusedIdx to 0 — flush React state before pressing Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await act(async () => {});
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('current-value').textContent).toBe('Contract');
  });

  it('no selection when Enter without arrow', async () => {
    render(<Stateful />);
    const input = screen.getByPlaceholderText('Type...');
    fireEvent.change(input, { target: { value: 'Inv' } });
    await waitFor(() => screen.getByText('Invoice'));
    // No ArrowDown — focusedIdx is -1, Enter should NOT select (value stays unchanged)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('current-value').textContent).toBe('Inv');
  });

  it('closes dropdown on Escape', async () => {
    render(<Stateful />);
    const input = screen.getByPlaceholderText('Type...');
    fireEvent.change(input, { target: { value: 'Inv' } });
    await waitFor(() => screen.getByText('Invoice'));
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Invoice')).toBeNull();
  });

  it('caps suggestions at 20', async () => {
    const many = Array.from({ length: 30 }, (_, i) => `Item ${i}`);
    render(<Stateful initialSuggestions={many} />);
    fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: 'Item' } });
    await waitFor(() => {
      expect(screen.getByText('Item 0')).toBeTruthy();
    });
    expect(screen.queryByText('Item 20')).toBeNull();
  });

  it('Persian normalize matching', async () => {
    const persianSuggestions = ['فیش خرید', 'قرارداد', 'صورتحساب'];
    render(<Stateful initialSuggestions={persianSuggestions} />);
    // Arabic yeh (ي) normalizes to Persian yeh (ی)
    fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: 'فيش' } });
    await waitFor(() => {
      expect(screen.getByText('فیش خرید')).toBeTruthy();
    });
  });
});
