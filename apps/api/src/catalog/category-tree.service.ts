import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CategoryNode = {
  name: string;
  path: string;
  depth: number;
  children: CategoryNode[];
};

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CategoryTreeService {
  private cache: { expiresAt: number; tree: CategoryNode[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  invalidateCache() {
    this.cache = null;
  }

  async getTree(): Promise<CategoryNode[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.tree;
    }

    const categories = await this.prisma.category.findMany({
      orderBy: [{ depth: 'asc' }, { name: 'asc' }]
    });

    const nodeMap = new Map<string, CategoryNode>();
    categories.forEach((category) => {
      nodeMap.set(category.path, {
        name: category.name,
        path: category.path,
        depth: category.depth,
        children: []
      });
    });

    const roots: CategoryNode[] = [];
    categories.forEach((category) => {
      const node = nodeMap.get(category.path);
      if (!node) return;
      if (!category.parentPath) {
        roots.push(node);
        return;
      }
      const parent = nodeMap.get(category.parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortChildren = (node: CategoryNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    this.cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      tree: roots
    };

    return roots;
  }
}
