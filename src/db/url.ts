// pg already treats these modes as verify-full; spelling it out silences its deprecation warning.
export function databaseUrl() {
  const url = process.env.POSTGRESQL_URL;
  return url?.replace(/([?&]sslmode=)(prefer|require|verify-ca)\b/, "$1verify-full");
}
