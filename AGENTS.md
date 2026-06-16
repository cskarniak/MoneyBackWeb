# AGENTS.md

MoneyBackWeb est un monorepo `pnpm` avec :
- `apps/web` : Next.js
- `apps/api` : NestJS
- `packages/db` : Prisma
- `packages/shared` : types, enums et schemas partages

Priorites pour l'agent :
- Rester coherent avec l'existant ; faire des changements cibles, pas des refontes gratuites.
- Lire d'abord les fichiers directement lies a la tache avant de proposer une solution large.
- Reutiliser les patterns, hooks, services et conventions deja presents.
- Privilegier une architecture clean code : responsabilites claires, faible couplage, duplication limitee, noms explicites, et logique metier isolee des details techniques.
- En cas de doute metier ou architectural, verifier `CLAUDE.md` et `docs/` avant de modifier.

Regles techniques :
- Source de verite de la base : `packages/db/prisma/schema.prisma`.
- Types et schemas partages : `packages/shared/src`.
- Logique metier financiere dans les services backend, pas dans les controllers ni dans le frontend.
- Pour les operations ventilees, utiliser `operationType` pour distinguer :
  `V` si la ventilation couvre la totalite de l'operation, `P` si la ventilation est partielle.
- Cote web, reutiliser les helpers/hooks existants avant d'introduire une nouvelle couche d'acces aux donnees.
- Garder les DTO, enums et schemas synchronises entre `apps/api` et `packages/shared` quand une evolution les concerne.
- Ne pas introduire une nouvelle dependance sans besoin clair.
- Preferer de petites unites faciles a tester et a lire plutot que des composants ou services trop larges.
- Separer autant que possible logique metier, orchestration, acces aux donnees et presentation.

Approche par zone :
- `apps/web` : privilegier les composants, hooks et helpers existants ; eviter la logique metier lourde dans l'UI.
- `apps/api` : mettre la logique dans les modules/services ; garder les controllers fins.
- `packages/db` : toute evolution de modele doit rester coherente avec Prisma et les migrations.
- `packages/shared` : centraliser les contrats communs plutot que dupliquer.

Verification :
- Avant de conclure, lancer la verification la plus petite pertinente : test cible, `pnpm typecheck`, ou build de l'app modifiee.
- Si une verification n'a pas pu etre lancee, le signaler explicitement.
- Apres modification du schema Prisma, executer `pnpm db:generate` puis la migration adaptee.

Commandes utiles :
- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:api`
- `pnpm typecheck`
- `pnpm build`

Quand consulter d'autres docs :
- `CLAUDE.md` : architecture, conventions detaillees, commandes projet.
- `docs/` : regles metier, contexte fonctionnel, heritage de l'ancien logiciel.
