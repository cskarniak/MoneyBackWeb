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

## Points ouverts

#### RG-IMPORT-001 - Affectation automatique a l'import

- Statut : `a_confirmer`
- Sujet : l'import bancaire exploitera les regles de rapprochement des tiers et, pour un tiers ventile, pourra generer automatiquement les lignes de ventilation.
- Note : le principe est valide, mais l'implementation de l'import est volontairement differee.
