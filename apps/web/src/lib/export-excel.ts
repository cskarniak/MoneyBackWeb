import api from '@/lib/api';

type CellValue = string | number | boolean | null | undefined;

type ExportExcelOptions = {
  endpoint: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers: string[];
  mapItem: (item: Record<string, any>) => CellValue[];
  filenameBase: string;
  pageSize?: number;
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatCellValue(value: CellValue) {
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function renderCell(value: CellValue) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  return `<Cell><Data ss:Type="String">${escapeXml(formatCellValue(value))}</Data></Cell>`;
}

function buildExcelXml(headers: string[], rows: CellValue[][]) {
  const headerRow = `<Row>${headers.map(header => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join('')}</Row>`;
  const bodyRows = rows.map(row => (
    `<Row>${row.map(value => renderCell(value)).join('')}</Row>`
  )).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Export">
    <Table>
      ${headerRow}
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function downloadExcel(content: string, filename: string) {
  const blob = new Blob([content], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildFilename(filenameBase: string) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${filenameBase}-${dateStamp}.xls`;
}

export async function exportPaginatedListToExcel({
  endpoint,
  params,
  headers,
  mapItem,
  filenameBase,
  pageSize = 500,
}: ExportExcelOptions) {
  const firstResponse = await api.get(endpoint, {
    params: {
      ...(params ?? {}),
      page: 1,
      limit: pageSize,
    },
  });

  const total = Number(firstResponse.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = [...((firstResponse.data?.items as Record<string, unknown>[] | undefined) ?? [])];

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get(endpoint, {
      params: {
        ...(params ?? {}),
        page,
        limit: pageSize,
      },
    });

    items.push(...(((response.data?.items as Record<string, unknown>[] | undefined) ?? [])));
  }

  const rows = items.map(mapItem);
  const workbook = buildExcelXml(headers, rows);
  downloadExcel(workbook, buildFilename(filenameBase));

  return rows.length;
}
