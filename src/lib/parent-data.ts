import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

type ParentContext = {
  parent: {
    id: string;
    user: { fullName: string; role: string };
  };
  children: Array<{
    id: string;
    admissionNo: string;
    user: { id: string; fullName: string; email: string };
    class: { id: string; name: string; section: string } | null;
  }>;
  childIds: string[];
};

const getCachedParentContext = unstable_cache(
  async (userId: string) => {
    const parent = await prisma.parent.findUnique({
      where: { userId },
      select: {
        id: true,
        user: { select: { fullName: true, role: true } },
        children: {
          select: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                user: { select: { id: true, fullName: true, email: true } },
                class: { select: { id: true, name: true, section: true } }
              }
            }
          }
        }
      }
    });

    if (!parent) {
      return null;
    }

    const children = parent.children.map((link) => link.student);
    const childIds = children.map((child) => child.id);

    return {
      parent: {
        id: parent.id,
        user: parent.user
      },
      children,
      childIds
    } satisfies ParentContext;
  },
  ['parent-context'],
  { revalidate: 60 }
);

export async function getParentContext(userId: string) {
  return getCachedParentContext(userId);
}
