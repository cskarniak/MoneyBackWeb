# Documentation fonctionnelle MONEYBACK

Source principale: `Dossier_MONEYBACK_layout.txt`, genere le `10/06/2026` a partir de la documentation WinDev du projet `MONEYBACK`.

Source secondaire de controle: `Dossier_MONEYBACK.txt`.

## 1. Objet du document

Ce document reformule la documentation technique WinDev en une vue fonctionnelle exploitable pour:

- comprendre le perimetre actuel de l'application;
- preparer une reprise de maintenance;
- cadrer une future application web reprenant les fonctionnalites utiles;
- identifier les objets de donnees, les ecrans et les processus metier.

Le document ne remplace pas la documentation WinDev exportee. Il en constitue une synthese orientee produit et refonte.

Le fichier `Dossier_MONEYBACK_layout.txt` est retenu comme source de reference car il preserve mieux la structure des sections, les noms de champs et les parametres des requetes. Le fichier texte brut est utile en appoint, mais perd davantage d'information de mise en page.

## 2. Vue d'ensemble

`MONEYBACK` est une application de gestion financiere personnelle et patrimoniale. Elle couvre a la fois:

- la gestion des comptes et ecritures bancaires;
- la ventilation analytique des operations;
- la gestion de budgets, postes, categories, tiers et regroupements;
- les abonnements et operations recurrentes;
- les imports externes;
- le rapprochement bancaire;
- la gestion d'un portefeuille titres;
- les statistiques et syntheses.

Informations de projet relevees dans la documentation:

- Repertoire projet: `C:\Mes Projets\MONEYBACK`
- Premiere fenetre: `FEN_MENU`
- Analyse associee: `MONEYBACK.ana\MONEYBACK.wda`
- Modele UML associe: `Modele MONEYBACK.uml`
- Gabarit WinDev: `210 GenFlat`

## 3. Domaines fonctionnels

### 3.1 Comptes bancaires

Le domaine `COMPTE` porte les informations suivantes:

- identifiant, nom, agence, guichet, numero de compte, RIB;
- date de synchro;
- date et solde de cloture;
- donnees de rapprochement: date, reference, solde de depart, solde final, indicateur "rapprochement en cours";
- reference du dernier releve;
- commentaire;
- URL du site bancaire et identifiant de connexion;
- solde calcule;
- compte gere pour autrui;
- indicateur compte ferme.

Fonctionnalites associees:

- creation et modification d'un compte;
- visualisation detaillee d'un compte;
- consultation des ecritures d'un compte;
- calcul du solde;
- consultation du solde bancaire a une date donnee;
- gestion du rapprochement.

Ecrans principaux:

- `FEN_Fiche_COMPTE`
- `FEN_Table_COMPTE`
- `FO_Fiche_COMPTE`
- `FO_Table_COMPTE`
- `FEN_SOLDE_BANCAIRE_PAR_DATE`
- `FEN_Rapprochement_Bancaire`

### 3.2 Ecritures et operations

Le domaine `OPERATION` correspond au coeur de l'application. Une operation semble porter notamment:

- identifiant;
- compte bancaire;
- date d'operation;
- libelle;
- depense, recette, solde;
- numero de piece;
- date d'integration;
- type d'operation;
- mode de saisie;
- budget, categorie, tiers, moyen de paiement, type de mouvement;
- abonnement d'origine;
- code de rapprochement;
- lettrage;
- cloture, verrouillage;
- operation d'origine en cas de lien ou duplication;
- nouveaux montants de budget / indicateurs de regularisation.

La requete `REQ_OPERATION` confirme que la liste standard des ecritures est au minimum filtree par:

- `P_COMPTE`;
- le statut de verrouillage via `Masquage`;
- le statut de rapprochement via `Rapprochees`.

Fonctionnalites associees:

- creation, modification, suppression;
- duplication d'operation;
- operation de virement;
- recherche par libelle;
- filtrage par compte, releve, periode et statuts;
- masquage des ecritures verrouillees;
- masquage des ecritures rapprochees;
- visualisation des ecritures liees;
- acces direct au tiers, a la categorie et au poste;
- saisie multi-compte.

Ecrans principaux:

- `FEN_Table_OPERATION`
- `FEN_FICHE_TRANSACTION`
- `FEN_Importation_operation`
- `FEN_IMPORT_OPERATION_EXCEL`
- `FEN_Saisie_MutiCompte`

### 3.3 Ventilation analytique

Le domaine `OPERATIONVENTILEE` permet de decomposer une operation principale en sous-lignes analytiques.

Champs identifies:

- identifiant;
- libelle;
- depense;
- recette;
- solde;
- budget;
- categorie;
- operation d'origine;
- periode;
- lettrage.

Fonctionnalites associees:

- ventilation d'une ecriture;
- consultation du detail de ventilation;
- affectation budget/categorie au niveau de la sous-ligne;
- controle de coherence entre montant principal et montants ventiles;
- vues complementaires par tiers et type.

Ecrans principaux:

- `FEN_Table_OPERATIONVENTILEE`
- `FEN_Visu_OPERATION_VENTILEE`
- `FEN_Table_OPERATION_VENTILEE_TIERS`
- `FEN_Table_OPERATION_VENTILEE_TYPE`

### 3.4 Budgets, postes et regroupements

Dans la documentation exportee, le fichier `BUDGET` joue fonctionnellement le role de poste budgetaire. Plusieurs ecrans et procedures utilisent explicitement le vocabulaire "poste" pour manipuler les enregistrements `BUDGET`.

Champs budget/poste identifies:

- `BUD_ID`
- `BUD_LIBELLE`
- `BUD_ANCIEN_CODE`
- `BUD_COMMENTAIRE`
- `CAR_ID` vers regroupement;
- `BUD_SOLDE`
- `BUD_SOLDEFACTURE`
- `BUD_SYNTHESE`
- `BUD_TB`
- `TYM_ID` vers type de mouvement
- `BUD_DESACTIVE`

Le fichier `REGROUPEMENT` porte:

- `CAR_ID`
- `CAR_LIBELLE`
- `CAR_DEPENSE`
- `CAR_RECETTE`
- `CAR_SOLDE`
- `CAR_TYPE_TB`
- types de categorie et de poste.

Fonctionnalites associees:

- gestion des postes/budgets;
- rattachement a un regroupement;
- indicateurs de synthese et tableau de bord;
- desactivation;
- recalcul des soldes;
- reaffection des postes;
- vues de synthese par poste et regroupement.

Indications metier relevees:

- `FEN_Fiche_POSTE` ouvre `FEN_STATISTIQUES` sur un poste donne;
- le solde calcule d'un poste est derive par procedure (`CalculSoldeUnPoste` / calculs de soldes globaux);
- `CalculSoldeParPoste()` remet a zero tous les soldes `BUDGET`, rejoue `REQ_STATISTIQUE`, puis recalcule les montants a partir des operations et des ventilations;
- une operation peut imposer un nouveau montant de budget via `OPE_NouveauMontantBudget`.

Ecrans principaux:

- `FEN_Fiche_POSTE`
- `FEN_Gestion_des_budgets`
- `FEN_Table_BUDGET`
- `FEN_Réaffection_des_postes`
- `FEN_Table_POSTE_VISU_PAR_REGROUPEMENT`
- `FEN_SYNTHESE_POSTES`
- `FEN_Synthèse_par_Poste`
- `FEN_Synthèse_par_regroupement`
- `FEN_FEN_DETAIL_POSTE`
- `FO_Détail_Poste`
- `FEN_Fiche_REGROUPEMENT`
- `FEN_Table_REGROUPEMENT`

### 3.5 Categories et tiers

Le domaine `CATEGORIE` contient:

- identifiant;
- libelle;
- ancien code;
- commentaire;
- sens depense/recette;
- regroupement de categorie;
- desactivation.

Le domaine `TIERS` represente les contreparties ou beneficiaires:

- nom;
- mots-cles;
- rattachements fonctionnels;
- vraisemblablement type de mouvement associe selon certaines liaisons.

Fonctionnalites associees:

- creation et gestion des categories;
- creation et gestion des tiers;
- affectation automatique des tiers a partir du libelle;
- visualisation contextuelle depuis les ecritures;
- navigation precedent/suivant dans les filtres de statistiques.

Ecrans principaux:

- `FEN_Fiche_CATEGORIE`
- `FEN_Table_CATEGORIE`
- `FEN_Visu_CATEGORIE`
- `FEN_Fiche_TIERS`
- `FEN_Table_TIERS`

### 3.6 Abonnements et recurrent

Le fichier `ABONNEMENT` contient notamment:

- libelle de l'abonnement;
- compte, tiers, categorie, budget;
- periodicite;
- jour;
- type d'abonnement;
- date premiere echeance;
- date prochaine echeance;
- date fin;
- date derniere generation;
- date derniere echeance generee;
- operation generee;
- depense / recette;
- libelle d'ecriture;
- type de mouvement;
- indicateur actif;
- indicateur ventile.

Fonctionnalites associees:

- creation d'abonnement recurrent;
- generation d'ecritures a date de reference;
- operations reelles ou previsionnelles;
- abonnement simple ou ventile;
- consultation de l'operation generee;
- planning d'abonnement.

Ecrans principaux:

- `FEN_Fiche_Abonnement`
- `FEN_Table_ABONNEMENT`
- `FEN_Génération_Abonnement`
- `FEN_Abonnement_Planning`
- `FEN_FICHEPARCOURS_ABONNEMENT`

Requete associee:

- `REQ_ABONNEMENT_GENERATION`

### 3.7 Import et integration

Le projet contient plusieurs voies d'import:

- import Excel;
- import de fichiers bancaires;
- import d'operations;
- import de transactions DEGIRO;
- import des cours ABC Bourse;
- import des libelles ABC Bourse;
- migration Money;
- masques d'importation Excel parametrables.

Objets de donnees identifies:

- `IMPORT`
- `MASQUEIMORTATIONEXCEL`

Fonctionnalites associees:

- chargement d'un fichier;
- parcours et selection de lignes a integrer;
- reference d'importation;
- association a un compte;
- association a un masque;
- import dedie au portefeuille boursier;
- gestion de la date de synchronisation et de la reference d'integration.

Ecrans principaux:

- `FEN_Import_Excel`
- `FEN_LISTE_Masque_Importation_Excel`
- `FEN_FICHE_Masque_importation_Excel`
- `FEN_Import_Fichiers_Bancaires`
- `FEN_Importation_opération`
- `FEN_IMPORT_OPERATION_EXCEL`
- `FEN_Import_Fichiers_transactions_DEGIRO`
- `FEN_Import_Fichiers_cours_ABC_BOURSE`
- `FEN_Import_Fichiers_libellés_ABC_BOURSE`

### 3.8 Portefeuille titres

Le domaine `PORTEFEUILLE` est dedie aux titres financiers.

Champs identifies:

- identifiant;
- reference transaction operateur;
- produit;
- code ISIN;
- code;
- date de mouvement;
- quantite;
- cours;
- frais;
- TTF;
- montant brut;
- montant net;
- devises associees;
- type de mouvement;
- reference integration;
- identifiant transaction achat;
- statut;
- montant dividende.

Tables associees:

- `PORTEFEUILLE`
- `PORTEFEUILLE_POINT`
- `PORTEFEUILLE_COURS`
- `PORTEFEUILLE_LIBELLE`

Fonctionnalites associees:

- import de transactions titre;
- ajout manuel de transaction de portefeuille;
- historique des cours d'une valeur;
- synthese des achats et ventes;
- pointage achat/vente;
- calcul des quantites pointees;
- gestion des dividendes;
- suivi des marges et du net de vente.

Ecrans principaux:

- `FEN_PORTEUILLE_AJOUT_TRANSACTION`
- `FEN_POINTAGE_TRANSACTION`
- `FEN_Historique_des_cours_d_une_valeur`
- `FEN_Synthèse_des_transactions`
- `FEN_Synthèse_des_transactions_V2`

Requetes associees:

- `REQ_PORTEFEUILLE_ACHATS`
- `REQ_PORTEFEUILLE_VENTES`
- `REQ_PORTEFEUILLE_PRODUIT`
- `REQ_PointageAchat`
- `REQ_PointageVente`
- `REQ_SynthèseTransaction`

### 3.9 Statistiques et tableaux de bord

Le projet comporte un ensemble important de vues de pilotage:

- statistiques detaillees;
- statistiques recapitulatives;
- synthese par compte;
- synthese par periode;
- synthese par poste;
- synthese par regroupement;
- tableau de bord.

La fenetre `FEN_STATISTIQUES` permet notamment de filtrer par:

- compte;
- categorie;
- tiers;
- poste;
- budget;
- numero de piece;
- date d'operation;
- date d'echeance;
- regroupement categorie;
- regroupement poste.

Des indicateurs de tri et options supplementaires sont visibles:

- tri par date d'echeance;
- calcul du solde progressif;
- acces direct a l'operation;
- suppression totale;
- prise en compte de comptes geres pour autrui et comptes fermes dans certaines requetes.

Ecrans principaux:

- `FEN_STATISTIQUES`
- `FEN_Tableau_de_bord`
- `FEN_SYNTHESE_PAR_COMPTE`
- `FEN_SYNTHESE_PAR_PERIODE`
- `FEN_Synthèse_par_Poste`
- `FEN_Synthèse_par_regroupement`
- `FEN_SYNTHESE_POSTES`
- `FEN_DETAIL_ANALYSE`

Requetes associees:

- `REQ_STATISTIQUE`
- `REQ_STATISTIQUE_ORI`
- `REQ_BUDGET_ANALYSE`
- `ZZZ_REQ_STATISTIQUE_Budget`

### 3.10 Administration, parametres et maintenance

Le projet contient plusieurs fonctions d'administration:

- changement des parametres de connexion base;
- gestion des parametres generaux;
- sauvegarde;
- reindexation des fichiers;
- suppression de releve;
- report des dates de rattachement;
- recalcul de soldes;
- reaffectation de compte;
- reaffectation de budgets;
- outils de controle.

Ecrans principaux:

- `FEN_ChangementParamètresConnexionBase`
- `FEN_FICHE_PARAMETRE`
- `FEN_Sauvegarde`
- `FEN_Réindexation_des_Fichiers`
- `FEN_Suppression_relevé`
- `FEN_Report_des_dates_de_rattachement_des_opérations`
- `FEN_Réaffectation_de_compte`
- `FEN_Réaffection_des_Budgets`
- `FEN_Outils`
- `FEN_Cryptage_Mot_de_passe`

## 4. Modele de donnees fonctionnel

### 4.1 Entites principales

Entites metier identifiees dans l'analyse:

- `COMPTE`
- `OPERATION`
- `OPERATIONVENTILEE`
- `BUDGET`
- `CATEGORIE`
- `REGROUPEMENT`
- `TIERS`
- `ABONNEMENT`
- `ABONNEMENT_PLANNING`
- `MOYEN_PAIEMENT`
- `TYPE_MOUVEMENT`
- `PARAMETRE`
- `IMPORT`
- `MASQUEIMORTATIONEXCEL`
- `PORTEFEUILLE`
- `PORTEFEUILLE_POINT`
- `PORTEFEUILLE_COURS`
- `PORTEFEUILLE_LIBELLE`
- `ANALYSE_1`
- `ANALYSE_1_DETAIL`

### 4.2 Relations majeures

Relations visibles dans l'analyse:

- `ABONNEMENT` vers `BUDGET`
- `ABONNEMENT` vers `CATEGORIE`
- `ABONNEMENT` vers `COMPTE`
- `ABONNEMENT` vers `TIERS`
- `ABONNEMENT` vers `TYPE_MOUVEMENT`
- `BUDGET` vers `REGROUPEMENT`
- `CATEGORIE` vers `REGROUPEMENT`
- `OPERATION` vers `COMPTE`
- `OPERATION` vers `BUDGET`
- `OPERATION` vers `CATEGORIE`
- `OPERATION` vers `TIERS`
- `OPERATION` vers `MOYEN_PAIEMENT`
- `OPERATION` vers `TYPE_MOUVEMENT`
- `OPERATIONVENTILEE` vers `OPERATION`
- `OPERATIONVENTILEE` vers `BUDGET`
- `OPERATIONVENTILEE` vers `CATEGORIE`
- `PORTEFEUILLE_POINT` relie achats et ventes du portefeuille

### 4.3 Lecture fonctionnelle

Le modele montre une separation nette entre:

- la comptabilite bancaire du quotidien;
- l'analyse budgetaire et categorielle;
- la recurrence via abonnements;
- le portefeuille titres.

Pour une refonte web, cette separation peut devenir des modules.

## 5. Ecrans structurants

Les ecrans les plus structurants pour une refonte paraissent etre:

1. `FEN_MENU`
2. `FEN_Table_OPERATION`
3. `FEN_Fiche_COMPTE`
4. `FEN_Fiche_Abonnement`
5. `FEN_STATISTIQUES`
6. `FEN_Synthèse_des_transactions_V2`
7. `FEN_Import_Excel`
8. `FEN_Import_Fichiers_transactions_DEGIRO`
9. `FEN_Rapprochement_Bancaire`
10. `FEN_Outils`

Ces ecrans semblent concentrer l'essentiel de la valeur metier et des cas complexes.

Indices supplementaires tires du layout WinDev:

- `FEN_Table_OPERATION` est clairement l'ecran pivot des ecritures et ouvre au moins les ecrans de ventilation et de statistiques;
- `FEN_STATISTIQUES` est re-utilisee depuis les fiches compte et poste, ce qui en fait un ecran transversal de pilotage;
- `FEN_Import_Excel`, `FEN_Import_Fichiers_Bancaires` et `FEN_Importation_operation` font partie des fenetres les plus chargees en traitements;
- `FEN_PORTEUILLE_AJOUT_TRANSACTION` et `FEN_POINTAGE_TRANSACTION` concentrent la logique portefeuille.

## 6. Requetes et editions

Requetes majeures identifiees:

- `REQ_OPERATION`
- `REQ_OPERATION_VENTILEE`
- `REQ_ABONNEMENT_GENERATION`
- `REQ_STATISTIQUE`
- `REQ_STATISTIQUE_ORI`
- `REQ_BUDGET_ANALYSE`
- `REQ_PORTEFEUILLE_ACHATS`
- `REQ_PORTEFEUILLE_VENTES`
- `REQ_PORTEFEUILLE_PRODUIT`
- `REQ_PointageAchat`
- `REQ_PointageVente`
- `REQ_SynthèseTransaction`

Etats identifies:

- `ETAT_COMPTE`
- `ETAT_REGROUPEMENT`

Lecture fonctionnelle minimale des requetes:

- `REQ_OPERATION`: liste les operations d'un compte avec jointure sur `TIERS`, `CATEGORIE` et `BUDGET`; filtres sur compte, verrouillage et rapprochement; tri par `OPE_DATE`, puis `OPE_ID`.
- `REQ_OPERATION_VENTILEE`: retourne les sous-lignes d'une operation via `OPV_OPERATION_ORIGINE = P_OPERATION`.
- `REQ_ABONNEMENT_GENERATION`: selectionne les abonnements dont la prochaine echeance est inferieure ou egale a `DateReference`, avec filtrage sur l'etat actif.
- `REQ_STATISTIQUE_ORI`: requete analytique transverse reliant `OPERATION`, `COMPTE` et `OPERATIONVENTILEE`; filtres par compte, categorie, budget, tiers, plage de dates, numero de piece, echeance, compte gere pour autrui et compte ferme.
- `REQ_STATISTIQUE`: sert de base a plusieurs recalculs de soldes budgetaires/postes dans les procedures globales.

## 6.1 Regles metier identifiees

Le layout preserve plusieurs regles metier importantes qui ne ressortaient pas bien du simple export texte:

- `CalculSolde_Compte(P_Compte)`: le solde d'un compte est calcule a partir du solde de cloture du compte, auquel on ajoute les recettes et on retranche les depenses des operations non cloturees.
- `CalculSoldeCompteBancaireADate(P_Compte, P_Date)`: meme logique, mais restreinte aux operations dont `OPE_DATE <= P_Date`.
- `CalculSoldeParPoste()`: l'application recalcule les soldes des postes en rejouant les operations; pour les operations ventilees (`OPE_Type = "V"` ou `"P"`), elle prend les montants et codes budget/categorie des lignes `OPERATIONVENTILEE`.
- `AffectationAutomatiqueTiers(ChaineAAnalyser)`: pre-affectation d'un tiers par analyse du libelle avec mots-cles `TIE_MOTCLE1/2/3`, selon des combinaisons de type `ET` / `OU`.
- `AffectationAutomatiqueParFormuleWL()`: variante avancee qui evalue une formule WinDev stockee sur le tiers (`TIE_FORMULEAFFECTATION`) pour determiner l'affectation automatique.

## 7. Hypothese d'architecture cible web

Une decomposition web raisonnable serait:

- module `Comptes`
- module `Ecritures`
- module `Ventilation`
- module `Budgets et postes`
- module `Categories et tiers`
- module `Abonnements`
- module `Imports`
- module `Portefeuille`
- module `Statistiques`
- module `Administration`

API metier a prevoir en priorite:

- CRUD comptes;
- CRUD operations;
- ventilation d'operation;
- calculs de soldes;
- generation d'abonnements;
- imports de fichiers;
- pointage achats/ventes;
- rapports et filtres statistiques.

## 8. Priorisation pour une reprise web

### 8.1 MVP recommande

- authentification et parametres de base;
- comptes;
- operations;
- budgets/categories/tiers;
- ventilation;
- rapprochement simple;
- statistiques principales;
- import Excel ou bancaire prioritaire selon usage reel.

### 8.2 V2 recommande

- abonnements avances;
- portefeuille titres complet;
- DEGIRO et ABC Bourse;
- outils de maintenance avances;
- editions PDF et etats historiques.

## 9. Points d'attention

- Le document source est un export WinDev, avec quelques problemes d'encodage texte.
- `Dossier_MONEYBACK_layout.txt` est nettement plus fiable que `Dossier_MONEYBACK.txt` pour la reprise fonctionnelle, notamment sur les requetes et les procedures globales.
- Certains noms montrent un heritage historique: `BUDGET` sert de poste budgetaire dans une grande partie de l'application.
- Les fonctionnalites portefeuille et budgetaire cohabitent dans la meme application, ce qui peut complexifier la refonte si on veut un produit plus simple.
- Les ecrans `Outils`, `Statistiques`, `Table_OPERATION`, `Import_Excel` et `Importation_operation` meritent une relecture plus detaillee avant toute estimation de refonte.
- La logique metier ne vit pas uniquement dans les fenetres: la collection `COL_ProceduresGlobales` porte des calculs critiques qu'il faudra reprendre explicitement dans le futur backend web.

## 10. Suite recommandee

Etapes utiles pour aller plus loin:

1. etablir un dictionnaire de donnees nettoye fichier par fichier, en partant du layout;
2. produire une fiche detaillee pour chaque ecran structurant, en commencant par `FEN_Table_OPERATION`, `FEN_STATISTIQUES`, `FEN_Import_Excel` et `FEN_PORTEUILLE_AJOUT_TRANSACTION`;
3. cartographier toutes les procedures globales et les rattacher a un cas d'usage fonctionnel;
4. distinguer les fonctionnalites encore utilisees de celles devenues historiques;
5. transformer cette documentation en backlog de refonte web.

---

Document redige a partir de `Dossier_MONEYBACK_layout.txt`, complete par `Dossier_MONEYBACK.txt`, et reformule pour la reprise fonctionnelle du projet.
