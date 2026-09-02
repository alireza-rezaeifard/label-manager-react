import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { formatAmount, parseCode } from '../utils/formatters';
import { PAGE_SIZE } from '../data/fields';
import type { RecordItem, FilterState, CustomField } from '../types';

export function useRecordsList(currentRecords: RecordItem[], customFields: CustomField[]) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);

  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [filterType, setFilterType] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');

  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('view_mode') || 'card'; } catch { return 'card'; }
  });
  const [useVirtualScroll, setUseVirtualScroll] = useState(() => {
    try { return localStorage.getItem('use_virtual_scroll') === 'true'; } catch { return false; }
  });

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem('view_mode', viewMode); } catch {
    // ignore: optional operation
  }
  }, [viewMode]);

  useEffect(() => {
    try { localStorage.setItem('use_virtual_scroll', String(useVirtualScroll)); } catch {
    // ignore: optional operation
  }
  }, [useVirtualScroll]);

  const recordToIndex = useMemo(
    () => new Map(currentRecords.map((r, i) => [r, i] as [RecordItem, number])),
    [currentRecords]
  );

  const allTypes = useMemo(
    () => [...new Set(currentRecords.map(r => r.type).filter(Boolean))] as string[],
    [currentRecords]
  );

  const allParties = useMemo(
    () => [...new Set(currentRecords.map(r => r.party).filter(Boolean))] as string[],
    [currentRecords]
  );

  const sortByCode = useCallback((records: RecordItem[]) => {
    return [...records].sort((a, b) => {
      const pa = parseCode(a.code);
      const pb = parseCode(b.code);
      if (pa && pb) {
        const projA = pa.projectNum ?? 0;
        const projB = pb.projectNum ?? 0;
        if (projA !== projB) return projA - projB;
        if (pa.type !== pb.type) return pa.type.localeCompare(pb.type);
        if (pa.year !== pb.year) return pb.year.localeCompare(pa.year);
        return pb.sequence - pa.sequence;
      }
      if (pa) return -1;
      if (pb) return 1;
      return a.code.localeCompare(b.code);
    });
  }, []);

  const getSortedRecords = useCallback(() => {
    let result = currentRecords;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = currentRecords.filter(r => {
        const formattedAmount = formatAmount(r.amount);
        const customFieldMatch = customFields.some((f: CustomField) =>
          r[f.key] && formatAmount(r[f.key]).toLowerCase().includes(q)
        );
        return Object.values(r).some(v =>
          Array.isArray(v)
            ? v.some(item => String(item).toLowerCase().includes(q))
            : String(v).toLowerCase().includes(q)
        ) || (formattedAmount && formattedAmount.toLowerCase().includes(q)) || customFieldMatch;
      });
    }

    if (filterType) result = result.filter(r => r.type === filterType);
    if (filterParty) result = result.filter(r => r.party === filterParty);
    if (selectedTagFilter) result = result.filter(r => r.tags && r.tags.includes(selectedTagFilter));
    if (filterDateFrom) result = result.filter(r => r.date && r.date >= filterDateFrom);
    if (filterDateTo) result = result.filter(r => r.date && r.date <= filterDateTo);
    if (filterAmountMin) {
      result = result.filter(r => {
        const amt = parseFloat(r.amount);
        return !isNaN(amt) && amt >= parseFloat(filterAmountMin);
      });
    }
    if (filterAmountMax) {
      result = result.filter(r => {
        const amt = parseFloat(r.amount);
        return !isNaN(amt) && amt <= parseFloat(filterAmountMax);
      });
    }
    if (sortBy === 'code') {
      result = sortByCode(result);
      if (sortOrder === 'desc') result.reverse();
    } else if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = String(a[sortBy] || '').toLowerCase();
        const bVal = String(b[sortBy] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else {
      result = sortByCode(result);
    }
    return result;
  }, [debouncedSearch, sortBy, sortOrder, currentRecords, filterType, filterParty, selectedTagFilter, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, customFields, sortByCode]);

  const sortedRecords = useMemo(() => getSortedRecords(), [getSortedRecords]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedRecords = useMemo(
    () => sortedRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedRecords, safePage]
  );

  const selectedRecords = useMemo(
    () => sortByCode(currentRecords.filter((_, i) => selected.has(i))),
    [currentRecords, selected, sortByCode]
  );

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const handleApplyPreset = useCallback((filters: FilterState) => {
    setSearch(filters.search || '');
    setFilterType(filters.filterType || '');
    setFilterParty(filters.filterParty || '');
    setFilterDateFrom(filters.filterDateFrom || '');
    setFilterDateTo(filters.filterDateTo || '');
    setFilterAmountMin(filters.filterAmountMin || '');
    setFilterAmountMax(filters.filterAmountMax || '');
    setSelectedTagFilter(filters.selectedTagFilter || null);
    setPage(1);
  }, []);

  const toggleSelect = useCallback((i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const filtered = getSortedRecords();
    setSelected(prev => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map(r => r.__lid !== undefined ? r.__lid : currentRecords.indexOf(r)));
    });
  }, [getSortedRecords, currentRecords]);

  const handleDragStart = (e: React.DragEvent, idx: number | null) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number, onReorder: (from: number, to: number) => void) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIdx) {
      onReorder(dragIndex, dropIdx);
      setSelected(new Set());
    }
    setDragIndex(null);
  }, [dragIndex]);

  return {
    search, setSearch,
    debouncedSearch,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    page, setPage,
    selected, setSelected,
    filterType, setFilterType,
    filterParty, setFilterParty,
    selectedTagFilter, setSelectedTagFilter,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    filterAmountMin, setFilterAmountMin,
    filterAmountMax, setFilterAmountMax,
    viewMode, setViewMode,
    useVirtualScroll, setUseVirtualScroll,
    dragIndex, setDragIndex,
    sortedRecords, totalPages, safePage, pagedRecords,
    recordToIndex, allTypes, allParties, selectedRecords,
    handleSort, handleApplyPreset,
    toggleSelect, toggleAll,
    handleDragStart, handleDrop,
    sortByCode, getSortedRecords,
  };
}
