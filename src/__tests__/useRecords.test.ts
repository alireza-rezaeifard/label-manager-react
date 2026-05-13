import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecords } from '../hooks/useRecords';

const STORAGE_KEY = 'label-studio-records';

beforeEach(() => {
  localStorage.clear();
});

describe('useRecords', () => {
  it('initializes with default records when localStorage is empty', () => {
    const { result } = renderHook(() => useRecords());
    expect(result.current.records.length).toBeGreaterThan(0);
    expect(result.current.records[0]).toHaveProperty('code');
  });

  it('loads records from localStorage', () => {
    const customRecords = [{ code: 'TEST-001', project: 'Test' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customRecords));
    const { result } = renderHook(() => useRecords());
    expect(result.current.records).toEqual(customRecords);
  });

  it('addRecord adds a record and pushes undo', () => {
    const { result } = renderHook(() => useRecords());
    const initialLength = result.current.records.length;

    act(() => {
      result.current.addRecord({ code: 'NEW-001', project: 'New' });
    });

    expect(result.current.records).toHaveLength(initialLength + 1);
    expect(result.current.undoStack).toHaveLength(1);
  });

  it('updateRecord updates a record by index', () => {
    const { result } = renderHook(() => useRecords());
    const updated = { ...result.current.records[0], project: 'Updated' };

    act(() => {
      result.current.updateRecord(0, updated);
    });

    expect(result.current.records[0].project).toBe('Updated');
  });

  it('deleteRecords removes selected records', () => {
    const { result } = renderHook(() => useRecords());
    const firstCode = result.current.records[0].code;
    const indices = new Set([0]);

    act(() => {
      result.current.deleteRecords(indices);
    });

    const codes = result.current.records.map(r => r.code);
    expect(codes).not.toContain(firstCode);
    expect(result.current.records.length).toBeGreaterThan(0);
  });

  it('reorderRecords moves a record', () => {
    const { result } = renderHook(() => useRecords());
    const originalFirst = result.current.records[0]?.code;
    const originalSecond = result.current.records[1]?.code;

    act(() => {
      result.current.reorderRecords(0, 1);
    });

    expect(result.current.records[0].code).toBe(originalSecond);
    expect(result.current.records[1].code).toBe(originalFirst);
  });

  it('undo restores previous state', () => {
    const { result } = renderHook(() => useRecords());
    const snapshot = [...result.current.records];

    act(() => {
      result.current.addRecord({ code: 'UNDO-TEST' });
    });
    expect(result.current.records.length).toBe(snapshot.length + 1);

    act(() => {
      result.current.undo();
    });
    expect(result.current.records).toEqual(snapshot);
  });

  it('isDuplicateCode detects duplicates', () => {
    const { result } = renderHook(() => useRecords());
    const code = result.current.records[0].code;

    expect(result.current.isDuplicateCode(code)).toBe(true);
    expect(result.current.isDuplicateCode('NONEXISTENT')).toBe(false);
  });

  it('persists records to localStorage on change', () => {
    const { result } = renderHook(() => useRecords());

    act(() => {
      result.current.addRecord({ code: 'PERSIST-TEST' });
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.find(r => r.code === 'PERSIST-TEST')).toBeTruthy();
  });
});
