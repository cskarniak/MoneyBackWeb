import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ThirdPartyMatchingField,
  ThirdPartyMatchingMatcher,
  ThirdPartyMatchingOperator,
} from '@moneyback/shared';
import type { ThirdPartyMatchingCandidateDto } from '@moneyback/shared';

type LoadedRule = {
  id: string;
  label: string;
  operator: string;
  stopOnMatch: boolean;
  thirdPartyId: string;
  thirdParty: {
    id: string;
    name: string;
    ventilated: boolean;
    active: boolean;
  };
  conditions: Array<{
    id: string;
    field: string;
    matcher: string;
    value: string | null;
    value2: string | null;
    negate: boolean;
    position: number;
  }>;
};

export type ThirdPartyMatchConditionResult = {
  conditionId: string;
  field: string;
  matcher: string;
  matched: boolean;
};

export type ThirdPartyMatchResult = {
  thirdPartyId: string;
  thirdPartyName: string;
  ventilated: boolean;
  matchedRuleId: string;
  matchedRuleLabel: string;
  matchedConditions: ThirdPartyMatchConditionResult[];
};

@Injectable()
export class ThirdPartyMatchingService {
  constructor(private prisma: PrismaService) {}

  async matchCandidate(candidate: ThirdPartyMatchingCandidateDto): Promise<ThirdPartyMatchResult | null> {
    const normalizedCandidate = this.normalizeCandidate(candidate);
    const rules = await this.prisma.thirdPartyMatchingRule.findMany({
      where: {
        active: true,
        thirdParty: {
          active: true,
        },
      },
      include: {
        thirdParty: {
          select: {
            id: true,
            name: true,
            ventilated: true,
            active: true,
          },
        },
        conditions: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let lastMatch: ThirdPartyMatchResult | null = null;

    for (const rule of rules) {
      const evaluated = this.evaluateRule(rule, normalizedCandidate);
      if (!evaluated) continue;

      lastMatch = evaluated;

      if (rule.stopOnMatch) {
        break;
      }
    }

    return lastMatch;
  }

  private normalizeCandidate(candidate: ThirdPartyMatchingCandidateDto) {
    return {
      ...candidate,
      normalizedLabel: (candidate.normalizedLabel ?? candidate.label).trim().toLowerCase(),
      label: candidate.label.trim(),
      statementRef: candidate.statementRef?.trim() ?? null,
      counterpartyName: candidate.counterpartyName?.trim() ?? null,
      memo: candidate.memo?.trim() ?? null,
    };
  }

  private evaluateRule(rule: LoadedRule, candidate: ReturnType<ThirdPartyMatchingService['normalizeCandidate']>): ThirdPartyMatchResult | null {
    if (rule.conditions.length === 0) return null;

    const matchedConditions = rule.conditions.map(condition => ({
      conditionId: condition.id,
      field: condition.field,
      matcher: condition.matcher,
      matched: this.evaluateCondition(condition, candidate),
    }));

    const isMatch = rule.operator === ThirdPartyMatchingOperator.OR
      ? matchedConditions.some(condition => condition.matched)
      : matchedConditions.every(condition => condition.matched);

    if (!isMatch) {
      return null;
    }

    return {
      thirdPartyId: rule.thirdParty.id,
      thirdPartyName: rule.thirdParty.name,
      ventilated: rule.thirdParty.ventilated,
      matchedRuleId: rule.id,
      matchedRuleLabel: rule.label,
      matchedConditions,
    };
  }

  private evaluateCondition(
    condition: LoadedRule['conditions'][number],
    candidate: ReturnType<ThirdPartyMatchingService['normalizeCandidate']>,
  ) {
    const actualValue = this.getCandidateValue(candidate, condition.field);
    const expectedValue = condition.value ?? '';
    const secondaryValue = condition.value2 ?? '';
    let matched = false;

    switch (condition.matcher) {
      case ThirdPartyMatchingMatcher.CONTAINS:
        matched = String(actualValue).toLowerCase().includes(expectedValue.toLowerCase());
        break;
      case ThirdPartyMatchingMatcher.EQUALS:
        matched = String(actualValue).toLowerCase() === expectedValue.toLowerCase();
        break;
      case ThirdPartyMatchingMatcher.STARTS_WITH:
        matched = String(actualValue).toLowerCase().startsWith(expectedValue.toLowerCase());
        break;
      case ThirdPartyMatchingMatcher.ENDS_WITH:
        matched = String(actualValue).toLowerCase().endsWith(expectedValue.toLowerCase());
        break;
      case ThirdPartyMatchingMatcher.REGEX:
        matched = new RegExp(expectedValue, 'i').test(String(actualValue));
        break;
      case ThirdPartyMatchingMatcher.GT:
        matched = Number(actualValue) > Number(expectedValue);
        break;
      case ThirdPartyMatchingMatcher.GTE:
        matched = Number(actualValue) >= Number(expectedValue);
        break;
      case ThirdPartyMatchingMatcher.LT:
        matched = Number(actualValue) < Number(expectedValue);
        break;
      case ThirdPartyMatchingMatcher.LTE:
        matched = Number(actualValue) <= Number(expectedValue);
        break;
      case ThirdPartyMatchingMatcher.BETWEEN: {
        const numericValue = Number(actualValue);
        matched = numericValue >= Number(expectedValue) && numericValue <= Number(secondaryValue);
        break;
      }
      case ThirdPartyMatchingMatcher.IN:
        matched = expectedValue
          .split(',')
          .map(value => value.trim().toLowerCase())
          .includes(String(actualValue).toLowerCase());
        break;
      default:
        matched = false;
        break;
    }

    return condition.negate ? !matched : matched;
  }

  private getCandidateValue(
    candidate: ReturnType<ThirdPartyMatchingService['normalizeCandidate']>,
    field: string,
  ) {
    switch (field) {
      case ThirdPartyMatchingField.LABEL:
        return candidate.label;
      case ThirdPartyMatchingField.NORMALIZED_LABEL:
        return candidate.normalizedLabel;
      case ThirdPartyMatchingField.AMOUNT:
        return candidate.amount;
      case ThirdPartyMatchingField.DIRECTION:
        return candidate.direction;
      case ThirdPartyMatchingField.ACCOUNT_ID:
        return candidate.accountId ?? '';
      case ThirdPartyMatchingField.STATEMENT_REF:
        return candidate.statementRef ?? '';
      case ThirdPartyMatchingField.COUNTERPARTY_NAME:
        return candidate.counterpartyName ?? '';
      case ThirdPartyMatchingField.MEMO:
        return candidate.memo ?? '';
      case ThirdPartyMatchingField.DAY_OF_MONTH:
        return candidate.dayOfMonth ?? 0;
      default:
        return '';
    }
  }
}
