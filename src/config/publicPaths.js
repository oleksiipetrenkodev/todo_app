const PUBLIC_PATH = ['/login', '/register', '/health'];

export function isPublicPath(path) {
  return PUBLIC_PATH.includes(path);
}
