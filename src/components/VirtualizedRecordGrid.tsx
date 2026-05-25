import { useRef, useState, useEffect, memo } from 'react';
import type React from 'react';
import { Grid } from 'react-window';
import RecordCard from './RecordCard';
import type { RecordItem, CustomField } from '../types';

const MIN_CARD_WIDTH = 280;
const MAX_CARD_WIDTH = 400;
const GAP = 24;

interface CellDataProps {
  items: RecordItem[];
  columnCount: number;
  cardWidth: number;
  recordToIndex: Map<RecordItem, number>;
  onToggle: (i: number) => void;
  onEdit: (i: number) => void;
  onView: (i: number) => void;
  getRelatedLabels: (related: string[]) => { code: string }[];
  selected: Set<number>;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  setDragIndex: (i: number | null) => void;
  customFields: CustomField[];
}

interface CellComponentProps extends CellDataProps {
  style: React.CSSProperties;
  rowIndex: number;
  columnIndex: number;
}

const CellComponent = memo(({ style, rowIndex, columnIndex, items, columnCount, cardWidth: _cardWidth, recordToIndex, onToggle, onEdit, onView, getRelatedLabels, selected, onDragStart, onDragOver, onDrop, setDragIndex, customFields }: CellComponentProps) => {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= items.length) return null;

  const r = items[index];
  const realIdx = recordToIndex ? (recordToIndex.get(r) ?? index) : index;

  return (
    <div style={{ ...style, padding: `0 ${GAP / 2}px` }}>
      <RecordCard
        record={r}
        selected={selected?.has(realIdx)}
        onToggle={() => onToggle?.(realIdx)}
        onEdit={() => onEdit?.(realIdx)}
        onView={() => onView?.(realIdx)}
        getRelatedLabels={getRelatedLabels}
        index={realIdx}
        onDragStart={(e) => onDragStart?.(e, realIdx)}
        onDragOver={(e) => onDragOver?.(e)}
        onDragEnd={() => { setDragIndex?.(null); }}
        onDrop={(e) => onDrop?.(e, realIdx)}
        onInlineEdit={undefined}
        customFields={customFields}
      />
    </div>
  );
});

CellComponent.displayName = 'VirtualCell';

interface VirtualizedRecordGridProps {
  records: RecordItem[];
  recordToIndex: Map<RecordItem, number>;
  selected: Set<number>;
  onToggle: (i: number) => void;
  onEdit: (i: number) => void;
  onView: (i: number) => void;
  getRelatedLabels: (related: string[]) => { code: string }[];
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  setDragIndex: (i: number | null) => void;
  overscanCount?: number;
  customFields?: CustomField[];
}

export default function VirtualizedRecordGrid({
  records,
  recordToIndex,
  selected,
  onToggle,
  onEdit,
  onView,
  getRelatedLabels,
  onDragStart,
  onDragOver,
  onDrop,
  setDragIndex,
  overscanCount = 2,
  customFields = [],
}: VirtualizedRecordGridProps) {
  const [containerWidth, setContainerWidth] = useState(1100);
  const [cardHeight, _setCardHeight] = useState(380);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnCount = Math.max(1, Math.min(
    Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP)),
    Math.floor((containerWidth + GAP) / 200) // max columns cap
  ));

  const cardWidth = Math.max(MIN_CARD_WIDTH, Math.min(
    MAX_CARD_WIDTH,
    (containerWidth - (columnCount - 1) * GAP) / columnCount
  ));

  const rowCount = Math.ceil(records.length / columnCount);
  const totalWidth = columnCount * (cardWidth + GAP);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '70vh', minHeight: 500 }}>
      <div ref={cardRef} style={{ width: cardWidth, height: 0, visibility: 'hidden', position: 'absolute', pointerEvents: 'none' }} />
      <Grid<CellDataProps>
        cellComponent={CellComponent as any}
        cellProps={{
          items: records,
          columnCount,
          cardWidth,
          recordToIndex,
          onToggle,
          onEdit,
          onView,
          getRelatedLabels,
          selected,
          onDragStart,
          onDragOver,
          onDrop,
          setDragIndex,
          customFields,
        }}
        columnCount={columnCount}
        columnWidth={cardWidth + GAP}
        rowCount={rowCount}
        rowHeight={cardHeight + GAP}
        overscanCount={overscanCount}
        style={{ overflowX: totalWidth > containerWidth ? 'auto' : 'hidden' }}
      />
    </div>
  );
}
