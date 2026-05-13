import { useRef, useState, useEffect, memo } from 'react';
import { Grid } from 'react-window';
import RecordCard from './RecordCard';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 380;
const GAP = 24;

const CellComponent = memo(({ style, rowIndex, columnIndex, items, columnCount, recordToIndex, onToggle, onEdit, onView, getRelatedLabels, selected, onDragStart, onDragOver, onDrop, setDragIndex }) => {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= items.length) return null;

  const r = items[index];
  const realIdx = recordToIndex ? recordToIndex.get(r) : index;

  return (
    <div style={{ ...style, padding: '0' }}>
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
      />
    </div>
  );
});

CellComponent.displayName = 'VirtualCell';

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
}) {
  const [containerWidth, setContainerWidth] = useState(1100);
  const containerRef = useRef(null);

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

  const columnCount = Math.max(1, Math.floor((containerWidth + GAP) / (CARD_WIDTH + GAP)));
  const rowCount = Math.ceil(records.length / columnCount);
  return (
    <div ref={containerRef} style={{ width: '100%', height: '70vh', minHeight: 500 }}>
      <Grid
        cellComponent={CellComponent}
        cellProps={{
          items: records,
          columnCount,
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
        }}
        columnCount={columnCount}
        columnWidth={CARD_WIDTH + GAP}
        rowCount={rowCount}
        rowHeight={CARD_HEIGHT + GAP}
        overscanCount={overscanCount}
        style={{ overflowX: 'hidden' }}
      />
    </div>
  );
}
