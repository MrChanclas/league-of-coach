// Prints the scrypt hash to store as ADMIN_PASSWORD_HASH. Reads the password
// from stdin so it never lands in shell history or the process list:
//
//   pnpm admin:hash-password            (then type the password, Enter)
//   ... | pnpm --silent run admin:hash-password | gcloud secrets versions add \
//         loc-admin-password-hash --data-file=-
import { createInterface } from 'node:readline';
import { hashAdminPassword } from '../src/admin/admin-credentials';

const MIN_LENGTH = 8;

const input = createInterface({ input: process.stdin });
input.once('line', (password) => {
  input.close();
  if (password.length < MIN_LENGTH) {
    console.error(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    process.exit(1);
  }
  process.stdout.write(hashAdminPassword(password));
});
