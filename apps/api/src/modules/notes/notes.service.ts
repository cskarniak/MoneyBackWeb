import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateNoteDto, NoteFiltersDto, UpdateNoteDto } from '@moneyback/shared';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: NoteFiltersDto) {
    const { search, highlightId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { content: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.note.count({ where }),
    ]);

    let highlightIndex: number | null = null;
    if (highlightId) {
      const orderedIds = await this.prisma.note.findMany({ where, orderBy, select: { id: true } });
      const index = orderedIds.findIndex(note => note.id === highlightId);
      highlightIndex = index >= 0 ? index : null;
    }

    return { items, total, page, limit, highlightIndex };
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException(`Note ${id} introuvable`);
    return note;
  }

  create(dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        title: dto.title,
        content: dto.content ?? '',
      },
    });
  }

  async update(id: string, dto: UpdateNoteDto) {
    await this.findOne(id);
    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });
  }

  async remove(id: string) {
    const note = await this.findOne(id);
    await this.prisma.note.delete({ where: { id } });
    return note;
  }
}
