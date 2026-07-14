import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  BankCsvConfirmDto,
  BankCsvMappingDto,
  BankCsvPreviewDto,
  CreateImportProfileDto,
  ImportProfileFiltersDto,
  UpdateImportProfileDto,
} from '@moneyback/shared';
import type { Prisma } from '@moneyback/db';

type PreviewLineStatus = 'valid' | 'error' | 'duplicate';

type ParsedPreviewLine = {
  lineNum: number;
  operationDate: Date | null;
  label: string | null;
  comment: string | null;
  pieceNumber: string | null;
  expense: string | null;
  income: string | null;
  statementRef: string | null;
  rawData: Record<string, string>;
  status: PreviewLineStatus;
  errors: string[];
  duplicateInFile: boolean;
  alreadyInOperations: boolean;
  duplicateOperationId: string | null;
};

type LearnedColumn = NonNullable<BankCsvMappingDto['learnedColumns']>[number];

@Injectable()
export class ImportProfilesService {
  constructor(private prisma: PrismaService) {}

  private presenter(profile: {
    id: string;
    name: string;
    source: string;
    mapping: Prisma.JsonValue;
    delimiter: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const mapping = profile.mapping as BankCsvMappingDto;

    return {
      id: profile.id,
      name: profile.name,
      source: profile.source,
      active: profile.active,
      delimiter: profile.delimiter,
      bankKey: mapping.bankKey,
      bankLabel: mapping.bankLabel,
      mapping,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private splitCsvLine(line: string, delimiter: string) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  private parseCsv(content: string, delimiter: string) {
    return content
      .split(/\n/)
      .map(line => line.replace(/\r/g, ''))
      .filter(line => line.trim() !== '')
      .map(line => this.splitCsvLine(line, delimiter));
  }

  private selectColumnValue(
    row: string[],
    headers: string[] | null,
    selector: { headerName?: string; columnIndex?: number },
  ) {
    if (selector.columnIndex !== undefined) {
      return row[selector.columnIndex] ?? null;
    }

    if (!headers || !selector.headerName) {
      return null;
    }

    const headerIndex = headers.findIndex(
      header => header.trim().toLowerCase() === selector.headerName?.trim().toLowerCase(),
    );

    if (headerIndex < 0) {
      return null;
    }

    return row[headerIndex] ?? null;
  }

  private parseDecimal(
    value: string | null,
    decimalSeparator: string,
    thousandsSeparator?: string | null,
  ) {
    if (value === null) return null;
    const trimmed = value.trim();
    if (trimmed === '') return null;

    const withoutThousands = thousandsSeparator
      ? trimmed.split(thousandsSeparator).join('')
      : trimmed.replace(/\s+/g, '');
    const normalized = withoutThousands.replace(decimalSeparator, '.');

    if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
      throw new Error(`montant illisible: "${value}"`);
    }

    return Number(normalized).toFixed(2);
  }

  private normalizeUnsignedAmount(value: string | null) {
    if (value === null) return null;
    return Math.abs(Number(value)).toFixed(2);
  }

  private parseDate(value: string | null, format: string) {
    if (!value || value.trim() === '') return null;
    const trimmed = value.trim();

    if (format === 'dd/MM/yyyy') {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
      if (!match) throw new Error(`date illisible: "${value}"`);
      const [, day, month, year] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    if (format === 'yyyy-MM-dd') {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      if (!match) throw new Error(`date illisible: "${value}"`);
      const [, year, month, day] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    throw new Error(`format de date non supporte: "${format}"`);
  }

  private validateLearnedColumns(mapping: BankCsvMappingDto) {
    if (!mapping.learnedColumns || mapping.learnedColumns.length === 0) {
      return;
    }

    for (const column of mapping.learnedColumns) {
      if (column.field === 'ignore') {
        continue;
      }

      if (column.field === 'operationDate' && column.type !== 'date') {
        throw new Error(`La colonne "${column.headerName}" doit avoir le type "date".`);
      }

      if ((column.field === 'expense' || column.field === 'income') && column.type !== 'decimal') {
        throw new Error(`La colonne "${column.headerName}" doit avoir le type "decimal".`);
      }

      if (column.field === 'amount' && column.type !== 'signedAmount') {
        throw new Error(`La colonne "${column.headerName}" doit avoir le type "signedAmount".`);
      }

      if ((column.field === 'label' || column.field === 'comment' || column.field === 'pieceNumber' || column.field === 'statementRef') && column.type !== 'text') {
        throw new Error(`La colonne "${column.headerName}" doit avoir le type "text".`);
      }
    }
  }

  private findLearnedColumn(mapping: BankCsvMappingDto, field: LearnedColumn['field']) {
    return mapping.learnedColumns?.find(column => column.field === field) ?? null;
  }

  private parseLearnedColumnValue(
    value: string | null,
    column: LearnedColumn,
    mapping: BankCsvMappingDto,
  ) {
    switch (column.type) {
      case 'date':
        return this.parseDate(value, mapping.date.format);
      case 'decimal':
        return this.parseDecimal(
          value,
          mapping.amount.decimalSeparator,
          mapping.amount.thousandsSeparator,
        );
      case 'signedAmount':
        return this.parseDecimal(
          value,
          mapping.amount.decimalSeparator,
          mapping.amount.thousandsSeparator,
        );
      case 'text':
      default:
        return this.normalizeLabel(value);
    }
  }

  private normalizeLabel(value: string | null) {
    if (!value) return null;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized === '' ? null : normalized;
  }

  private buildLabelKey(value: string | null) {
    return (this.normalizeLabel(value) ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[°º]/g, '')
      .replace(/\uFFFD/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private labelsMatch(left: string | null, right: string | null) {
    const leftKey = this.buildLabelKey(left);
    const rightKey = this.buildLabelKey(right);

    if (!leftKey || !rightKey) {
      return false;
    }

    if (leftKey === rightKey) {
      return true;
    }

    return leftKey.startsWith(rightKey) || rightKey.startsWith(leftKey);
  }

  private buildDuplicateBaseKey(line: {
    accountId?: string | null;
    operationDate: Date | null;
    expense: string | null;
    income: string | null;
  }) {
    const accountKey = line.accountId ?? 'no-account';
    const dateKey = line.operationDate?.toISOString().slice(0, 10) ?? 'no-date';
    const amountKey = line.income ?? line.expense ?? '0';
    const directionKey = line.income ? 'income' : line.expense ? 'expense' : 'none';

    return `${accountKey}|${dateKey}|${directionKey}|${amountKey}`;
  }

  private buildRawData(headers: string[] | null, row: string[]) {
    if (!headers) {
      return Object.fromEntries(row.map((value, index) => [`column_${index}`, value]));
    }

    return Object.fromEntries(row.map((value, index) => [headers[index] ?? `column_${index}`, value]));
  }

  private buildAmountFields(
    mapping: BankCsvMappingDto,
    row: string[],
    headers: string[] | null,
  ) {
    const learnedAmountColumn = this.findLearnedColumn(mapping, 'amount');
    const learnedExpenseColumn = this.findLearnedColumn(mapping, 'expense');
    const learnedIncomeColumn = this.findLearnedColumn(mapping, 'income');

    if (learnedAmountColumn) {
      const rawAmount = this.selectColumnValue(row, headers, {
        headerName: learnedAmountColumn.headerName,
        columnIndex: learnedAmountColumn.columnIndex,
      });
      const parsedAmount = this.parseLearnedColumnValue(rawAmount, learnedAmountColumn, mapping);

      if (parsedAmount === null) {
        return { expense: null, income: null };
      }

      const numericAmount = Number(parsedAmount);
      if (numericAmount < 0) {
        return {
          expense: Math.abs(numericAmount).toFixed(2),
          income: null,
        };
      }

      if (numericAmount > 0) {
        return {
          expense: null,
          income: numericAmount.toFixed(2),
        };
      }

      return { expense: null, income: null };
    }

    if (learnedExpenseColumn && learnedIncomeColumn) {
      const expense = this.parseLearnedColumnValue(
        this.selectColumnValue(row, headers, {
          headerName: learnedExpenseColumn.headerName,
          columnIndex: learnedExpenseColumn.columnIndex,
        }),
        learnedExpenseColumn,
        mapping,
      );
      const income = this.parseLearnedColumnValue(
        this.selectColumnValue(row, headers, {
          headerName: learnedIncomeColumn.headerName,
          columnIndex: learnedIncomeColumn.columnIndex,
        }),
        learnedIncomeColumn,
        mapping,
      );

      return {
        expense: typeof expense === 'string' ? this.normalizeUnsignedAmount(expense) : null,
        income: typeof income === 'string' ? this.normalizeUnsignedAmount(income) : null,
      };
    }

    if (mapping.amount.mode === 'singleAmountSigned') {
      const rawAmount = this.selectColumnValue(row, headers, mapping.amount.column);
      const parsedAmount = this.parseDecimal(
        rawAmount,
        mapping.amount.decimalSeparator,
        mapping.amount.thousandsSeparator,
      );

      if (parsedAmount === null) {
        return { expense: null, income: null };
      }

      const numericAmount = Number(parsedAmount);
      if (numericAmount < 0) {
        return {
          expense: mapping.amount.negativeIsExpense ? Math.abs(numericAmount).toFixed(2) : null,
          income: null,
        };
      }

      if (numericAmount > 0) {
        return {
          expense: null,
          income: mapping.amount.positiveIsIncome ? numericAmount.toFixed(2) : null,
        };
      }

      return { expense: null, income: null };
    }

    const expense = this.parseDecimal(
      this.selectColumnValue(row, headers, mapping.amount.expenseColumn),
      mapping.amount.decimalSeparator,
      mapping.amount.thousandsSeparator,
    );
    const income = this.parseDecimal(
      this.selectColumnValue(row, headers, mapping.amount.incomeColumn),
      mapping.amount.decimalSeparator,
      mapping.amount.thousandsSeparator,
    );

    return {
      expense: this.normalizeUnsignedAmount(expense),
      income: this.normalizeUnsignedAmount(income),
    };
  }

  private buildDuplicateKey(line: {
    accountId?: string | null;
    operationDate: Date | null;
    label: string | null;
    expense: string | null;
    income: string | null;
  }) {
    const baseKey = this.buildDuplicateBaseKey(line);
    const labelKey = this.buildLabelKey(line.label);

    return `${baseKey}|${labelKey}`;
  }

  async findAll(filters: ImportProfileFiltersDto) {
    const { source, bankKey, active, search, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ImportProfileWhereInput = {
      ...(source && { source }),
      ...(active !== undefined && { active }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(bankKey && {
        mapping: {
          path: ['bankKey'],
          equals: bankKey,
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.importProfile.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.importProfile.count({ where }),
    ]);

    return { items: items.map(item => this.presenter(item)), total, page, limit };
  }

  async findOne(id: string) {
    const profile = await this.prisma.importProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Masque d'import ${id} introuvable`);
    }
    return this.presenter(profile);
  }

  async create(dto: CreateImportProfileDto) {
    const profile = await this.prisma.importProfile.create({
      data: {
        name: dto.name,
        source: dto.source,
        mapping: dto.mapping as Prisma.InputJsonValue,
        delimiter: dto.mapping.file.delimiter,
        active: dto.active,
      },
    });

    return this.presenter(profile);
  }

  async update(id: string, dto: UpdateImportProfileDto) {
    await this.findOne(id);

    const profile = await this.prisma.importProfile.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.mapping !== undefined && {
          mapping: dto.mapping as Prisma.InputJsonValue,
          delimiter: dto.mapping.file.delimiter,
        }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    return this.presenter(profile);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.importProfile.delete({ where: { id } });
  }

  async previewBankCsv(dto: BankCsvPreviewDto) {
    const mapping = dto.profileId
      ? ((await this.findOne(dto.profileId)).mapping as BankCsvMappingDto)
      : dto.mapping;

    if (!mapping) {
      throw new NotFoundException("Aucun masque d'import disponible");
    }

    this.validateLearnedColumns(mapping);

    const parsedRows = this.parseCsv(dto.csvContent, mapping.file.delimiter);
    const headers = mapping.file.hasHeader ? (parsedRows[0] ?? null) : null;
    const dataRows = parsedRows.slice(mapping.file.startLine - 1);
    const previewLines: ParsedPreviewLine[] = [];
    const seenKeys = new Set<string>();

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = dataRows[index]!;
      const lineNum = mapping.file.startLine + index;
      const rawData = this.buildRawData(headers, row);
      const errors: string[] = [];

      let operationDate: Date | null = null;
      let label: string | null = null;
      let comment: string | null = null;
      let pieceNumber: string | null = null;
      let statementRef: string | null = null;
      let expense: string | null = null;
      let income: string | null = null;

      try {
        const learnedDateColumn = this.findLearnedColumn(mapping, 'operationDate');
        if (learnedDateColumn) {
          operationDate = this.parseLearnedColumnValue(
            this.selectColumnValue(row, headers, {
              headerName: learnedDateColumn.headerName,
              columnIndex: learnedDateColumn.columnIndex,
            }),
            learnedDateColumn,
            mapping,
          ) as Date | null;
        } else {
          operationDate = this.parseDate(
            this.selectColumnValue(row, headers, mapping.date.column),
            mapping.date.format,
          );
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'date illisible');
      }

      const learnedLabelColumn = this.findLearnedColumn(mapping, 'label');
      label = learnedLabelColumn
        ? this.parseLearnedColumnValue(
            this.selectColumnValue(row, headers, {
              headerName: learnedLabelColumn.headerName,
              columnIndex: learnedLabelColumn.columnIndex,
            }),
            learnedLabelColumn,
            mapping,
          ) as string | null
        : this.normalizeLabel(this.selectColumnValue(row, headers, mapping.label.column));

      if (!label) {
        label = '';
      }

      const learnedCommentColumn = this.findLearnedColumn(mapping, 'comment');
      if (learnedCommentColumn) {
        comment = this.parseLearnedColumnValue(
          this.selectColumnValue(row, headers, {
            headerName: learnedCommentColumn.headerName,
            columnIndex: learnedCommentColumn.columnIndex,
          }),
          learnedCommentColumn,
          mapping,
        ) as string | null;
      } else if (mapping.comment) {
        comment = this.normalizeLabel(this.selectColumnValue(row, headers, mapping.comment.column));
      }

      const learnedPieceNumberColumn = this.findLearnedColumn(mapping, 'pieceNumber');
      if (learnedPieceNumberColumn) {
        pieceNumber = this.parseLearnedColumnValue(
          this.selectColumnValue(row, headers, {
            headerName: learnedPieceNumberColumn.headerName,
            columnIndex: learnedPieceNumberColumn.columnIndex,
          }),
          learnedPieceNumberColumn,
          mapping,
        ) as string | null;
      } else if (mapping.pieceNumber) {
        pieceNumber = this.normalizeLabel(this.selectColumnValue(row, headers, mapping.pieceNumber.column));
      }

      const learnedStatementRefColumn = this.findLearnedColumn(mapping, 'statementRef');
      if (learnedStatementRefColumn) {
        statementRef = this.parseLearnedColumnValue(
          this.selectColumnValue(row, headers, {
            headerName: learnedStatementRefColumn.headerName,
            columnIndex: learnedStatementRefColumn.columnIndex,
          }),
          learnedStatementRefColumn,
          mapping,
        ) as string | null;
      } else if (mapping.statementRef) {
        statementRef = this.normalizeLabel(this.selectColumnValue(row, headers, mapping.statementRef.column));
      }

      try {
        const amounts = this.buildAmountFields(mapping, row, headers);
        expense = amounts.expense;
        income = amounts.income;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'montant illisible');
      }

      if (!expense && !income) {
        errors.push('aucun montant exploitable');
      }

      if (expense && income) {
        errors.push('depense et recette ne peuvent pas etre renseignees simultanement');
      }

      const duplicateKey = this.buildDuplicateKey({
        accountId: dto.accountId ?? null,
        operationDate,
        label,
        expense,
        income,
      });
      const duplicateInFile = seenKeys.has(duplicateKey);
      seenKeys.add(duplicateKey);

      previewLines.push({
        lineNum,
        operationDate,
        label,
        comment,
        pieceNumber,
        expense,
        income,
        statementRef,
        rawData,
        status: errors.length > 0 ? 'error' : duplicateInFile ? 'duplicate' : 'valid',
        errors,
        duplicateInFile,
        alreadyInOperations: false,
        duplicateOperationId: null,
      });
    }

    const validCandidates = previewLines.filter(line => line.status !== 'error' && line.operationDate);
    const existingOperations = validCandidates.length > 0 && dto.accountId
      ? await this.prisma.operation.findMany({
          where: {
            accountId: dto.accountId,
            OR: validCandidates.map(line => ({
              operationDate: line.operationDate!,
              expense: line.expense ?? '0',
              income: line.income ?? '0',
            })),
          },
          select: {
            id: true,
            accountId: true,
            operationDate: true,
            label: true,
            expense: true,
            income: true,
            statementRef: true,
          },
        })
      : [];

    const duplicateMap = new Map<string, string>();
    const duplicateBaseMap = new Map<string, Array<{ id: string; label: string | null }>>();
    for (const operation of existingOperations) {
      const duplicateLine = {
        accountId: operation.accountId,
        operationDate: operation.operationDate,
        label: this.normalizeLabel(operation.label),
        expense: Number(operation.expense) > 0 ? Number(operation.expense).toFixed(2) : null,
        income: Number(operation.income) > 0 ? Number(operation.income).toFixed(2) : null,
      };
      const key = this.buildDuplicateKey(duplicateLine);
      const baseKey = this.buildDuplicateBaseKey(duplicateLine);
      duplicateMap.set(key, operation.id);
      const entries = duplicateBaseMap.get(baseKey) ?? [];
      entries.push({ id: operation.id, label: operation.label });
      duplicateBaseMap.set(baseKey, entries);
    }

    for (const line of previewLines) {
      if (line.status === 'error') continue;
      const duplicateLine = {
        accountId: dto.accountId ?? null,
        operationDate: line.operationDate,
        label: line.label,
        expense: line.expense,
        income: line.income,
      };
      const key = this.buildDuplicateKey(duplicateLine);
      const duplicateBaseKey = this.buildDuplicateBaseKey(duplicateLine);
      const duplicateOperationId =
        duplicateMap.get(key)
        ?? duplicateBaseMap
          .get(duplicateBaseKey)
          ?.find(operation => this.labelsMatch(line.label, operation.label))
          ?.id
        ?? null;

      if (duplicateOperationId) {
        line.status = 'duplicate';
        line.alreadyInOperations = true;
        line.duplicateOperationId = duplicateOperationId;
      }
    }

    const totalLines = previewLines.length;
    const validLines = previewLines.filter(line => line.status === 'valid').length;
    const duplicateLines = previewLines.filter(line => line.status === 'duplicate').length;
    const errorLines = previewLines.filter(line => line.status === 'error').length;

    return {
      profileId: dto.profileId ?? null,
      bankKey: mapping.bankKey,
      bankLabel: mapping.bankLabel,
      accountId: dto.accountId ?? null,
      reference: dto.reference ?? null,
      integrationDate: dto.integrationDate ?? null,
      totalLines,
      validLines,
      duplicateLines,
      errorLines,
      lines: previewLines.map(line => ({
        lineNum: line.lineNum,
        status: line.status,
        operationDate: line.operationDate?.toISOString() ?? null,
        label: line.label,
        comment: line.comment,
        pieceNumber: line.pieceNumber,
        expense: line.expense,
        income: line.income,
        statementRef: line.statementRef,
        errors: line.errors,
        duplicateInFile: line.duplicateInFile,
        alreadyInOperations: line.alreadyInOperations,
        duplicateOperationId: line.duplicateOperationId,
        rawData: line.rawData,
      })),
    };
  }

  async confirmBankCsv(dto: BankCsvConfirmDto) {
    const integrationDate = new Date(dto.integrationDate ?? new Date().toISOString());
    const importedOperationIds: string[] = [];
    const skippedLineNums: number[] = [];

    for (const line of dto.lines) {
      const operationDate = new Date(line.operationDate ?? integrationDate.toISOString());
      const expense = line.expense ?? null;
      const income = line.income ?? null;
      const duplicateLine = {
        accountId: dto.accountId,
        operationDate,
        label: line.label,
        expense,
        income,
      };

      if (!line.forceImport) {
        const baseWhere = {
          accountId: dto.accountId,
          operationDate,
          expense: expense ?? '0',
          income: income ?? '0',
        };

        const existingOperations = await this.prisma.operation.findMany({
          where: baseWhere,
          select: {
            id: true,
            accountId: true,
            operationDate: true,
            label: true,
            expense: true,
            income: true,
          },
        });

        const duplicateKey = this.buildDuplicateKey(duplicateLine);
        const duplicateBaseKey = this.buildDuplicateBaseKey(duplicateLine);
        const duplicateOperation = existingOperations.find(operation => {
          const existingLine = {
            accountId: operation.accountId,
            operationDate: operation.operationDate,
            label: this.normalizeLabel(operation.label),
            expense: Number(operation.expense) > 0 ? Number(operation.expense).toFixed(2) : null,
            income: Number(operation.income) > 0 ? Number(operation.income).toFixed(2) : null,
          };

          return this.buildDuplicateKey(existingLine) === duplicateKey
            || (
              this.buildDuplicateBaseKey(existingLine) === duplicateBaseKey
              && this.labelsMatch(line.label, operation.label)
            );
        });

        if (duplicateOperation) {
          skippedLineNums.push(line.lineNum);
          continue;
        }
      }

      const created = await this.prisma.operation.create({
        data: {
          accountId: dto.accountId,
          label: line.label,
          comment: line.comment ?? null,
          pieceNumber: line.pieceNumber ?? null,
          statementRef: dto.reference,
          expense: expense ? Number(expense) : 0,
          income: income ? Number(income) : 0,
          operationDate,
          dueDate: operationDate,
          integrationDate,
          operationValidated: null,
          entryMode: 'E',
          locked: false,
          closed: false,
        },
        select: { id: true },
      });

      importedOperationIds.push(created.id);
    }

    return {
      requestedCount: dto.lines.length,
      importedCount: importedOperationIds.length,
      skippedCount: skippedLineNums.length,
      skippedLineNums,
      importedOperationIds,
    };
  }
}
