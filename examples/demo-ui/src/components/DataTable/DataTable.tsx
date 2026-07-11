import { demo } from '../../theme';

export type TableDensity = 'compact' | 'comfortable' | 'spacious';
export type SortDirection = 'asc' | 'desc' | 'none';

export interface DataTableColumn {
  /** Field name on each row */
  field: string;
  /** Header label */
  label: string;
  /** Optional fixed width in pixels */
  width?: number;
  /** Align cell content */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableRow {
  id: string;
  name: string;
  email: string;
  status: string;
  amount: number;
}

export interface DataTableProps {
  /** Column definitions */
  columns: DataTableColumn[];
  /** Row data keyed by column.field */
  rows: DataTableRow[];
  /** Caption shown above the table */
  caption?: string;
  /** Row padding density */
  density?: TableDensity;
  /** Highlight the selected row id */
  selectedRowId?: string;
  /** Enable hover highlight */
  hoverable?: boolean;
  /** Show zebra striping */
  striped?: boolean;
  /** Active sort column field */
  sortKey?: string;
  /** Active sort direction */
  sortDirection?: SortDirection;
  /** Fired when a row is clicked */
  onRowClick?: (rowId: string) => void;
  /** Fired when a sortable header is clicked */
  onSort?: (key: string) => void;
}

const densityPad: Record<TableDensity, string> = {
  compact: '8px 10px',
  comfortable: '12px 14px',
  spacious: '16px 16px',
};

export function DataTable({
  columns,
  rows,
  caption,
  density = 'comfortable',
  selectedRowId,
  hoverable = true,
  striped = true,
  sortKey,
  sortDirection = 'none',
  onRowClick,
}: DataTableProps) {
  return (
    <div
      style={{
        fontFamily: demo.font,
        background: demo.white,
        borderRadius: 14,
        overflow: 'hidden',
        maxWidth: 720,
        boxShadow: '0 18px 40px rgba(26,24,20,0.1)',
      }}
    >
      {caption ? (
        <div
          style={{
            padding: '14px 16px',
            background: demo.surface,
            fontSize: 13,
            fontWeight: 600,
            color: demo.ink,
          }}
        >
          {caption}
        </div>
      ) : null}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: demo.panel }}>
            {columns.map((col) => {
              const active = sortKey === col.field && sortDirection !== 'none';
              return (
                <th
                  key={col.field}
                  style={{
                    textAlign: col.align ?? 'left',
                    padding: densityPad[density],
                    fontWeight: 600,
                    color: demo.muted,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    width: col.width,
                  }}
                >
                  {col.label}
                  {active ? (
                    <span style={{ marginLeft: 4, color: demo.accent }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const selected = row.id === selectedRowId;
            return (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.id)}
                style={{
                  background: selected
                    ? demo.accentSoft
                    : striped && index % 2 === 1
                      ? demo.surface
                      : demo.white,
                  cursor: onRowClick || hoverable ? 'pointer' : 'default',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.field}
                    style={{
                      padding: densityPad[density],
                      textAlign: col.align ?? 'left',
                      color: demo.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCell(row[col.field as keyof DataTableRow])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div
          style={{
            padding: 28,
            textAlign: 'center',
            color: demo.muted,
            fontSize: 13,
          }}
        >
          No rows to display
        </div>
      ) : null}
    </div>
  );
}

function formatCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default DataTable;
