import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnomaliesService } from './anomalies.service';

type BaseBody = { accountId?: string; dateFrom?: string };
type FixableBody = BaseBody & { applyFix?: boolean };

@ApiTags('anomalies')
@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly service: AnomaliesService) {}

  @Post('missing-due-date')
  @ApiOperation({ summary: 'Détecte les opérations sans date d\'échéance et propose de reporter la date d\'opération' })
  checkMissingDueDate(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: FixableBody,
  ) {
    return this.service.checkMissingDueDate({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
      applyFix: body.applyFix ?? false,
    });
  }

  @Post('split-mismatch')
  @ApiOperation({ summary: 'Détecte les écarts entre le montant de l\'opération ventilée et la somme de ses ventilations' })
  checkSplitMismatch(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: BaseBody,
  ) {
    return this.service.checkSplitMismatch({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
    });
  }

  @Post('missing-splits')
  @ApiOperation({ summary: 'Détecte les opérations ventilées sans aucune ligne de ventilation' })
  checkMissingSplits(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: BaseBody,
  ) {
    return this.service.checkMissingSplits({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
    });
  }

  @Post('unexpected-splits')
  @ApiOperation({ summary: 'Détecte les opérations non ventilées qui possèdent des lignes de ventilation' })
  checkUnexpectedSplits(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: BaseBody,
  ) {
    return this.service.checkUnexpectedSplits({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
    });
  }

  @Post('duplicate-operations')
  @ApiOperation({ summary: 'Détecte les opérations en double (même date, libellé et montant)' })
  checkDuplicateOperations(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: FixableBody,
  ) {
    return this.service.checkDuplicateOperations({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
      applyFix: body.applyFix ?? false,
    });
  }

  @Post('orphan-references')
  @ApiOperation({ summary: 'Détecte les références orphelines (enveloppe, tiers, catégorie) dans les opérations et ventilations' })
  checkOrphanReferences(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: BaseBody,
  ) {
    return this.service.checkOrphanReferences({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
    });
  }

  @Post('balance-field')
  @ApiOperation({ summary: 'Vérifie que le champ solde est cohérent avec recette - dépense dans les opérations et ventilations' })
  checkBalanceField(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: FixableBody,
  ) {
    return this.service.checkBalanceField({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
      applyFix: body.applyFix ?? false,
    });
  }

  @Post('zero-amount')
  @ApiOperation({ summary: 'Détecte les opérations avec dépense et recette à zéro' })
  checkZeroAmount(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: BaseBody,
  ) {
    return this.service.checkZeroAmount({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
    });
  }

  @Post('partial-split-unmarked')
  @ApiOperation({ summary: 'Détecte les ventilations partielles non marquées P' })
  checkPartialSplitUnmarked(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) body: BaseBody,
  ) {
    return this.service.checkPartialSplitUnmarked({
      accountId: body.accountId,
      dateFrom: body.dateFrom,
    });
  }
}
