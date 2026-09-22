import { PrismaClient, DeliveryStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const dispatcher = await prisma.user.upsert({
    where: { email: "dispatcher@delivery.app" },
    update: {},
    create: {
      name: "Diana Dispatcher",
      email: "dispatcher@delivery.app",
      passwordHash: password,
      role: Role.DISPATCHER,
      phone: "+380000000001",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@delivery.app" },
    update: {},
    create: {
      name: "Clara Client",
      email: "client@delivery.app",
      passwordHash: password,
      role: Role.CLIENT,
      phone: "+380000000002",
    },
  });

  const courier = await prisma.user.upsert({
    where: { email: "courier@delivery.app" },
    update: {},
    create: {
      name: "Carl Courier",
      email: "courier@delivery.app",
      passwordHash: password,
      role: Role.COURIER,
      phone: "+380000000003",
    },
  });

  // Kyiv-ish coordinates.
  const pickup = await prisma.address.create({
    data: {
      ownerId: client.id,
      label: "Warehouse",
      street: "Khreshchatyk St, 1",
      city: "Kyiv",
      lat: 50.4501,
      lng: 30.5234,
    },
  });

  const dropoff = await prisma.address.create({
    data: {
      ownerId: client.id,
      label: "Home",
      street: "Peremohy Ave, 37",
      city: "Kyiv",
      lat: 50.4547,
      lng: 30.4467,
    },
  });

  const delivery = await prisma.delivery.create({
    data: {
      clientId: client.id,
      pickupAddressId: pickup.id,
      dropoffAddressId: dropoff.id,
      description: "Small parcel, handle with care",
      weightKg: 2.5,
      packageSize: "S",
      status: DeliveryStatus.CREATED,
    },
  });

  await prisma.statusHistory.create({
    data: {
      deliveryId: delivery.id,
      status: DeliveryStatus.CREATED,
      changedById: client.id,
      note: "Seed data",
    },
  });

  await prisma.courierLocation.create({
    data: { courierId: courier.id, lat: 50.449, lng: 30.52, speedKmh: 0 },
  });

  console.log("Seeded demo accounts (password: password123):");
  console.log(`  dispatcher: ${dispatcher.email}`);
  console.log(`  client:     ${client.email}`);
  console.log(`  courier:    ${courier.email}`);
  console.log(`Seed delivery: ${delivery.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
