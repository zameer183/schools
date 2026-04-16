import { prisma } from '@/lib/prisma';

export async function getParentContext(userId: string) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: {
      user: { select: { fullName: true, role: true } },
      children: {
        include: {
          student: {
            include: {
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
    parent,
    children,
    childIds
  };
}
