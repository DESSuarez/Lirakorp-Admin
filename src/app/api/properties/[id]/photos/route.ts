import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    const photos = await prisma.photo.findMany({
      where: { propertyId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Error al obtener las fotos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron archivos' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Tipo de archivo no permitido: ${file.type}. Solo se aceptan imagenes (JPEG, PNG, WebP, GIF, AVIF).`,
          },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: `El archivo ${file.name} excede el tamano maximo de 10MB.`,
          },
          { status: 400 }
        );
      }
    }

    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'properties',
      id
    );
    await mkdir(uploadDir, { recursive: true });

    const createdPhotos = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${randomUUID()}.${ext}`;
      const filepath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      const urlPath = `/uploads/properties/${id}/${filename}`;

      const photo = await prisma.photo.create({
        data: {
          url: urlPath,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          propertyId: id,
        },
      });

      createdPhotos.push(photo);
    }

    return NextResponse.json(createdPhotos, { status: 201 });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json(
      { error: 'Error al subir las fotos' },
      { status: 500 }
    );
  }
}
