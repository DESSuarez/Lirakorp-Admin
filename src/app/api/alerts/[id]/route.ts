import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, title, message, dueDate } = body;

    // Only admins can dismiss alerts
    if (status === 'dismissed') {
      const userRole = (session.user as any)?.role;
      if (userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Solo los administradores pueden descartar alertas' },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status === 'dismissed') {
      updateData.dismissedAt = new Date();
      updateData.dismissedBy = (session.user as any)?.id || session.user?.email;
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
      include: {
        contract: { include: { property: true } },
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error al actualizar alerta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar alerta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  // Only admins can delete alerts
  const userRole = (session.user as any)?.role;
  if (userRole !== 'admin') {
    return NextResponse.json(
      { error: 'Solo los administradores pueden eliminar alertas' },
      { status: 403 }
    );
  }

  try {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Alerta no encontrada' },
        { status: 404 }
      );
    }

    await prisma.alert.delete({ where: { id } });

    return NextResponse.json({ message: 'Alerta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar alerta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar alerta' },
      { status: 500 }
    );
  }
}
