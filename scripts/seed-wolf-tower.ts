import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // Crear zona Wolf Tower
  const zone = await prisma.zone.upsert({
    where: { name: 'Wolf Tower' },
    update: {},
    create: {
      name: 'Wolf Tower',
      description: 'Torre Wolf - Departamentos de prueba',
    },
  })

  console.log('Zona Wolf Tower creada:', zone.id)

  // Crear propiedad PRUEBA
  const property = await prisma.property.upsert({
    where: { number: 'WT-PRUEBA' },
    update: {},
    create: {
      number: 'WT-PRUEBA',
      name: 'PRUEBA',
      squareMeters: 80,
      propertyType: 'departamento',
      status: 'rented',
      address: 'Wolf Tower, Piso 1, Depto PRUEBA',
      description: 'Departamento de prueba para verificar sistema de alertas por correo',
      monthlyRent: 15000,
      zoneId: zone.id,
    },
  })

  console.log('Propiedad PRUEBA creada:', property.id)

  // Contrato con vencimiento a 7 dias desde hoy
  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - 11) // inicio hace 11 meses

  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 7) // vence en 7 dias

  const renewalToken = crypto.randomBytes(32).toString('hex')

  // Eliminar contratos previos de prueba para esta propiedad
  await prisma.alert.deleteMany({
    where: {
      contract: {
        propertyId: property.id,
      },
    },
  })
  await prisma.contract.deleteMany({
    where: { propertyId: property.id },
  })

  const contract = await prisma.contract.create({
    data: {
      propertyId: property.id,
      tenantName: 'Inquilino de Prueba',
      tenantEmail: 'diego@lirakorp.com', // CAMBIAR al email real del inquilino para probar
      tenantPhone: '+521234567890',
      tenantWhatsapp: '+521234567890',
      startDate,
      endDate,
      monthlyRent: 15000,
      depositAmount: 30000,
      contractType: 'arrendamiento',
      status: 'active',
      propertyUse: 'CASA HABITACION',
      renewalToken,
    },
  })

  console.log('Contrato creado:', contract.id)
  console.log('Fecha inicio:', startDate.toLocaleDateString('es-MX'))
  console.log('Fecha vencimiento:', endDate.toLocaleDateString('es-MX'))
  console.log('Token de renovacion:', renewalToken)
  console.log('')
  console.log('URL de decision del inquilino:')
  console.log(`http://localhost:3000/renewal/${renewalToken}`)
  console.log('')
  console.log('Seed de Wolf Tower completado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
