import { db, client } from './index';
import { users, accounts } from './schema';
import crypto from 'crypto';

const SEED_EMAIL = 'demo@tradelab.app';
const SEED_PASSWORD = 'DemoUser2026!';

function hashPassword(password: string): string {
  // Simple SHA-256 for demo purposes, since bcrypt requires native compilation
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seed() {
  console.log('Seeding database...');
  
  const userId = crypto.randomUUID();
  
  try {
    await db.insert(users).values({
      id: userId,
      email: SEED_EMAIL,
      passwordHash: hashPassword(SEED_PASSWORD),
    }).onConflictDoNothing();
    
    // We need to fetch the ID in case it already existed
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, SEED_EMAIL),
    });

    if (user) {
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        userId: user.id,
        balance: 1_000_000,
        equity: 1_000_000,
      }).onConflictDoNothing();
    }
    
    console.log(`Successfully seeded user: ${SEED_EMAIL}`);
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    client.close();
  }
}

seed();
