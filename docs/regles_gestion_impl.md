# Regles de gestion implementees

Ce document sert de memoire de travail pour les regles de gestion validees et effectivement implementees dans MoneyBackWeb.

Objectifs :
- garder la trace des decisions prises en session ;
- distinguer ce qui est implemente de ce qui reste ouvert ;
- faciliter les prochaines reprises sans redecouvrir les arbitrages.

## Mode d'emploi

- Ajouter une regle uniquement lorsqu'elle est validee fonctionnellement.
- Donner un identifiant stable de type `RG-XXX-000`.
- Decrire la regle metier, puis la traduction d'implementation si elle est utile.
- Mettre a jour le statut si la regle evolue.

Statuts possibles :
- `validee` : regle confirmee et cible fonctionnelle claire ;
- `implementee` : regle en place dans le code ;
- `a_confirmer` : piste plausible mais encore a valider metierement.

## Regles validees

### Operations

#### RG-OPE-001 - Selection du compte avant affichage

- Statut : `implementee`
- Regle : la liste et la saisie des operations ne doivent pas afficher les operations tant qu'aucun compte n'a ete selectionne.
- Intention : eviter une saisie ou une lecture hors contexte compte.

#### RG-OPE-002 - Marquage des operations ventilees

- Statut : `implementee`
- Regle : lorsqu'une operation est ventilee, la categorie et l'enveloppe doivent afficher `Ventile`.
- Intention : signaler qu'il faut lire le detail de ventilation plutot qu'une affectation unique.

#### RG-OPE-003 - Pas de saisie directe des statuts techniques

- Statut : `implementee`
- Regle : `Validee`, `Verrouillee` et `Cloturee` ne sont pas exposes dans la fiche de saisie d'une operation.
- Regle : ces champs restent utilises pour le filtrage et la gestion interne des operations existantes.

#### RG-OPE-004 - Coherence de la ventilation d'une operation

- Statut : `implementee`
- Regle : une operation ventilee doit totaliser le montant de l'operation pour etre consideree comme totalement ventilee.
- Regle : si la somme des lignes de ventilation couvre tout le montant, l'operation est de type `V`.
- Regle : si la somme des lignes de ventilation ne couvre qu'une partie du montant, l'operation est de type `P`.

#### RG-OPE-005 - Les lignes de ventilation vides ne sont pas conservees

- Statut : `implementee`
- Regle : lors de l'enregistrement d'une operation, une ligne de ventilation vide n'est pas conservee.
- Definition : une ligne est consideree vide si elle ne porte ni libelle, ni categorie, ni enveloppe, ni montant.

#### RG-OPE-006 - La date d'echeance est une date de rattachement comptable

- Statut : `implementee`
- Regle : le champ historiquement appele "date d'echeance" (`operations.date_echeance`, `operation_splits.date_periode`) represente la periode comptable a laquelle une operation doit etre rattachee, pas une echeance de paiement au sens propre.
- Regle : la date d'operation (`date_operation`) sert uniquement au rapprochement bancaire (date reelle du mouvement sur le compte) ; elle ne doit pas etre utilisee pour du reporting par periode.
- Exemple : une facture d'assurance annuelle reglee le 20/01 pour l'exercice precedent doit avoir sa date d'operation au 20/01, mais sa date de rattachement au 31/12 de l'annee precedente, pour que la depense tombe dans le bon exercice.
- Regle : la date de rattachement effective d'une ligne se calcule par priorite decroissante : `date_periode` de la ligne de ventilation (si ventilee), sinon `date_echeance` de l'operation, sinon `date_operation` (formule `COALESCE(s.date_periode, o.date_echeance, o.date_operation)`, voir `effectiveDueDate` dans `StatisticsService`).
- Intention : les libelles utilisateur emploient "date de rattachement" (et non "date d'echeance") des que l'ecran porte sur ce champ ; les noms techniques (`dueDate`, `effectiveDueDate`, `date_echeance`) ne sont pas renommes pour eviter une migration lourde.

### Statistiques

#### RG-STAT-001 - Ordre d'affichage et solde progressif des statistiques detaillees

- Statut : `implementee`
- Regle : si l'option de tri par date d'echeance est active, la liste doit etre triee par date d'echeance decroissante puis par identifiant d'enregistrement decroissant.
- Regle : si l'option de tri par date d'echeance est inactive, la liste doit etre triee par date d'operation decroissante puis par identifiant d'enregistrement decroissant.
- Regle : le solde progressif doit etre calcule en partant de la fin de la liste vers le debut.
- Intention : obtenir un ordre de lecture descendant par date, tout en conservant un solde cumule coherent calcule depuis le bas de la liste.

#### RG-STAT-002 - Les statistiques par periode se basent sur la date de rattachement

- Statut : `implementee`
- Regle : toute statistique qui agrege des operations par mois ou par periode (tableau de bord mensuel des categories, synthese enveloppes en mode date d'echeance) doit grouper sur la date de rattachement effective (voir RG-OPE-006), pas sur la date d'operation.
- Intention : une operation reglee en debut d'annee mais rattachee a l'exercice precedent doit compter dans le mois/exercice de rattachement, pas dans le mois ou elle a ete passee en banque.
- Regle : le drill-down depuis une case du tableau de bord mensuel vers les statistiques detaillees doit filtrer sur `dueDateFrom`/`dueDateTo` (avec tri par date de rattachement), coherent avec le mode d'agregation.

#### RG-STAT-003 - Moyenne mensuelle du tableau de bord et "mois en cours"

- Statut : `implementee`
- Regle : la moyenne mensuelle affichee sur le tableau de bord mensuel des categories compte les mois sans mouvement comme des mois a 0 (elle ne les exclut pas du denominateur).
- Intention : permettre de provisionner une depense non mensuelle (ex. assurance reglee deux fois par an) en lissant sur l'ensemble des mois de la periode, y compris ceux sans reglement.
- Regle : la moyenne ne compte que les mois inferieurs ou egaux au parametre global "Mois en cours" (`Setting` cle `current_month`, reglable dans la barre de navigation) ; un mois futur pas encore atteint n'est jamais compte, pour ne pas tirer artificiellement la moyenne vers le bas.
- Regle : par defaut, "Mois en cours" vaut le mois calendaire reel, mais reste modifiable manuellement (ex. si la saisie comptable d'un mois n'est pas encore cloturee).

### Tiers

#### RG-TIERS-001 - Fin de l'ancien systeme mots-cles / formule

- Statut : `implementee`
- Regle : l'ancien systeme base sur mots-cles et formule d'affectation n'est plus utilise.
- Intention : sortir d'un matching implicite, fragile et difficile a faire evoluer.

#### RG-TIERS-002 - Le tiers porte ses informations habituelles

- Statut : `implementee`
- Regle : la fiche tiers gere les informations habituelles suivantes : ventilation, categorie habituelle, poste habituel et bloc note.
- Intention : centraliser les preferences de saisie directement sur le tiers.

#### RG-TIERS-003 - Regles de rapprochement explicites

- Statut : `implementee`
- Regle : l'affectation d'un tiers repose sur des regles explicites composees de conditions, et non plus sur une simple detection de mots dans le libelle.
- Intention : permettre un systeme plus robuste et evolutif pour les imports et affectations automatiques.

#### RG-TIERS-004 - Ventilation habituelle du tiers

- Statut : `implementee`
- Regle : un tiers peut embarquer une ventilation habituelle reutilisable.
- Regle : si le tiers est defini comme ventile, ses lignes de ventilation servent de modele pour les traitements automatiques futurs.

#### RG-TIERS-005 - Les lignes de ventilation vides d'un tiers ne sont pas conservees

- Statut : `implementee`
- Regle : lors de l'enregistrement d'un tiers, une ligne de ventilation habituelle vide n'est pas conservee.
- Definition : une ligne est consideree vide si elle ne porte ni libelle, ni categorie, ni enveloppe, ni montant.

#### RG-TIERS-006 - Seuls les tiers actifs et leurs regles actives peuvent matcher

- Statut : `implementee`
- Regle : une affectation automatique de tiers ne peut s'appuyer que sur un tiers actif et sur une regle de matching active.
- Intention : eviter qu'un tiers ou une regle desactivee continue a produire des affectations.

#### RG-TIERS-007 - Priorite et score pilotent le matching

- Statut : `implementee`
- Regle : les regles de matching sont evaluees par priorite croissante, puis par score decroissant.
- Regle : une regle peut stopper l'evaluation des suivantes lorsqu'elle est parametree pour cela.
- Regle : parmi les correspondances trouvees, le meilleur resultat retenu privilegie d'abord le score, puis la regle la plus specifique.

#### RG-TIERS-008 - Seuil d'application automatique

- Statut : `implementee`
- Regle : une correspondance de tiers est consideree comme auto-applicable lorsque son score atteint au moins `80`.
- Regle : en dessous, la correspondance reste exploitable mais avec un niveau de confiance inferieur.

## Points ouverts

#### RG-IMPORT-001 - Affectation automatique a l'import

- Statut : `a_confirmer`
- Sujet : l'import bancaire exploitera les regles de rapprochement des tiers et, pour un tiers ventile, pourra generer automatiquement les lignes de ventilation.
- Note : le principe est valide, mais l'implementation de l'import est volontairement differee.
