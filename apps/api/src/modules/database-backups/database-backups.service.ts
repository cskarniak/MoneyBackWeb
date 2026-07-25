import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { PrismaService } from '../../prisma/prisma.service';

const execFileAsync = promisify(execFile);

const BACKUPS_DIR_SETTING_KEY = 'database_backups_dir';

type BackupItem = {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
};

@Injectable()
export class DatabaseBackupsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultBackupsDir = process.env.DATABASE_BACKUPS_DIR
    ? resolve(process.env.DATABASE_BACKUPS_DIR)
    : resolve(homedir(), 'Downloads', 'moneyback_backups');
  private readonly postgresContainerName = 'moneyback_postgres';

  private async getSetting(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value?.trim() || null;
  }

  private async getBackupsDir() {
    const configured = await this.getSetting(BACKUPS_DIR_SETTING_KEY);
    return configured ? resolve(configured) : this.defaultBackupsDir;
  }

  async getStorageSettings() {
    const backupsDir = await this.getSetting(BACKUPS_DIR_SETTING_KEY);

    return {
      backupsDir: backupsDir ?? this.defaultBackupsDir,
      backupsDirIsDefault: !backupsDir,
    };
  }

  async updateStorageSettings(input: { backupsDir?: string | null }) {
    if (input.backupsDir !== undefined) {
      const trimmed = input.backupsDir?.trim() ?? '';
      if (!trimmed) {
        await this.prisma.setting.deleteMany({ where: { key: BACKUPS_DIR_SETTING_KEY } });
      } else {
        await this.prisma.setting.upsert({
          where: { key: BACKUPS_DIR_SETTING_KEY },
          create: { key: BACKUPS_DIR_SETTING_KEY, value: trimmed },
          update: { value: trimmed },
        });
      }
    }

    return this.getStorageSettings();
  }

  private async ensureBackupsDir(dir: string) {
    await mkdir(dir, { recursive: true });
  }

  private buildTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
  }

  private resolveBackupPath(dir: string, filename: string) {
    if (!/^[A-Za-z0-9._-]+\.sql$/.test(filename)) {
      throw new NotFoundException('Fichier de sauvegarde invalide.');
    }

    return resolve(dir, filename);
  }

  private async runCommandToFile(command: string, args: string[], outputPath: string) {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const fileStream = createWriteStream(outputPath);
      let stderr = '';

      child.stdout.pipe(fileStream);
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', rejectPromise);
      fileStream.on('error', rejectPromise);

      child.on('close', code => {
        fileStream.end();
        if (code === 0) {
          resolvePromise();
          return;
        }

        rejectPromise(new Error(stderr.trim() || `${command} exited with code ${code}`));
      });
    });
  }

  private async createBackupWithLocalPgDump(databaseUrl: string, outputPath: string) {
    await execFileAsync('pg_dump', [
      '--dbname',
      databaseUrl,
      '--format=plain',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--file',
      outputPath,
    ]);
  }

  private async createBackupWithDockerPgDump(databaseUrl: string, outputPath: string) {
    const parsedUrl = new URL(databaseUrl);
    const username = decodeURIComponent(parsedUrl.username);
    const password = decodeURIComponent(parsedUrl.password);
    const database = parsedUrl.pathname.replace(/^\//, '');

    if (!username || !database) {
      throw new Error('DATABASE_URL invalide pour le fallback Docker.');
    }

    await this.runCommandToFile(
      'docker',
      [
        'exec',
        '-e',
        `PGPASSWORD=${password}`,
        this.postgresContainerName,
        'pg_dump',
        '-U',
        username,
        '-d',
        database,
        '--format=plain',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
      ],
      outputPath,
    );
  }

  async listBackups() {
    const backupsDir = await this.getBackupsDir();
    await this.ensureBackupsDir(backupsDir);

    const entries = await readdir(backupsDir);
    const items = await Promise.all(
      entries
        .filter(entry => entry.endsWith('.sql'))
        .map(async entry => {
          const absolutePath = resolve(backupsDir, entry);
          const metadata = await stat(absolutePath);
          return {
            filename: entry,
            path: absolutePath,
            sizeBytes: metadata.size,
            createdAt: metadata.birthtime.toISOString(),
          } satisfies BackupItem;
        }),
    );

    return {
      directory: backupsDir,
      items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async createBackup() {
    const backupsDir = await this.getBackupsDir();
    await this.ensureBackupsDir(backupsDir);

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new InternalServerErrorException('DATABASE_URL manquante pour lancer la sauvegarde.');
    }

    const filename = `moneyback_backup_${this.buildTimestamp()}.sql`;
    const absolutePath = resolve(backupsDir, filename);

    try {
      await this.createBackupWithLocalPgDump(databaseUrl, absolutePath);
    } catch (error) {
      try {
        await unlink(absolutePath);
      } catch {
        // ignore partial cleanup failure
      }

      const message = error instanceof Error ? error.message : 'unknown error';
      const shouldFallbackToDocker = message.includes('ENOENT') || message.includes('spawn pg_dump');

      if (shouldFallbackToDocker) {
        try {
          await this.createBackupWithDockerPgDump(databaseUrl, absolutePath);
        } catch (dockerError) {
          throw new InternalServerErrorException(
            dockerError instanceof Error
              ? `Sauvegarde impossible: ${dockerError.message}`
              : 'Sauvegarde impossible.',
          );
        }
      } else {
        throw new InternalServerErrorException(
          error instanceof Error
            ? `Sauvegarde impossible: ${error.message}`
            : 'Sauvegarde impossible.',
        );
      }
    }

    let metadata;
    try {
      metadata = await stat(absolutePath);
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Sauvegarde impossible: ${error.message}`
          : 'Sauvegarde impossible.',
      );
    }

    return {
      filename,
      path: absolutePath,
      sizeBytes: metadata.size,
      createdAt: metadata.birthtime.toISOString(),
      message: 'Sauvegarde créée avec succès.',
    };
  }

  async getBackupFile(filename: string) {
    const backupsDir = await this.getBackupsDir();
    await this.ensureBackupsDir(backupsDir);

    const absolutePath = this.resolveBackupPath(backupsDir, filename);

    try {
      const metadata = await stat(absolutePath);
      if (!metadata.isFile()) {
        throw new NotFoundException('Sauvegarde introuvable.');
      }

      return {
        filename,
        path: absolutePath,
        sizeBytes: metadata.size,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Sauvegarde introuvable.');
    }
  }

  private async restoreWithLocalPsql(databaseUrl: string, filePath: string) {
    await execFileAsync('psql', ['--dbname', databaseUrl, '--single-transaction', '--file', filePath], {
      env: { ...process.env, ON_ERROR_STOP: '1' },
    });
  }

  private async restoreWithDockerPsql(databaseUrl: string, filePath: string) {
    const parsedUrl = new URL(databaseUrl);
    const username = decodeURIComponent(parsedUrl.username);
    const password = decodeURIComponent(parsedUrl.password);
    const database = parsedUrl.pathname.replace(/^\//, '');

    if (!username || !database) {
      throw new Error('DATABASE_URL invalide pour le fallback Docker.');
    }

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(
        'docker',
        [
          'exec',
          '-i',
          '-e',
          `PGPASSWORD=${password}`,
          this.postgresContainerName,
          'psql',
          '-U',
          username,
          '-d',
          database,
          '--single-transaction',
        ],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );

      let stderr = '';
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', rejectPromise);

      const fileStream = createReadStream(filePath);
      fileStream.pipe(child.stdin);
      fileStream.on('error', rejectPromise);

      child.on('close', code => {
        if (code === 0) {
          resolvePromise();
          return;
        }
        rejectPromise(new Error(stderr.trim() || `psql exited with code ${code}`));
      });
    });
  }

  async restoreBackup(filename: string) {
    const backup = await this.getBackupFile(filename);

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new InternalServerErrorException('DATABASE_URL manquante pour lancer la restauration.');
    }

    try {
      await this.restoreWithLocalPsql(databaseUrl, backup.path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const shouldFallbackToDocker = message.includes('ENOENT') || message.includes('spawn psql');

      if (shouldFallbackToDocker) {
        try {
          await this.restoreWithDockerPsql(databaseUrl, backup.path);
        } catch (dockerError) {
          throw new InternalServerErrorException(
            dockerError instanceof Error
              ? `Restauration impossible: ${dockerError.message}`
              : 'Restauration impossible.',
          );
        }
      } else {
        throw new InternalServerErrorException(
          error instanceof Error
            ? `Restauration impossible: ${error.message}`
            : 'Restauration impossible.',
        );
      }
    }

    return {
      filename: backup.filename,
      message: 'Base de données restaurée avec succès.',
    };
  }

  async deleteBackup(filename: string) {
    const backup = await this.getBackupFile(filename);

    try {
      await unlink(backup.path);
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Suppression impossible: ${error.message}` : 'Suppression impossible.',
      );
    }

    return {
      filename: backup.filename,
      message: 'Sauvegarde supprimée avec succès.',
    };
  }

  async browseDirectories(requestedPath?: string) {
    const targetPath = resolve(requestedPath?.trim() || homedir());

    let entries;
    try {
      entries = await readdir(targetPath, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new NotFoundException('Dossier introuvable.');
      }
      if (code === 'EACCES') {
        throw new BadRequestException('Accès refusé à ce dossier.');
      }
      if (code === 'ENOTDIR') {
        throw new BadRequestException("Ce chemin n'est pas un dossier.");
      }
      throw new InternalServerErrorException(
        error instanceof Error ? `Lecture du dossier impossible: ${error.message}` : 'Lecture du dossier impossible.',
      );
    }

    const directories = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({ name: entry.name, path: resolve(targetPath, entry.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    const parentPath = dirname(targetPath);

    return {
      path: targetPath,
      parentPath: parentPath === targetPath ? null : parentPath,
      directories,
    };
  }
}
