import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const execFileAsync = promisify(execFile);

type BackupItem = {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
};

@Injectable()
export class DatabaseBackupsService {
  private readonly backupsDir = process.env.DATABASE_BACKUPS_DIR
    ? resolve(process.env.DATABASE_BACKUPS_DIR)
    : resolve(homedir(), 'Downloads', 'moneyback_backups');
  private readonly postgresContainerName = 'moneyback_postgres';

  private async ensureBackupsDir() {
    await mkdir(this.backupsDir, { recursive: true });
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

  private resolveBackupPath(filename: string) {
    if (!/^[A-Za-z0-9._-]+\.sql$/.test(filename)) {
      throw new NotFoundException('Fichier de sauvegarde invalide.');
    }

    return resolve(this.backupsDir, filename);
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
    await this.ensureBackupsDir();

    const entries = await readdir(this.backupsDir);
    const items = await Promise.all(
      entries
        .filter(entry => entry.endsWith('.sql'))
        .map(async entry => {
          const absolutePath = resolve(this.backupsDir, entry);
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
      directory: this.backupsDir,
      items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async createBackup() {
    await this.ensureBackupsDir();

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new InternalServerErrorException('DATABASE_URL manquante pour lancer la sauvegarde.');
    }

    const filename = `moneyback_backup_${this.buildTimestamp()}.sql`;
    const absolutePath = resolve(this.backupsDir, filename);

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
    await this.ensureBackupsDir();

    const absolutePath = this.resolveBackupPath(filename);

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
}
