import { load, type CheerioAPI } from 'cheerio';
import { mergeParaWithText } from './vlm-middle-json-mkcontent';
import { fullToHalf } from './char-utils';
import { BlockType, SplitFlag } from './enum';

type AnyElement = any;

const CONTINUATION_MARKERS = [
  '(续)',
  '(续表)',
  '(续上表)',
  '(continued)',
  '(cont.)',
  '(cont’d)',
];

function toInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function calculateTableTotalColumns($: CheerioAPI): number {
  const rows = $('tr').toArray();
  if (rows.length === 0) {
    return 0;
  }
  let maxCols = 0;
  const occupied = new Map<number, Set<number>>();

  rows.forEach((row, rowIdx) => {
    let colIdx = 0;
    const cells = $(row).find('td,th').toArray();
    if (!occupied.has(rowIdx)) {
      occupied.set(rowIdx, new Set());
    }

    cells.forEach((cell) => {
      const rowSet = occupied.get(rowIdx)!;
      while (rowSet.has(colIdx)) {
        colIdx += 1;
      }

      const colspan = toInt($(cell).attr('colspan'), 1);
      const rowspan = toInt($(cell).attr('rowspan'), 1);

      for (let r = rowIdx; r < rowIdx + rowspan; r += 1) {
        if (!occupied.has(r)) {
          occupied.set(r, new Set());
        }
        const colSet = occupied.get(r)!;
        for (let c = colIdx; c < colIdx + colspan; c += 1) {
          colSet.add(c);
        }
      }

      colIdx += colspan;
      maxCols = Math.max(maxCols, colIdx);
    });
  });

  return maxCols;
}

function calculateRowColumns($: CheerioAPI, row: AnyElement): number {
  const cells = $(row).find('td,th').toArray();
  let columnCount = 0;
  cells.forEach((cell) => {
    columnCount += toInt($(cell).attr('colspan'), 1);
  });
  return columnCount;
}

function calculateVisualColumns($: CheerioAPI, row: AnyElement): number {
  return $(row).find('td,th').length;
}

function detectTableHeaders(
  soup1: CheerioAPI,
  soup2: CheerioAPI,
  maxHeaderRows: number = 5
): { headerRows: number; headersMatch: boolean; headerTexts: string[][] } {
  const rows1 = soup1('tr').toArray();
  const rows2 = soup2('tr').toArray();
  const minRows = Math.min(rows1.length, rows2.length, maxHeaderRows);
  let headerRows = 0;
  let headersMatch = true;
  const headerTexts: string[][] = [];

  for (let i = 0; i < minRows; i += 1) {
    const cells1 = soup1(rows1[i]).find('td,th').toArray();
    const cells2 = soup2(rows2[i]).find('td,th').toArray();
    let structureMatch = true;

    if (cells1.length !== cells2.length) {
      structureMatch = false;
    } else {
      for (let j = 0; j < cells1.length; j += 1) {
        const cell1 = cells1[j];
        const cell2 = cells2[j];
        const colspan1 = toInt(soup1(cell1).attr('colspan'), 1);
        const rowspan1 = toInt(soup1(cell1).attr('rowspan'), 1);
        const colspan2 = toInt(soup2(cell2).attr('colspan'), 1);
        const rowspan2 = toInt(soup2(cell2).attr('rowspan'), 1);
        const text1 = fullToHalf(soup1(cell1).text()).split(/\s+/).join('');
        const text2 = fullToHalf(soup2(cell2).text()).split(/\s+/).join('');
        if (
          colspan1 !== colspan2 ||
          rowspan1 !== rowspan2 ||
          text1 !== text2
        ) {
          structureMatch = false;
          break;
        }
      }
    }

    if (structureMatch) {
      headerRows += 1;
      const rowTexts = cells1.map((cell) =>
        fullToHalf(soup1(cell).text().trim())
      );
      headerTexts.push(rowTexts);
    } else {
      headersMatch = headerRows > 0;
      break;
    }
  }

  if (headerRows === 0) {
    headersMatch = false;
  }

  return { headerRows, headersMatch, headerTexts };
}

function checkRowsMatch(soup1: CheerioAPI, soup2: CheerioAPI): boolean {
  const rows1 = soup1('tr').toArray();
  const rows2 = soup2('tr').toArray();
  if (rows1.length === 0 || rows2.length === 0) {
    return false;
  }

  let lastRow: AnyElement | null = null;
  for (let i = rows1.length - 1; i >= 0; i -= 1) {
    const row = rows1[i];
    if (soup1(row).find('td,th').length) {
      lastRow = row;
      break;
    }
  }

  const { headerRows } = detectTableHeaders(soup1, soup2);
  const firstDataRow = rows2.length > headerRows ? rows2[headerRows] : null;

  if (!lastRow || !firstDataRow) {
    return false;
  }

  const lastRowCols = calculateRowColumns(soup1, lastRow);
  const firstRowCols = calculateRowColumns(soup2, firstDataRow);
  const lastRowVisualCols = calculateVisualColumns(soup1, lastRow);
  const firstRowVisualCols = calculateVisualColumns(soup2, firstDataRow);

  return lastRowCols === firstRowCols || lastRowVisualCols === firstRowVisualCols;
}

function checkRowColumnsMatch(
  $: CheerioAPI,
  row: AnyElement,
  referenceStructure: number[]
): boolean {
  const cells = $(row).find('td,th').toArray();
  if (cells.length !== referenceStructure.length) {
    return false;
  }
  for (let i = 0; i < cells.length; i += 1) {
    const colspan = toInt($(cells[i]).attr('colspan'), 1);
    if (colspan !== referenceStructure[i]) {
      return false;
    }
  }
  return true;
}

function adjustTableRowsColspan(
  rows: AnyElement[],
  startIdx: number,
  endIdx: number,
  referenceStructure: number[],
  referenceVisualCols: number,
  targetCols: number,
  currentCols: number,
  $: CheerioAPI
): void {
  for (let i = startIdx; i < endIdx; i += 1) {
    const row = rows[i];
    const cells = $(row).find('td,th').toArray();
    if (cells.length === 0) {
      continue;
    }

    const currentRowCols = calculateRowColumns($, row);
    if (currentRowCols >= targetCols) {
      continue;
    }

    if (
      calculateVisualColumns($, row) === referenceVisualCols &&
      checkRowColumnsMatch($, row, referenceStructure)
    ) {
      for (let j = 0; j < cells.length; j += 1) {
        if (j < referenceStructure.length && referenceStructure[j] > 1) {
          $(cells[j]).attr('colspan', String(referenceStructure[j]));
        }
      }
    } else {
      const lastCell = cells[cells.length - 1];
      const currentLastSpan = toInt($(lastCell).attr('colspan'), 1);
      $(lastCell).attr(
        'colspan',
        String(currentLastSpan + (targetCols - currentCols))
      );
    }
  }
}

function performTableMerge(
  soup1: CheerioAPI,
  soup2: CheerioAPI,
  previousTableBlock: any,
  waitMergeTableFootnotes: any[]
): string {
  const { headerRows } = detectTableHeaders(soup1, soup2);

  const tbody1 = soup1('tbody').first();
  const table1 = tbody1.length ? tbody1 : soup1('table').first();

  const rows1 = soup1('tr').toArray();
  const rows2 = soup2('tr').toArray();

  if (rows1.length && rows2.length && headerRows < rows2.length) {
    const lastRow1 = rows1[rows1.length - 1];
    const firstDataRow2 = rows2[headerRows];

    const tableCols1 = calculateTableTotalColumns(soup1);
    const tableCols2 = calculateTableTotalColumns(soup2);

    if (tableCols1 >= tableCols2) {
      const referenceStructure = soup1(lastRow1)
        .find('td,th')
        .toArray()
        .map((cell) => toInt(soup1(cell).attr('colspan'), 1));
      const referenceVisualCols = calculateVisualColumns(soup1, lastRow1);
      adjustTableRowsColspan(
        rows2,
        headerRows,
        rows2.length,
        referenceStructure,
        referenceVisualCols,
        tableCols1,
        tableCols2,
        soup2
      );
    } else {
      const referenceStructure = soup2(firstDataRow2)
        .find('td,th')
        .toArray()
        .map((cell) => toInt(soup2(cell).attr('colspan'), 1));
      const referenceVisualCols = calculateVisualColumns(
        soup2,
        firstDataRow2
      );
      adjustTableRowsColspan(
        rows1,
        0,
        rows1.length,
        referenceStructure,
        referenceVisualCols,
        tableCols2,
        tableCols1,
        soup1
      );
    }
  }

  if (table1.length) {
    const tbody2 = soup2('tbody').first();
    const table2 = tbody2.length ? tbody2 : soup2('table').first();
    if (table2.length) {
      for (let i = headerRows; i < rows2.length; i += 1) {
        const rowHtml = soup2.html(rows2[i]) ?? '';
        if (rowHtml) {
          table1.append(rowHtml);
        }
      }
    }
  }

  waitMergeTableFootnotes.forEach((tableFootnote) => {
    const tempTableFootnote = { ...tableFootnote, [SplitFlag.CROSS_PAGE]: true };
    previousTableBlock.blocks.push(tempTableFootnote);
  });

  return soup1.root().html() ?? '';
}

function canMergeTables(
  currentTableBlock: any,
  previousTableBlock: any
): {
  canMerge: boolean;
  soup1: CheerioAPI | null;
  soup2: CheerioAPI | null;
  currentHtml: string;
  previousHtml: string;
} {
  const captionBlocks = (currentTableBlock.blocks || []).filter(
    (block: any) => block.type === BlockType.TABLE_CAPTION
  );
  if (captionBlocks.length > 0) {
    const anyMatch = captionBlocks.some((block: any) =>
      CONTINUATION_MARKERS.some((marker) =>
        fullToHalf(mergeParaWithText(block).trim())
          .toLowerCase()
          .endsWith(marker.toLowerCase())
      )
    );
    if (!anyMatch) {
      return {
        canMerge: false,
        soup1: null,
        soup2: null,
        currentHtml: '',
        previousHtml: '',
      };
    }
  }

  if (
    (previousTableBlock.blocks || []).some(
      (block: any) => block.type === BlockType.TABLE_FOOTNOTE
    )
  ) {
    return {
      canMerge: false,
      soup1: null,
      soup2: null,
      currentHtml: '',
      previousHtml: '',
    };
  }

  let currentHtml = '';
  let previousHtml = '';

  for (const block of currentTableBlock.blocks || []) {
    if (
      block.type === BlockType.TABLE_BODY &&
      block.lines &&
      block.lines[0]?.spans?.length
    ) {
      currentHtml = block.lines[0].spans[0].html || '';
    }
  }

  for (const block of previousTableBlock.blocks || []) {
    if (
      block.type === BlockType.TABLE_BODY &&
      block.lines &&
      block.lines[0]?.spans?.length
    ) {
      previousHtml = block.lines[0].spans[0].html || '';
    }
  }

  if (!currentHtml || !previousHtml) {
    return {
      canMerge: false,
      soup1: null,
      soup2: null,
      currentHtml: '',
      previousHtml: '',
    };
  }

  const [x0t1, , x1t1] = currentTableBlock.bbox || [];
  const [x0t2, , x1t2] = previousTableBlock.bbox || [];
  const table1Width = x1t1 - x0t1;
  const table2Width = x1t2 - x0t2;
  const minWidth = Math.min(table1Width, table2Width);

  if (!Number.isFinite(minWidth) || minWidth <= 0) {
    return {
      canMerge: false,
      soup1: null,
      soup2: null,
      currentHtml: '',
      previousHtml: '',
    };
  }

  if (Math.abs(table1Width - table2Width) / minWidth >= 0.1) {
    return {
      canMerge: false,
      soup1: null,
      soup2: null,
      currentHtml: '',
      previousHtml: '',
    };
  }

  const soup1 = load(previousHtml, { decodeEntities: false } as any, false);
  const soup2 = load(currentHtml, { decodeEntities: false } as any, false);

  const tableCols1 = calculateTableTotalColumns(soup1);
  const tableCols2 = calculateTableTotalColumns(soup2);
  const tablesMatch = tableCols1 === tableCols2;
  const rowsMatch = checkRowsMatch(soup1, soup2);

  return {
    canMerge: tablesMatch || rowsMatch,
    soup1,
    soup2,
    currentHtml,
    previousHtml,
  };
}

export function mergeTable(pageInfoList: any[]): void {
  for (let pageIdx = pageInfoList.length - 1; pageIdx >= 0; pageIdx -= 1) {
    if (pageIdx === 0) {
      continue;
    }
    const pageInfo = pageInfoList[pageIdx];
    const previousPageInfo = pageInfoList[pageIdx - 1];

    if (
      !(
        pageInfo?.para_blocks?.length &&
        pageInfo.para_blocks[0].type === BlockType.TABLE
      )
    ) {
      continue;
    }

    const currentTableBlock = pageInfo.para_blocks[0];

    if (
      !(
        previousPageInfo?.para_blocks?.length &&
        previousPageInfo.para_blocks[previousPageInfo.para_blocks.length - 1]
          .type === BlockType.TABLE
      )
    ) {
      continue;
    }

    const previousTableBlock =
      previousPageInfo.para_blocks[previousPageInfo.para_blocks.length - 1];

    const waitMergeTableFootnotes = (currentTableBlock.blocks || []).filter(
      (block: any) => block.type === BlockType.TABLE_FOOTNOTE
    );

    const { canMerge, soup1, soup2 } = canMergeTables(
      currentTableBlock,
      previousTableBlock
    );

    if (!canMerge || !soup1 || !soup2) {
      continue;
    }

    const mergedHtml = performTableMerge(
      soup1,
      soup2,
      previousTableBlock,
      waitMergeTableFootnotes
    );

    for (const block of previousTableBlock.blocks || []) {
      if (
        block.type === BlockType.TABLE_BODY &&
        block.lines &&
        block.lines[0]?.spans?.length
      ) {
        block.lines[0].spans[0].html = mergedHtml;
        break;
      }
    }

    for (const block of currentTableBlock.blocks || []) {
      block.lines = [];
      block[SplitFlag.LINES_DELETED] = true;
    }
  }
}
