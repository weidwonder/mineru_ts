const OTSL_NL = '<nl>';
const OTSL_FCEL = '<fcel>';
const OTSL_ECEL = '<ecel>';
const OTSL_LCEL = '<lcel>';
const OTSL_UCEL = '<ucel>';
const OTSL_XCEL = '<xcel>';

const OTSL_TOKENS = [
  OTSL_NL,
  OTSL_FCEL,
  OTSL_ECEL,
  OTSL_LCEL,
  OTSL_UCEL,
  OTSL_XCEL,
];

export type TableCell = {
  row_span: number;
  col_span: number;
  start_row_offset_idx: number;
  end_row_offset_idx: number;
  start_col_offset_idx: number;
  end_col_offset_idx: number;
  text: string;
  column_header?: boolean;
  row_header?: boolean;
  row_section?: boolean;
};

export type TableData = {
  table_cells: TableCell[];
  num_rows: number;
  num_cols: number;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function otslExtractTokensAndText(input: string): { tokens: string[]; textParts: string[] } {
  const pattern = new RegExp(`(${OTSL_TOKENS.map((t) => t.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|')})`);
  const tokens = input.match(new RegExp(pattern.source, 'g')) || [];
  const textParts = input
    .split(pattern)
    .map((part) => part)
    .filter((part) => part.trim());
  return { tokens, textParts };
}

function otslParseTexts(texts: string[], tokens: string[]): { table_cells: TableCell[]; split_row_tokens: string[][] } {
  const split_row_tokens: string[][] = [];
  let current: string[] = [];
  for (const token of tokens) {
    if (token === OTSL_NL) {
      if (current.length > 0) {
        split_row_tokens.push(current);
        current = [];
      }
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) {
    split_row_tokens.push(current);
  }

  if (split_row_tokens.length > 0) {
    const maxCols = Math.max(...split_row_tokens.map((row) => row.length));
    for (const row of split_row_tokens) {
      while (row.length < maxCols) {
        row.push(OTSL_ECEL);
      }
    }

    const newTexts: string[] = [];
    let textIdx = 0;
    for (const row of split_row_tokens) {
      for (const token of row) {
        newTexts.push(token);
        if (textIdx < texts.length && texts[textIdx] === token) {
          textIdx += 1;
          if (
            textIdx < texts.length &&
            !OTSL_TOKENS.includes(texts[textIdx])
          ) {
            newTexts.push(texts[textIdx]);
            textIdx += 1;
          }
        }
      }
      newTexts.push(OTSL_NL);
      if (textIdx < texts.length && texts[textIdx] === OTSL_NL) {
        textIdx += 1;
      }
    }
    texts = newTexts;
  }

  const table_cells: TableCell[] = [];
  let r_idx = 0;
  let c_idx = 0;

  const countRight = (rows: string[][], col: number, row: number, which: string[]): number => {
    let span = 0;
    let c = col;
    while (rows[row][c] && which.includes(rows[row][c])) {
      c += 1;
      span += 1;
      if (c >= rows[row].length) {
        return span;
      }
    }
    return span;
  };

  const countDown = (rows: string[][], col: number, row: number, which: string[]): number => {
    let span = 0;
    let r = row;
    while (rows[r] && rows[r][col] && which.includes(rows[r][col])) {
      r += 1;
      span += 1;
      if (r >= rows.length) {
        return span;
      }
    }
    return span;
  };

  for (let i = 0; i < texts.length; i += 1) {
    const text = texts[i];
    let cellText = '';
    if (text === OTSL_FCEL || text === OTSL_ECEL) {
      let rowSpan = 1;
      let colSpan = 1;
      let rightOffset = 1;
      if (
        text !== OTSL_ECEL &&
        i + 1 < texts.length &&
        !OTSL_TOKENS.includes(texts[i + 1])
      ) {
        cellText = texts[i + 1];
        rightOffset = 2;
      }

      let nextRightCell = '';
      if (i + rightOffset < texts.length) {
        nextRightCell = texts[i + rightOffset];
      }

      let nextBottomCell = '';
      if (r_idx + 1 < split_row_tokens.length && c_idx < split_row_tokens[r_idx + 1].length) {
        nextBottomCell = split_row_tokens[r_idx + 1][c_idx];
      }

      if (nextRightCell === OTSL_LCEL || nextRightCell === OTSL_XCEL) {
        colSpan += countRight(split_row_tokens, c_idx + 1, r_idx, [OTSL_LCEL, OTSL_XCEL]);
      }
      if (nextBottomCell === OTSL_UCEL || nextBottomCell === OTSL_XCEL) {
        rowSpan += countDown(split_row_tokens, c_idx, r_idx + 1, [OTSL_UCEL, OTSL_XCEL]);
      }

      table_cells.push({
        text: cellText.trim(),
        row_span: rowSpan,
        col_span: colSpan,
        start_row_offset_idx: r_idx,
        end_row_offset_idx: r_idx + rowSpan,
        start_col_offset_idx: c_idx,
        end_col_offset_idx: c_idx + colSpan,
      });
    }

    if ([OTSL_FCEL, OTSL_ECEL, OTSL_LCEL, OTSL_UCEL, OTSL_XCEL].includes(text)) {
      c_idx += 1;
    }
    if (text === OTSL_NL) {
      r_idx += 1;
      c_idx = 0;
    }
  }

  return { table_cells, split_row_tokens };
}

function buildGrid(tableData: TableData): TableCell[][] {
  const grid: TableCell[][] = Array.from({ length: tableData.num_rows }, (_, i) =>
    Array.from({ length: tableData.num_cols }, (_, j) => ({
      text: '',
      row_span: 1,
      col_span: 1,
      start_row_offset_idx: i,
      end_row_offset_idx: i + 1,
      start_col_offset_idx: j,
      end_col_offset_idx: j + 1,
    }))
  );

  for (const cell of tableData.table_cells) {
    for (let i = Math.min(cell.start_row_offset_idx, tableData.num_rows); i < Math.min(cell.end_row_offset_idx, tableData.num_rows); i += 1) {
      for (let j = Math.min(cell.start_col_offset_idx, tableData.num_cols); j < Math.min(cell.end_col_offset_idx, tableData.num_cols); j += 1) {
        grid[i][j] = cell;
      }
    }
  }
  return grid;
}

function exportToHtml(tableData: TableData): string {
  const nrows = tableData.num_rows;
  const ncols = tableData.num_cols;
  if (!tableData.table_cells.length) {
    return '';
  }

  const grid = buildGrid(tableData);
  const htmlParts: string[] = [];

  for (let i = 0; i < nrows; i += 1) {
    htmlParts.push('<tr>');
    for (let j = 0; j < ncols; j += 1) {
      const cell = grid[i][j];
      if (cell.start_row_offset_idx !== i || cell.start_col_offset_idx !== j) {
        continue;
      }
      const content = escapeHtml(cell.text.trim());
      const cellTag = cell.column_header ? 'th' : 'td';
      const openingParts = [`<${cellTag}`];
      if (cell.row_span > 1) {
        openingParts.push(` rowspan="${cell.row_span}"`);
      }
      if (cell.col_span > 1) {
        openingParts.push(` colspan="${cell.col_span}"`);
      }
      openingParts.push('>');
      const openingTag = openingParts.join('');
      htmlParts.push(`${openingTag}${content}</${cellTag}>`);
    }
    htmlParts.push('</tr>');
  }

  return `<table>${htmlParts.join('')}</table>`;
}

export function convertOtslToHtml(otslContent: string): string {
  if (otslContent.startsWith('<table') && otslContent.endsWith('</table>')) {
    return otslContent;
  }

  const { tokens, textParts } = otslExtractTokensAndText(otslContent);
  const { table_cells, split_row_tokens } = otslParseTexts(textParts, tokens);

  const numRows = split_row_tokens.length;
  const numCols = split_row_tokens.length ? Math.max(...split_row_tokens.map((row) => row.length)) : 0;

  const tableData: TableData = {
    num_rows: numRows,
    num_cols: numCols,
    table_cells,
  };

  return exportToHtml(tableData);
}
