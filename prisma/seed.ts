import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@propiedades.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@propiedades.com',
      password: adminPassword,
      role: 'admin',
    },
  })

  // Create editor user
  const editorPassword = await bcrypt.hash('editor123', 12)
  await prisma.user.upsert({
    where: { email: 'editor@propiedades.com' },
    update: {},
    create: {
      name: 'Editor',
      email: 'editor@propiedades.com',
      password: editorPassword,
      role: 'editor',
    },
  })

  // Create zones
  const zones = [
    { name: 'Puerto Vallarta', description: 'Propiedades en Puerto Vallarta' },
    { name: 'Coto Ciudad Granja', description: 'Propiedades en Coto Ciudad Granja' },
    { name: 'Bodegas Puerto Vallarta', description: 'Bodegas en Puerto Vallarta' },
  ]

  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { name: zone.name },
      update: {},
      create: zone,
    })
  }

  // Create default contract template
  await prisma.contractTemplate.create({
    data: {
      name: 'Contrato de Arrendamiento Estándar 2026',
      year: 2026,
      content: `CONTRATO DE ARRENDAMIENTO

Que celebran por una parte {{ARRENDADOR_NOMBRE}}, en lo sucesivo "EL ARRENDADOR", y por la otra {{ARRENDATARIO_NOMBRE}}, en lo sucesivo "EL ARRENDATARIO", al tenor de las siguientes:

DECLARACIONES Y CLÁUSULAS

PRIMERA.- EL ARRENDADOR da en arrendamiento a EL ARRENDATARIO el inmueble ubicado en {{PROPIEDAD_DIRECCION}}, identificado como {{PROPIEDAD_NOMBRE}} ({{PROPIEDAD_NUMERO}}), con una superficie de {{PROPIEDAD_M2}} m².

SEGUNDA.- El plazo del presente contrato es de {{CONTRATO_DURACION}} meses, iniciando el {{CONTRATO_FECHA_INICIO}} y terminando el {{CONTRATO_FECHA_FIN}}.

TERCERA.- La renta mensual pactada es de \${{CONTRATO_RENTA_MENSUAL}} ({{CONTRATO_RENTA_LETRA}} pesos 00/100 M.N.), que EL ARRENDATARIO se obliga a pagar por adelantado dentro de los primeros 5 días de cada mes.

CUARTA.- EL ARRENDATARIO entrega en este acto la cantidad de \${{CONTRATO_DEPOSITO}} como depósito de garantía.

QUINTA.- En caso de contratos multianuales, la renta se revisará en la fecha {{CONTRATO_FECHA_REVISION}} con un incremento del {{CONTRATO_INCREMENTO}}% anual.

SEXTA.- EL ARRENDATARIO se obliga a usar el inmueble exclusivamente para {{PROPIEDAD_USO}}.

SÉPTIMA.- Los gastos de mantenimiento menores correrán por cuenta de EL ARRENDATARIO.

Leído que fue el presente contrato, ambas partes lo firman de conformidad.

EL ARRENDADOR                          EL ARRENDATARIO
{{ARRENDADOR_NOMBRE}}                  {{ARRENDATARIO_NOMBRE}}

Fecha: {{FECHA_FIRMA}}
Lugar: {{LUGAR_FIRMA}}`,
    },
  })

  console.log('Seed completado exitosamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
