# Déploiement natif sur skbox-mini (Mac Mini / Ubuntu)

Alternative à la stack Docker ([deploiement_docker.md](deploiement_docker.md)) : déploiement natif via systemd sur la même machine que [skbox](https://github.com/cskarniak/skbox) (Mac Mini 2011 reconverti sous Ubuntu 22.04, alias SSH `skbox-mini`), sans Docker — cohérent avec le choix fait pour skbox sur ce matériel ancien.

## Répartition des ports

skbox occupe déjà 3001 (api) et 3002 (web). MoneyBackWeb utilise :

| Service | Port |
|---|---|
| API NestJS | 4001 |
| Web Next.js | 4002 |
| PostgreSQL | 5432 (natif, dédié à MoneyBackWeb — skbox est en SQLite) |
| Redis | 6379 (partagé avec skbox, DB logique `1` : `redis://localhost:6379/1`) |

## Installation initiale

Une seule fois, depuis ce dépôt :

```bash
scp -r deploy christian@skbox-mini:~/moneyback-deploy-tmp
ssh skbox-mini
bash ~/moneyback-deploy-tmp/install.sh
```

Le script `deploy/install.sh` :
- installe PostgreSQL (paquet apt natif) et crée la base/l'utilisateur `moneyback` ;
- clone le repo dans `~/moneyback` ;
- génère un `.env` de production (`AUTH_SECRET` aléatoire, URLs basées sur l'IP LAN du Mac mini) ;
- build et lance les migrations Prisma ;
- installe les services systemd `moneyback-api` / `moneyback-web` (`deploy/*.service`) ;
- installe un sudoers dédié (`deploy/moneyback-sudoers`) pour permettre au script de déploiement de redémarrer les services sans mot de passe ;
- ouvre les ports 4001/4002 dans UFW, LAN uniquement.

## Redéploiement (après un `git push`)

```bash
ssh skbox-mini 'cd ~/moneyback && bash deploy/deploy.sh'
```

Fait : `git pull` → `pnpm install` → migrations Prisma → build → `systemctl restart moneyback-api moneyback-web`.

## Accès

- Web : `http://192.168.1.11:4002`
- API / Swagger : `http://192.168.1.11:4001/api`, `http://192.168.1.11:4001/api/docs`

## Sauvegardes base

`DATABASE_BACKUPS_DIR` pointe vers `~/moneyback_backups` sur le Mac mini (au lieu de `~/Downloads/moneyback_backups` utilisé par la variante Docker).
